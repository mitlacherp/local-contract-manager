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

// --- CONFIGURATION ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;
const HOST = '0.0.0.0';
const JWT_SECRET = 'local-secret-key-change-this-in-production';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure storage
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Middleware Setup
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR)); // Static file serving

// Multer Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

// --- AUTH MIDDLEWARE ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Access token required" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token" });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: "Admin privileges required" });
    next();
};

// --- HELPER FUNCTIONS ---

const logAudit = (contractId, userId, userName, action, details) => {
    const sql = "INSERT INTO audit_logs (contract_id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)";
    db.run(sql, [contractId, userId, userName, action, details], (err) => {
        if (err) console.error("Audit Log Error:", err);
    });
};

// --- ROUTES: AUTH ---

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    db.get("SELECT * FROM users WHERE lower(email) = ?", [normalizedEmail], async (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, email: user.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ 
            token, 
            user: { id: user.id, name: user.name, role: user.role, email: user.email } 
        });
    });
});

app.post('/auth/forgot-password', (req, res) => {
    // Local environment placeholder
    console.log(`[Password Reset] Request for: ${req.body.email}`);
    res.json({ message: "If account exists, reset instructions have been logged to server console." });
});

// --- ROUTES: USERS (Admin) ---

app.get('/users', authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT id, name, email, role, created_at FROM users ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/users', authenticateToken, isAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
            [name, email, hash, role], 
            function(err) {
                if (err) return res.status(400).json({ error: "Email probably exists or invalid data" });
                res.json({ id: this.lastID, message: "User created successfully" });
            }
        );
    } catch (e) {
        res.status(500).json({ error: "Server error during user creation" });
    }
});

// --- ROUTES: SETTINGS ---

app.get('/settings', authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT * FROM settings", [], (err, rows) => {
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/settings', authenticateToken, isAdmin, (req, res) => {
    const { key, value } = req.body;
    db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", 
        [key, value], 
        (err) => res.json({ success: true })
    );
});

// --- ROUTES: CONTRACTS (Main Feature) ---

app.get('/contracts', authenticateToken, (req, res) => {
    const { search, sort, order } = req.query;
    let sql = "SELECT * FROM contracts WHERE 1=1";
    let params = [];

    // Authorization Filter
    if (req.user.role !== 'admin') {
        sql += " AND created_by = ?";
        params.push(req.user.id);
    }

    // Search Logic (Full text search simulation)
    if (search) {
        const term = `%${search}%`;
        sql += " AND (title LIKE ? OR partner_name LIKE ? OR responsible_person LIKE ?)";
        params.push(term, term, term);
    }

    // Sorting Logic
    const validSorts = ['cost_amount', 'end_date', 'title', 'partner_name', 'created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    
    sql += ` ORDER BY ${sortCol} ${sortOrder}`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/contracts/export/csv', authenticateToken, (req, res) => {
    // Generate CSV for download
    let sql = "SELECT * FROM contracts";
    let params = [];
    if (req.user.role !== 'admin') {
        sql += " WHERE created_by = ?";
        params.push(req.user.id);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).send("Database error");

        // CSV Header
        let csv = "ID,Title,Partner,Category,StartDate,EndDate,Cost,Currency,Status,Responsible\n";
        
        // CSV Rows
        rows.forEach(row => {
            const line = [
                row.id,
                `"${row.title.replace(/"/g, '""')}"`,
                `"${row.partner_name?.replace(/"/g, '""') || ''}"`,
                row.category,
                row.start_date,
                row.end_date,
                row.cost_amount,
                row.cost_currency,
                row.status,
                row.responsible_person
            ].join(",");
            csv += line + "\n";
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('contracts_export.csv');
        res.send(csv);
    });
});

app.get('/contracts/:id', authenticateToken, (req, res) => {
    const sql = req.user.role === 'admin' 
        ? "SELECT * FROM contracts WHERE id = ?"
        : "SELECT * FROM contracts WHERE id = ? AND created_by = ?";
    
    const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

    db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Contract not found or access denied" });
        res.json(row);
    });
});

