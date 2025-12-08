import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'contracts.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'employee', -- 'admin' or 'employee'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Contracts Table
    db.run(`CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      partner_name TEXT,
      category TEXT,
      start_date TEXT,
      end_date TEXT,
      notice_period_days INTEGER DEFAULT 0,
      auto_renewal INTEGER DEFAULT 0,
      cost_amount REAL,
      cost_currency TEXT,
      responsible_person TEXT,
      responsible_email TEXT,
      external_system_link TEXT,
      status TEXT DEFAULT 'active',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`);

    // 3. Alerts Table
    db.run(`CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER,
      alert_type TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(contract_id) REFERENCES contracts(id)
    )`);

    // 4. Attachments Table
    db.run(`CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER,
      filename TEXT,
      original_name TEXT,
      mime_type TEXT,
      size INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    )`);

    // 5. Audit Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER,
      user_id INTEGER,
      user_name TEXT,
      action TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // --- Performance Indices ---
    db.run("CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)");
    db.run("CREATE INDEX IF NOT EXISTS idx_contracts_partner ON contracts(partner_name)");
    db.run("CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date)");

    // --- FORCE ENSURE ADMIN USER ---
    // Use INSERT INTO ... ON CONFLICT to update password without changing ID
    const adminEmail = 'admin@local.com';
    const adminPass = 'admin123';
    const adminHash = bcrypt.hashSync(adminPass, 10);

    db.run(`
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET 
        password = excluded.password,
        role = excluded.role,
        name = excluded.name
    `, ['Administrator', adminEmail, adminHash, 'admin'], (err) => {
        if (err) console.error("Error ensuring admin user:", err.message);
        else console.log(`[Init] Admin Access: ${adminEmail} (password updated)`);
    });
  });
}

export default db;