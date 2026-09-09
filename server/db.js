const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'crm.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisified query helper functions
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize tables
const initDb = async () => {
  // Leads table
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      company TEXT,
      city TEXT,
      source TEXT DEFAULT 'Manual Entry',
      status TEXT DEFAULT 'New',
      priority TEXT DEFAULT 'Medium',
      deal_value REAL DEFAULT 0,
      assigned_to TEXT DEFAULT 'Unassigned',
      tags TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      next_followup_date TEXT,
      next_followup_time TEXT,
      custom_fields TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Activities & Call Logs Timeline
  await run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'call', 'note', 'status_change', 'whatsapp', 'email', 'meeting'
      title TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    )
  `);

  // Follow-ups table
  await run(`
    CREATE TABLE IF NOT EXISTS followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      due_date TEXT NOT NULL, -- YYYY-MM-DD
      due_time TEXT DEFAULT '10:00',
      note TEXT,
      priority TEXT DEFAULT 'Medium',
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    )
  `);

  // Settings & Templates
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed default settings if empty
  const defaultTemplates = JSON.stringify([
    {
      id: '1',
      title: 'Introduction & Welcome',
      message: 'नमस्ते {name} जी! हमने आपकी इन्क्वायरी प्राप्त की है। क्या हम आपकी आवश्यकता के बारे में कुछ मिनट बात कर सकते हैं?'
    },
    {
      id: '2',
      title: 'Follow-up Call Reminder',
      message: 'Hello {name}, hope you are doing well! Following up on our previous discussion regarding your requirements. Let us know a good time to connect.'
    },
    {
      id: '3',
      title: 'Proposal Sent',
      message: 'Dear {name}, we have sent the detailed proposal to your email ({email}). Please review it and feel free to ask any questions.'
    },
    {
      id: '4',
      title: 'Special Offer / Discount',
      message: 'Hi {name}! We currently have an exclusive special offer on our services for this week. Would you be interested in a quick demo?'
    }
  ]);

  const existingSettings = await get(`SELECT key FROM settings WHERE key = 'whatsapp_templates'`);
  if (!existingSettings) {
    await run(`INSERT INTO settings (key, value) VALUES ('whatsapp_templates', ?)`, [defaultTemplates]);
  }

  // Seed sample leads if database is new
  const leadCount = await get(`SELECT COUNT(*) as count FROM leads`);
  if (leadCount && leadCount.count === 0) {
    console.log('Seeding initial demo leads...');
    const sampleLeads = [
      {
        name: 'Rahul Sharma',
        phone: '+91 98765 43210',
        email: 'rahul.sharma@example.com',
        company: 'Sharma Infotech',
        city: 'Delhi',
        source: 'Website Form',
        status: 'In Progress',
        priority: 'High',
        deal_value: 45000,
        assigned_to: 'Amit Kumar',
        tags: 'VIP, Software, Hot',
        notes: 'Requested a demo for CRM integration. Very keen on automated follow-ups.',
        next_followup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        next_followup_time: '14:30'
      },
      {
        name: 'Priya Patel',
        phone: '+91 98234 56789',
        email: 'priya.patel@gujaratsteel.in',
        company: 'Gujarat Steel Corp',
        city: 'Ahmedabad',
        source: 'Google Ads',
        status: 'Proposal Sent',
        priority: 'Urgent',
        deal_value: 120000,
        assigned_to: 'Sneha Roy',
        tags: 'Enterprise, Proposal',
        notes: 'Sent enterprise quotation. Follow up on price negotiation this Friday.',
        next_followup_date: new Date().toISOString().split('T')[0],
        next_followup_time: '11:00'
      },
      {
        name: 'Vikram Singh',
        phone: '+91 97112 34567',
        email: 'vikram@singhlogistics.com',
        company: 'Singh Logistics & Freight',
        city: 'Jaipur',
        source: 'Referral',
        status: 'Won',
        priority: 'High',
        deal_value: 85000,
        assigned_to: 'Amit Kumar',
        tags: 'Converted, Annual Contract',
        notes: 'Deal closed! Advance payment received. Onboarding starting next Monday.',
        next_followup_date: null,
        next_followup_time: null
      },
      {
        name: 'Ananya Deshmukh',
        phone: '+91 98901 23456',
        email: 'ananya@punesolutions.org',
        company: 'Pune EduTech Solutions',
        city: 'Pune',
        source: 'Facebook Ads',
        status: 'New',
        priority: 'Medium',
        deal_value: 28000,
        assigned_to: 'Sneha Roy',
        tags: 'Inquiry, Demo',
        notes: 'Interested in replacing their messy Google spreadsheet workflow.',
        next_followup_date: new Date().toISOString().split('T')[0],
        next_followup_time: '16:00'
      },
      {
        name: 'Mohit Verma',
        phone: '+91 99887 76655',
        email: 'mohit@vermatraders.co.in',
        company: 'Verma Wholesale Traders',
        city: 'Indore',
        source: 'Cold Call',
        status: 'Contacted',
        priority: 'Low',
        deal_value: 15000,
        assigned_to: 'Unassigned',
        tags: 'Follow-up Required',
        notes: 'Spoke briefly. Requested callback next week after inventory audit.',
        next_followup_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        next_followup_time: '12:00'
      }
    ];

    for (const l of sampleLeads) {
      const res = await run(
        `INSERT INTO leads (name, phone, email, company, city, source, status, priority, deal_value, assigned_to, tags, notes, next_followup_date, next_followup_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [l.name, l.phone, l.email, l.company, l.city, l.source, l.status, l.priority, l.deal_value, l.assigned_to, l.tags, l.notes, l.next_followup_date, l.next_followup_time]
      );
      
      await run(`INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'note', 'Lead Created', 'Lead registered in CRM system')`, [res.id]);

      if (l.next_followup_date) {
        await run(
          `INSERT INTO followups (lead_id, due_date, due_time, note, priority) VALUES (?, ?, ?, ?, ?)`,
          [res.id, l.next_followup_date, l.next_followup_time, 'Follow-up with client regarding requirements', l.priority]
        );
      }
    }
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
