import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

let _dirname: string;
try {
  _dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  _dirname = __dirname;
}

const DB_FILE = path.join(process.cwd(), 'database.sqlite');
const DATA_FILE = path.join(process.cwd(), 'calls_data.json');

// Initialize SQLite database
let db: Database.Database;

try {
  console.log('Initializing SQLite database at', DB_FILE);
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY,
      date TEXT,
      time TEXT,
      phone TEXT,
      customer_name TEXT,
      region TEXT,
      receiver TEXT,
      source TEXT,
      test_type TEXT,
      exchange_content TEXT,
      processing_status TEXT,
      result TEXT,
      list_price REAL,
      extra_fee_discount REAL,
      final_revenue REAL,
      notes TEXT,
      status_updated_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Migration: Add status_updated_at if not exists
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN status_updated_at TEXT`);
    console.log('Added status_updated_at column.');
  } catch (e) {
    // Column likely exists
  }
  
  console.log('SQLite initialized successfully.');
} catch (err) {
  console.error('Failed to initialize SQLite:', err);
  // Fallback to in-memory if disk is not writable
  console.log('Falling back to in-memory SQLite');
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY,
      date TEXT,
      time TEXT,
      phone TEXT,
      customer_name TEXT,
      region TEXT,
      receiver TEXT,
      source TEXT,
      test_type TEXT,
      exchange_content TEXT,
      processing_status TEXT,
      result TEXT,
      list_price REAL,
      extra_fee_discount REAL,
      final_revenue REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Migration from JSON to SQLite
function migrateData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Migrating ${data.length} records to SQLite...`);
        const insert = db.prepare(`
          INSERT OR IGNORE INTO calls (
            id, date, time, phone, customer_name, region, receiver, 
            source, test_type, exchange_content, processing_status, 
            result, list_price, extra_fee_discount, final_revenue, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((records) => {
          for (const r of records) {
            const list_price = Number(r.list_price) || 0;
            const extra_fee_discount = Number(r.extra_fee_discount) || 0;
            const final_revenue = r.final_revenue !== undefined ? Number(r.final_revenue) : (list_price + extra_fee_discount);
            
            insert.run(
              r.id || Date.now() + Math.random(),
              r.date || '',
              r.time || '',
              r.phone || '',
              r.customer_name || '',
              r.region || '',
              r.receiver || '',
              r.source || '',
              r.test_type || '',
              r.exchange_content || '',
              r.processing_status || '',
              r.result || '',
              list_price,
              extra_fee_discount,
              final_revenue,
              r.notes || ''
            );
          }
        });

        transaction(data);
        console.log('Migration complete.');
        fs.renameSync(DATA_FILE, DATA_FILE + '.bak');
      }
    } catch (e) {
      console.error('Migration error:', e);
    }
  }
}

migrateData();

function getAllLocalCalls() {
  try {
    return db.prepare('SELECT * FROM calls ORDER BY date DESC, time DESC').all();
  } catch (e) {
    console.error('Error fetching calls:', e);
    return [];
  }
}

function insertCall(c: any) {
  const list_price = Number(c.list_price) || 0;
  const extra_fee_discount = Number(c.extra_fee_discount) || 0;
  const final_revenue = list_price + extra_fee_discount;
  const status_updated_at = c.status_updated_at || new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO calls (
      id, date, time, phone, customer_name, region, receiver, 
      source, test_type, exchange_content, processing_status, 
      result, list_price, extra_fee_discount, final_revenue, notes,
      status_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    c.id, c.date, c.time, c.phone, c.customer_name, c.region, c.receiver,
    c.source, c.test_type, c.exchange_content, c.processing_status,
    c.result, list_price, extra_fee_discount, final_revenue, c.notes,
    status_updated_at
  );
}

function updateCall(id: number, updates: any) {
  // If list_price or extra_fee_discount is updated, recalculate final_revenue
  if (updates.list_price !== undefined || updates.extra_fee_discount !== undefined) {
    // Need current values if one is missing in updates
    const current = db.prepare('SELECT list_price, extra_fee_discount FROM calls WHERE id = ?').get(id) as any;
    if (current) {
      const lp = updates.list_price !== undefined ? Number(updates.list_price) : current.list_price;
      const efd = updates.extra_fee_discount !== undefined ? Number(updates.extra_fee_discount) : current.extra_fee_discount;
      updates.final_revenue = lp + efd;
      updates.list_price = lp;
      updates.extra_fee_discount = efd;
    }
  }

  // If status is updated, track the time
  if (updates.processing_status !== undefined) {
    updates.status_updated_at = new Date().toISOString();
  }

  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'fromSheets');
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  values.push(id);

  const stmt = db.prepare(`UPDATE calls SET ${setClause} WHERE id = ?`);
  return stmt.run(...values);
}

function deleteCall(id: number) {
  return db.prepare('DELETE FROM calls WHERE id = ?').run(id);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Listen first to clear the loading screen hang
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is responding on port ${PORT}`);
  });

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // API Routes
  app.get('/api/calls', async (req, res) => {
    try {
      const dbCalls = getAllLocalCalls();
      res.json({ data: dbCalls });
    } catch (e) {
      console.error('GET calls error:', e);
      res.status(500).json({ error: 'Lỗi hệ thống' });
    }
  });

  app.post('/api/calls', (req, res) => {
    try {
      const body = req.body;
      
      const duplicate = db.prepare(`
        SELECT id FROM calls 
        WHERE phone = ? AND date = ? AND time = ? 
        AND (id > ?)
      `).get(body.phone, body.date, body.time, Date.now() - 5000);

      if (duplicate) {
        return res.status(200).json({ status: 'duplicate_prevented' });
      }

      const newCall = { ...body, id: Date.now() };
      insertCall(newCall);
      
      res.status(201).json(newCall);
    } catch (error) {
      console.error('POST Error:', error);
      res.status(500).json({ error: 'Failed to save' });
    }
  });

  app.patch('/api/calls/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const idNum = Number(id);
      
      updateCall(idNum, updates);
      res.json({ id: idNum, ...updates });
    } catch (error) {
      console.error('PATCH Error:', error);
      res.status(500).json({ error: 'Failed to update' });
    }
  });

  app.delete('/api/calls/:id', (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);
      
      deleteCall(idNum);
      res.status(204).send();
    } catch (error) {
      console.error('DELETE Error:', error);
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  // Vite Integration after routes
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = _dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

startServer().catch(err => {
  console.error('Server Boot Error:', err);
  process.exit(1);
});