app.post('/contracts', authenticateToken, (req, res) => {
    const { title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status } = req.body;
    
    if (!title || !partner_name) return res.status(400).json({ error: "Title and Partner Name are required." });

    const sql = `INSERT INTO contracts (title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status || 'active', req.user.id];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAudit(this.lastID, req.user.id, req.user.name, 'CREATE', `Created contract "${title}"`);
        res.json({ id: this.lastID, message: "Contract created successfully" });
    });
});

app.put('/contracts/:id', authenticateToken, (req, res) => {
    // Check permission
    const checkSql = req.user.role === 'admin' ? "SELECT id FROM contracts WHERE id = ?" : "SELECT id FROM contracts WHERE id = ? AND created_by = ?";
    const checkParams = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

    db.get(checkSql, checkParams, (err, row) => {
        if (!row) return res.status(403).json({ error: "Not authorized to update this contract" });

        const { title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status } = req.body;
        
        const updateSql = `UPDATE contracts SET title=?, partner_name=?, category=?, start_date=?, end_date=?, notice_period_days=?, auto_renewal=?, cost_amount=?, cost_currency=?, responsible_person=?, responsible_email=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
        const params = [title, partner_name, category, start_date, end_date, notice_period_days, auto_renewal, cost_amount, cost_currency, responsible_person, responsible_email, status, req.params.id];

        db.run(updateSql, params, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.params.id, req.user.id, req.user.name, 'UPDATE', `Updated contract details`);
            res.json({ message: "Contract updated successfully" });
        });
    });
});

app.delete('/contracts/:id', authenticateToken, (req, res) => {
    const checkSql = req.user.role === 'admin' ? "SELECT id FROM contracts WHERE id = ?" : "SELECT id FROM contracts WHERE id = ? AND created_by = ?";
    const checkParams = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];

    db.get(checkSql, checkParams, (err, row) => {
        if (!row) return res.status(403).json({ error: "Not authorized" });

        db.serialize(() => {
            db.run("DELETE FROM alerts WHERE contract_id = ?", [req.params.id]);
            db.run("DELETE FROM attachments WHERE contract_id = ?", [req.params.id]);
            db.run("DELETE FROM audit_logs WHERE contract_id = ?", [req.params.id]);
            db.run("DELETE FROM contracts WHERE id = ?", [req.params.id], (err) => {
                if (err) return res.status(500).json({error: err.message});
                res.json({ message: "Contract deleted" });
            });
        });
    });
});

// --- AI & FILE ROUTES ---

app.post('/contracts/extract', authenticateToken, upload.single('file'), async (req, res) => {
    let textToAnalyze = req.body.text || "";

    // Step 1: Extract text from file if present
    if (req.file) {
        try {
            const extractedText = await extractTextFromFile(req.file);
            textToAnalyze = extractedText;
            fs.unlink(req.file.path, () => {}); // Cleanup temp file
        } catch (e) {
            return res.status(500).json({ success: false, error: "File parsing failed: " + e.message });
        }
    }

    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
        return res.status(400).json({ success: false, error: "No text or readable file provided." });
    }

    // Step 2: Call Ollama
    try {
        db.get("SELECT value FROM settings WHERE key = 'ai_model'", async (err, row) => {
            const modelName = row ? row.value : 'llama3';
            const result = await extractContractData(textToAnalyze, modelName);
            
            if (result.success) {
                res.json(result.data);
            } else {
                res.status(500).json(result); // Return error object with details
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server AI handler error" });
    }
});

app.post('/contracts/:id/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    db.run("INSERT INTO attachments (contract_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req.params.id, req.user.id, req.user.name, 'UPLOAD', `Uploaded ${req.file.originalname}`);
            res.json({ message: "File uploaded successfully" });
        }
    );
});

app.get('/contracts/:id/attachments', authenticateToken, (req, res) => {
    db.all("SELECT * FROM attachments WHERE contract_id = ?", [req.params.id], (err, rows) => res.json(rows));
});

app.get('/attachments/download/:filename', authenticateToken, (req, res) => {
    const filename = path.basename(req.params.filename); // Security sanitization
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found");
    }
});

app.get('/contracts/:id/audit', authenticateToken, (req, res) => {
    db.all("SELECT * FROM audit_logs WHERE contract_id = ? ORDER BY timestamp DESC", [req.params.id], (err, rows) => res.json(rows));
});

