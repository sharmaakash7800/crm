const express = require('express');
const cors = require('cors');
const path = require('path');
const { run, get, all, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper: Sync lead event to configured Google Sheet Webhook URL
const syncToGoogleSheet = async (action, leadData) => {
  try {
    const row = await get(`SELECT value FROM settings WHERE key = 'google_sheet_url'`);
    if (!row || !row.value) return;
    let webhookUrl = '';
    try {
      webhookUrl = JSON.parse(row.value);
    } catch (e) {
      webhookUrl = row.value;
    }
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) return;

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        id: leadData.id,
        name: leadData.name,
        phone: leadData.phone || '',
        email: leadData.email || '',
        company: leadData.company || '',
        city: leadData.city || '',
        source: leadData.source || '',
        status: leadData.status || '',
        priority: leadData.priority || '',
        deal_value: leadData.deal_value || 0,
        assigned_to: leadData.assigned_to || '',
        tags: leadData.tags || '',
        notes: leadData.notes || '',
        next_followup_date: leadData.next_followup_date || '',
        created_at: leadData.created_at || ''
      })
    }).catch(err => {
      console.warn('Google Sheet sync background request error:', err.message);
    });
  } catch (err) {
    console.warn('Google Sheet sync error:', err.message);
  }
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// POST /api/test-google-sheet - Test webhook connection
app.post('/api/test-google-sheet', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'Valid URL is required' });
    }
    const testData = {
      action: 'test',
      timestamp: new Date().toISOString(),
      id: 999999,
      name: 'Test Lead (Connection Check)',
      phone: '9876543210',
      email: 'test@example.com',
      company: 'Test Company',
      city: 'Test City',
      source: 'Test Sync',
      status: 'New',
      priority: 'High',
      deal_value: 50000,
      assigned_to: 'Admin',
      tags: 'Test',
      notes: 'Testing Google Sheet connection from CRM',
      next_followup_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    res.json({ success: true, message: 'Test data sent to Google Sheet' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads - search, filter, paginate, sort
app.get('/api/leads', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      source = 'all',
      priority = 'all',
      assigned_to = 'all',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      page = 1,
      limit = 500
    } = req.query;

    let conditions = [];
    let params = [];

    if (search.trim()) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR company LIKE ? OR city LIKE ? OR tags LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (source && source !== 'all') {
      conditions.push('source = ?');
      params.push(source);
    }

    if (priority && priority !== 'all') {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (assigned_to && assigned_to !== 'all') {
      conditions.push('assigned_to = ?');
      params.push(assigned_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeSortBy = ['id', 'name', 'company', 'deal_value', 'created_at', 'updated_at', 'next_followup_date'].includes(sortBy)
      ? sortBy
      : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const leads = await all(
      `SELECT * FROM leads ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder}`,
      params
    );

    res.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/:id - Single lead details with activities & followups
app.get('/api/leads/:id', async (req, res) => {
  try {
    const lead = await get(`SELECT * FROM leads WHERE id = ?`, [req.params.id]);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const activities = await all(
      `SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );

    const followups = await all(
      `SELECT * FROM followups WHERE lead_id = ? ORDER BY due_date ASC, due_time ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      lead,
      activities,
      followups
    });
  } catch (err) {
    console.error('Error fetching lead details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads - Create new lead
app.post('/api/leads', async (req, res) => {
  try {
    const {
      name,
      phone = '',
      email = '',
      company = '',
      city = '',
      source = 'Manual Entry',
      status = 'New',
      priority = 'Medium',
      deal_value = 0,
      assigned_to = 'Unassigned',
      tags = '',
      notes = '',
      next_followup_date = null,
      next_followup_time = null,
      custom_fields = '{}'
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Lead Name is required' });
    }

    const result = await run(
      `INSERT INTO leads (name, phone, email, company, city, source, status, priority, deal_value, assigned_to, tags, notes, next_followup_date, next_followup_time, custom_fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        phone.trim(),
        email.trim(),
        company.trim(),
        city.trim(),
        source,
        status,
        priority,
        Number(deal_value) || 0,
        assigned_to,
        tags,
        notes,
        next_followup_date,
        next_followup_time,
        typeof custom_fields === 'object' ? JSON.stringify(custom_fields) : custom_fields
      ]
    );

    const leadId = result.id;

    // Record activity
    await run(
      `INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'note', 'Lead Created', 'Added to system with status: ' || ?)`,
      [leadId, status]
    );

    // If follow-up date provided, create followup item
    if (next_followup_date) {
      await run(
        `INSERT INTO followups (lead_id, due_date, due_time, note, priority) VALUES (?, ?, ?, ?, ?)`,
        [leadId, next_followup_date, next_followup_time || '10:00', notes || 'Initial scheduled follow-up', priority]
      );
    }

    const newLead = await get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    syncToGoogleSheet('create', newLead);

    res.status(201).json({
      success: true,
      lead: newLead
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leads/:id - Update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    const existing = await get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const {
      name = existing.name,
      phone = existing.phone,
      email = existing.email,
      company = existing.company,
      city = existing.city,
      source = existing.source,
      status = existing.status,
      priority = existing.priority,
      deal_value = existing.deal_value,
      assigned_to = existing.assigned_to,
      tags = existing.tags,
      notes = existing.notes,
      next_followup_date = existing.next_followup_date,
      next_followup_time = existing.next_followup_time,
      custom_fields = existing.custom_fields
    } = req.body;

    await run(
      `UPDATE leads SET
        name = ?, phone = ?, email = ?, company = ?, city = ?,
        source = ?, status = ?, priority = ?, deal_value = ?,
        assigned_to = ?, tags = ?, notes = ?, next_followup_date = ?,
        next_followup_time = ?, custom_fields = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        phone,
        email,
        company,
        city,
        source,
        status,
        priority,
        Number(deal_value) || 0,
        assigned_to,
        tags,
        notes,
        next_followup_date,
        next_followup_time,
        typeof custom_fields === 'object' ? JSON.stringify(custom_fields) : custom_fields,
        leadId
      ]
    );

    // If status changed, log activity
    if (status !== existing.status) {
      await run(
        `INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'status_change', 'Status Changed', 'Moved from ' || ? || ' to ' || ?)`,
        [leadId, existing.status, status]
      );
    }

    const updatedLead = await get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    syncToGoogleSheet('update', updatedLead);

    res.json({
      success: true,
      lead: updatedLead
    });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/leads/:id/status - Quick stage update (for Kanban drag & drop)
app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const leadId = req.params.id;
    const existing = await get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    await run(`UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, leadId]);
    await run(
      `INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'status_change', 'Status Changed', 'Moved from ' || ? || ' to ' || ?)`,
      [leadId, existing.status, status]
    );

    const updated = await get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    syncToGoogleSheet('update', updated);

    res.json({ success: true, lead: updated });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/leads/:id - Delete lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    await run(`DELETE FROM activities WHERE lead_id = ?`, [leadId]);
    await run(`DELETE FROM followups WHERE lead_id = ?`, [leadId]);
    const result = await run(`DELETE FROM leads WHERE id = ?`, [leadId]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/:id/activity - Add activity / call log / note
app.post('/api/leads/:id/activity', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { type = 'note', title = 'Note Added', details = '' } = req.body;

    const result = await run(
      `INSERT INTO activities (lead_id, type, title, details) VALUES (?, ?, ?, ?)`,
      [leadId, type, title, details]
    );

    const activity = await get(`SELECT * FROM activities WHERE id = ?`, [result.id]);
    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/followups - Get followups (Today, Overdue, Upcoming)
app.get('/api/followups', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const followups = await all(
      `SELECT f.*, l.name as lead_name, l.phone as lead_phone, l.email as lead_email, l.company as lead_company, l.status as lead_status
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       ORDER BY f.due_date ASC, f.due_time ASC`
    );

    const overdue = followups.filter(f => !f.is_completed && f.due_date < today);
    const todays = followups.filter(f => !f.is_completed && f.due_date === today);
    const upcoming = followups.filter(f => !f.is_completed && f.due_date > today);
    const completed = followups.filter(f => f.is_completed === 1);

    res.json({
      success: true,
      stats: {
        total: followups.length,
        overdueCount: overdue.length,
        todayCount: todays.length,
        upcomingCount: upcoming.length,
        completedCount: completed.length
      },
      overdue,
      today: todays,
      upcoming,
      completed
    });
  } catch (err) {
    console.error('Error fetching followups:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/followups - Schedule new followup
app.post('/api/followups', async (req, res) => {
  try {
    const { lead_id, due_date, due_time = '10:00', note = '', priority = 'Medium' } = req.body;
    if (!lead_id || !due_date) {
      return res.status(400).json({ success: false, error: 'Lead ID and Due Date are required' });
    }

    const result = await run(
      `INSERT INTO followups (lead_id, due_date, due_time, note, priority) VALUES (?, ?, ?, ?, ?)`,
      [lead_id, due_date, due_time, note, priority]
    );

    // Also update lead's next follow-up date
    await run(
      `UPDATE leads SET next_followup_date = ?, next_followup_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [due_date, due_time, lead_id]
    );

    await run(
      `INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'call', 'Follow-up Scheduled', 'Follow-up set for ' || ? || ' at ' || ? || ': ' || ?)`,
      [lead_id, due_date, due_time, note]
    );

    const followup = await get(`SELECT * FROM followups WHERE id = ?`, [result.id]);
    res.status(201).json({ success: true, followup });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/followups/:id/complete - Mark followup complete
app.patch('/api/followups/:id/complete', async (req, res) => {
  try {
    const followupId = req.params.id;
    const existing = await get(`SELECT * FROM followups WHERE id = ?`, [followupId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }

    const newStatus = existing.is_completed ? 0 : 1;
    const completedAt = newStatus ? new Date().toISOString() : null;

    await run(
      `UPDATE followups SET is_completed = ?, completed_at = ? WHERE id = ?`,
      [newStatus, completedAt, followupId]
    );

    if (newStatus === 1) {
      await run(
        `INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'call', 'Follow-up Completed', ?)`,
        [existing.lead_id, existing.note || 'Follow-up marked as completed']
      );
    }

    res.json({ success: true, message: 'Follow-up status updated', is_completed: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics - Comprehensive Stats & Metrics
app.get('/api/analytics', async (req, res) => {
  try {
    const allLeads = await all(`SELECT * FROM leads`);
    const totalLeads = allLeads.length;

    const wonLeads = allLeads.filter(l => l.status === 'Won');
    const lostLeads = allLeads.filter(l => l.status === 'Lost');
    const inProgressLeads = allLeads.filter(l => !['Won', 'Lost'].includes(l.status));

    const totalPipelineValue = allLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
    const wonValue = wonLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
    const inProgressValue = inProgressLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

    const winRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : 0;

    // Status breakdown
    const statusCounts = {};
    const statuses = ['New', 'Contacted', 'In Progress', 'Proposal Sent', 'Won', 'Lost'];
    statuses.forEach(st => statusCounts[st] = 0);
    allLeads.forEach(l => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    const statusData = Object.keys(statusCounts).map(status => ({
      name: status,
      count: statusCounts[status],
      value: allLeads.filter(l => l.status === status).reduce((s, l) => s + (Number(l.deal_value) || 0), 0)
    }));

    // Source breakdown
    const sourceCounts = {};
    allLeads.forEach(l => {
      const src = l.source || 'Other';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    const sourceData = Object.keys(sourceCounts).map(source => ({
      name: source,
      count: sourceCounts[source]
    }));

    // Recent activities
    const recentActivities = await all(
      `SELECT a.*, l.name as lead_name
       FROM activities a
       JOIN leads l ON a.lead_id = l.id
       ORDER BY a.created_at DESC LIMIT 10`
    );

    res.json({
      success: true,
      metrics: {
        totalLeads,
        wonCount: wonLeads.length,
        lostCount: lostLeads.length,
        inProgressCount: inProgressLeads.length,
        totalPipelineValue,
        wonValue,
        inProgressValue,
        winRate: Number(winRate)
      },
      statusData,
      sourceData,
      recentActivities
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/bulk-import - Import leads from CSV/Excel JSON
app.post('/api/leads/bulk-import', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No data rows provided for import' });
    }

    let importedCount = 0;
    for (const row of rows) {
      const name = row.name || row['Name'] || row['Full Name'] || row['Lead Name'] || row['Customer Name'] || '';
      if (!name.trim()) continue;

      const phone = row.phone || row['Phone'] || row['Mobile'] || row['Contact'] || row['Phone Number'] || '';
      const email = row.email || row['Email'] || row['Email Address'] || '';
      const company = row.company || row['Company'] || row['Organization'] || row['Business Name'] || '';
      const city = row.city || row['City'] || row['Location'] || '';
      const source = row.source || row['Source'] || row['Lead Source'] || 'Google Sheet Import';
      const status = row.status || row['Status'] || row['Stage'] || 'New';
      const priority = row.priority || row['Priority'] || 'Medium';
      const deal_value = Number(row.deal_value || row['Deal Value'] || row['Value'] || row['Budget'] || row['Amount']) || 0;
      const assigned_to = row.assigned_to || row['Assigned To'] || row['Owner'] || 'Unassigned';
      const tags = row.tags || row['Tags'] || 'Imported';
      const notes = row.notes || row['Notes'] || row['Remarks'] || row['Comment'] || '';

      const insertRes = await run(
        `INSERT INTO leads (name, phone, email, company, city, source, status, priority, deal_value, assigned_to, tags, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, phone, email, company, city, source, status, priority, deal_value, assigned_to, tags, notes]
      );

      await run(
        `INSERT INTO activities (lead_id, type, title, details) VALUES (?, 'note', 'Imported from Sheet', 'Row imported successfully')`,
        [insertRes.id]
      );

      importedCount++;
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} leads!`,
      importedCount
    });
  } catch (err) {
    console.error('Error importing leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings - Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await all(`SELECT * FROM settings`);
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch (e) {
        settings[r.key] = r.value;
      }
    });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings - Update setting
app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'Key is required' });

    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, valStr]);

    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend static build (Production & Offline Mode)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Initialize DB and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 CRM Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });

