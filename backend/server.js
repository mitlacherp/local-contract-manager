import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import db from './database.js';
import { extractContractData, extractTextFromFile } from './services/ollamaService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0';
const JWT_SECRET = 'local-secret-key-change-this'; 

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir)); // Serve files statically (authenticated check done below in reality, but simple for local)

// --- MIDDLEWARE ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    next();
};

const logAudit = (contractId, userId, userName, action, details) => {
    db.run("INSERT INTO audit_logs (contract_id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [contractId, userId, userName, action, details]);
};

// --- AUTH ROUTES ---

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email ? email.toLowerCase() : '';
    console.log(`[Auth] Login attempt for: ${normalizedEmail}`);

    db.get("SELECT * FROM users WHERE lower(email) = ?", [normalizedEmail], async (err, user) => {
        if (err) {
            console.error("[Auth] DB Error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (!user) {
            console.log("[Auth] User not found");
            return res.status(400).json({ error: "User not found" });
        }
        
        if (await bcrypt.compare(password, user.password)) {
            console.log("[Auth] Password match. Login successful.");
            const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
            res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
        } else {
            console.log("[Auth] Password mismatch.");
            res.status(403).json({ error: "Invalid password" });
        }
    });
});

app.post('/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    // Mock functionality
    console.log(`[Mock Email Service] Sending password reset link to ${email}`);
    res.json({ message: "If the email exists, a reset link has been sent." });
});

// --- USER ROUTES (Admin) ---

app.get('/users', authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT id, name, email, role, created_at FROM users", [], (err, rows) => {
        res.json(rows);
    });
});

app.post('/users', authenticateToken, isAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hash, role], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "User created" });
    });
});

// --- SETTINGS ROUTES (Admin) ---

app.get('/settings', authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT * FROM settings", [], (err, rows) => {
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/settings', authenticateToken, isAdmin, (req, res) => {
    const { key, value } = req.body;
    db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value], (err) => {
        res.json({ success: true });
    });
});

// --- CONTRACT ROUTES ---

app.get('/contracts', authenticateToken, (req, res) => {
    let sql = "SELECT * FROM contracts";
    let params = [];
    
    // Employees only see their own contracts
    if (req.user.role !== 'admin') {
        sql += " WHERE created_by = ?";
        params.push(req.user.id);
    }
    
    sql += " ORDER BY created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/contracts/:id', authenticateToken, (req, res) => {
    const sql = req.user.role === 'admin' 
        ? "SELECT * FROM contracts WHERE id = ?"
        : "SELECT * FROM contracts WHERE id = ? AND created_by = ?";
    
    const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

    db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Contract not found" });
        res.json(row);
    });
});

app.post('/contracts', authenticateToken, (req, res) => {
    const { title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status } = req.body;
    
    const sql = `INSERT INTO contracts (title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status || 'active', req.user.id];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(this.lastID, req.user.id, req.user.name, 'CREATE', `Created contract "${title}"`);
        res.json({ id: this.lastID, message: "Contract created" });
    });
});

app.put('/contracts/:id', authenticateToken, (req, res) => {
    // Basic permissions check done via SQL usually, simple check here
    const checkSql = req.user.role === 'admin' ? "SELECT id FROM contracts WHERE id = ?" : "SELECT id FROM contracts WHERE id = ? AND created_by = ?";
    const checkParams = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

    db.get(checkSql, checkParams, (err, row) => {
        if (!row) return res.status(403).json({ error: "Not authorized" });

        const { title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status } = req.body;
        
        const updateSql = `UPDATE contracts SET title=?, partner_name=?, category=?, start_date=?, end_date=?, notice_period_days=?, auto_renewal=?, cost_amount=?, cost_currency=?, responsible_person=?, responsible_email=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
        const params = [title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status, req.params.id];

        db.run(updateSql, params, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.params.id, req.user.id, req.user.name, 'UPDATE', `Updated contract details`);
            res.json({ message: "Updated" });
        });
    });
});

// --- ATTACHMENTS & LOGS ---

app.post('/contracts/:id/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    db.run("INSERT INTO attachments (contract_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.params.id, req.user.id, req.user.name, 'UPLOAD', `Uploaded file: ${req.file.originalname}`);
            res.json({ message: "File uploaded" });
        }
    );
});

app.get('/contracts/:id/attachments', authenticateToken, (req, res) => {
    db.all("SELECT * FROM attachments WHERE contract_id = ?", [req.params.id], (err, rows) => res.json(rows));
});

app.get('/contracts/:id/audit', authenticateToken, (req, res) => {
    db.all("SELECT * FROM audit_logs WHERE contract_id = ? ORDER BY timestamp DESC", [req.params.id], (err, rows) => res.json(rows));
});

app.get('/attachments/download/:filename', authenticateToken, (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    res.download(filePath);
});

// --- AI EXTRACTION (Updated) ---

app.post('/contracts/extract', authenticateToken, upload.single('file'), async (req, res) => {
  let text = req.body.text;

  // If file uploaded, parse it
  if (req.file) {
      try {
          text = await extractTextFromFile(req.file);
          // Clean up uploaded temp file for extraction
          fs.unlinkSync(req.file.path); 
      } catch (e) {
          return res.status(500).json({ error: "Failed to parse file: " + e.message });
      }
  }

  if (!text) return res.status(400).json({ error: "No text or file provided" });

  try {
    // Get custom model from settings
    db.get("SELECT value FROM settings WHERE key = 'ai_model'", async (err, row) => {
        const model = row ? row.value : 'llama3';
        const extractedData = await extractContractData(text, model);
        res.json(extractedData);
    });
  } catch (err) {
    res.status(500).json({ error: "AI extraction failed: " + err.message });
  }
});

// --- ALERTS & DASHBOARD ---

app.get('/alerts', authenticateToken, (req, res) => {
    // Join to check ownership
    let sql = `
        SELECT a.*, c.title as contract_title 
        FROM alerts a 
        JOIN contracts c ON a.contract_id = c.id
    `;
    let params = [];
    if (req.user.role !== 'admin') {
        sql += " WHERE c.created_by = ?";
        params.push(req.user.id);
    }
    sql += " ORDER BY a.created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/alerts/:id/read', authenticateToken, (req, res) => {
    db.run("UPDATE alerts SET is_read = 1 WHERE id = ?", [req.params.id], (err) => {
        res.json({ message: "Marked as read" });
    });
});

app.get('/dashboard/stats', authenticateToken, (req, res) => {
    // Only count visible contracts
    const where = req.user.role === 'admin' ? "" : `WHERE created_by = ${req.user.id}`;
    const stats = { totalContracts: 0, activeContracts: 0, expiringSoon: 0, unreadAlerts: 0, monthlyCost: 0 };
    
    db.all(`SELECT * FROM contracts ${where}`, [], (err, contracts) => {
        if (err) return res.status(500).json({error: err.message});
        
        stats.totalContracts = contracts.length;
        stats.activeContracts = contracts.filter(c => c.status === 'active').length;
        
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        contracts.forEach(c => {
            if (c.end_date) {
                const end = new Date(c.end_date);
                if (end > now && end <= thirtyDaysLater && c.status === 'active') {
                    stats.expiringSoon++;
                }
            }
            if (c.cost_amount && c.status === 'active') {
                stats.monthlyCost += c.cost_amount; 
            }
        });
        
        // Alerts count needs a join or subquery if we strictly filter, but for simple stats:
        // (Simplification: fetch all alerts and filter in memory or do complex query. Doing simple here)
        const alertSql = req.user.role === 'admin' 
            ? "SELECT COUNT(*) as count FROM alerts WHERE is_read = 0"
            : `SELECT COUNT(*) as count FROM alerts a JOIN contracts c ON a.contract_id = c.id WHERE a.is_read = 0 AND c.created_by = ${req.user.id}`;
            
        db.get(alertSql, [], (err, row) => {
             stats.unreadAlerts = row ? row.count : 0;
             res.json(stats);
        });
    });
});

// --- CRON ---
cron.schedule('0 8 * * *', () => {
    console.log("Running daily contract check...");
    const checkSql = "SELECT * FROM contracts WHERE status = 'active'";
    db.all(checkSql, [], (err, rows) => {
        if (err) return;
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        rows.forEach(c => {
            if (c.end_date) {
                const endDate = new Date(c.end_date);
                if (endDate > now && endDate <= thirtyDaysFromNow) {
                     // Check if alert exists
                     db.get("SELECT id FROM alerts WHERE contract_id = ? AND alert_type = 'expiry' AND is_read = 0", [c.id], (err, row) => {
                         if (!row) {
                             db.run("INSERT INTO alerts (contract_id, alert_type, message) VALUES (?,?,?)", [c.id, 'expiry', `Contract "${c.title}" expires on ${c.end_date}`]);
                         }
                     });
                }
            }
        });
    });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});