// --- DASHBOARD & ALERTS ---

app.get('/alerts', authenticateToken, (req, res) => {
    let sql = `SELECT a.*, c.title as contract_title FROM alerts a JOIN contracts c ON a.contract_id = c.id`;
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
    db.run("UPDATE alerts SET is_read = 1 WHERE id = ?", [req.params.id], (err) => res.json({ success: true }));
});

app.get('/dashboard/stats', authenticateToken, (req, res) => {
    const where = req.user.role === 'admin' ? "" : `WHERE created_by = ${req.user.id}`;
    
    db.all(`SELECT * FROM contracts ${where}`, [], (err, contracts) => {
        if (err) return res.status(500).json({error: "Database error"});
        
        const now = new Date();
        const stats = {
            totalContracts: contracts.length,
            activeContracts: 0,
            expiringSoon: 0,
            unreadAlerts: 0,
            monthlyCost: 0
        };

        const warningThreshold = new Date();
        warningThreshold.setDate(now.getDate() + 90); // 90 Days warning

        contracts.forEach(c => {
            if (c.status === 'active') {
                stats.activeContracts++;
                stats.monthlyCost += c.cost_amount || 0;
                
                if (c.end_date) {
                    const end = new Date(c.end_date);
                    if (end > now && end <= warningThreshold) {
                        stats.expiringSoon++;
                    }
                }
            }
        });

        // Get alerts count
        const alertSql = req.user.role === 'admin' 
            ? "SELECT COUNT(*) as count FROM alerts WHERE is_read = 0"
            : `SELECT COUNT(*) as count FROM alerts a JOIN contracts c ON a.contract_id = c.id WHERE a.is_read = 0 AND c.created_by = ${req.user.id}`;
            
        db.get(alertSql, [], (err, row) => {
             stats.unreadAlerts = row ? row.count : 0;
             res.json(stats);
        });
    });
});

// --- CRON JOBS (08:00 AM) ---
// Checks for contracts expiring within 90 days and Notice Periods
cron.schedule('0 8 * * *', () => {
    console.log("[Cron] Running daily contract check...");
    db.all("SELECT * FROM contracts WHERE status = 'active'", [], (err, rows) => {
        if (err) return;
        const now = new Date();
        
        // 90 Day Expiry Warning
        const expiryThreshold = new Date();
        expiryThreshold.setDate(now.getDate() + 90);

        rows.forEach(c => {
            if (!c.end_date) return;
            const endDate = new Date(c.end_date);

            // 1. Expiry Check
            if (endDate > now && endDate <= expiryThreshold) {
                 db.get("SELECT id FROM alerts WHERE contract_id = ? AND alert_type = 'expiry' AND is_read = 0", [c.id], (err, row) => {
                     if (!row) {
                         const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                         const msg = `Contract "${c.title}" expires in ${daysLeft} days (${c.end_date}).`;
                         db.run("INSERT INTO alerts (contract_id, alert_type, message) VALUES (?,?,?)", [c.id, 'expiry', msg]);
                         console.log(`[Alert] Generated expiry alert for ${c.id}`);
                     }
                 });
            }

            // 2. Notice Period Check
            // If endDate - notice_period is approaching
            if (c.notice_period_days > 0) {
                const noticeDate = new Date(endDate);
                noticeDate.setDate(endDate.getDate() - c.notice_period_days);
                
                // Warn 14 days before notice date
                const noticeWarningStart = new Date(noticeDate);
                noticeWarningStart.setDate(noticeDate.getDate() - 14);

                if (now >= noticeWarningStart && now < noticeDate) {
                     db.get("SELECT id FROM alerts WHERE contract_id = ? AND alert_type = 'notice' AND is_read = 0", [c.id], (err, row) => {
                         if (!row) {
                             db.run("INSERT INTO alerts (contract_id, alert_type, message) VALUES (?,?,?)", 
                                [c.id, 'notice', `Action Required: Notice period for "${c.title}" deadline is ${noticeDate.toISOString().split('T')[0]}`]);
                         }
                     });
                }
            }
        });
    });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: Node ${process.version}`);
});