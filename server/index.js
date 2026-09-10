require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, Lead, Activity, Followup, Setting } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper: Real-time Google Sheet Webhook Sync
const syncToGoogleSheet = async (action, leadData) => {
  try {
    const settingDoc = await Setting.findOne({ key: 'google_sheet_url' });
    if (!settingDoc || !settingDoc.value) return;

    let webhookUrl = settingDoc.value;
    if (typeof webhookUrl === 'object' && webhookUrl.url) {
      webhookUrl = webhookUrl.url;
    }
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) return;

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        id: leadData.id || leadData._id,
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
  res.json({ status: 'ok', database: 'mongodb', time: new Date().toISOString() });
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
      id: 'TEST-LEAD-999',
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
      notes: 'Testing Google Sheet connection from MongoDB CRM',
      next_followup_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    res.json({ success: true, message: 'Test data sent to Google Sheet' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads - Search, Filter, Sort, Paginate from MongoDB
app.get('/api/leads', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      source = 'all',
      priority = 'all',
      assigned_to = 'all',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { company: { $regex: term, $options: 'i' } },
        { city: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') query.status = status;
    if (source && source !== 'all') query.source = source;
    if (priority && priority !== 'all') query.priority = priority;
    if (assigned_to && assigned_to !== 'all') query.assigned_to = assigned_to;

    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
    const sortObj = {};
    sortObj[sortBy === 'id' ? '_id' : sortBy] = sortDirection;

    const leadsDocs = await Lead.find(query).sort(sortObj).lean();
    const leads = leadsDocs.map(l => ({ ...l, id: l._id.toString() }));

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
    const leadDoc = await Lead.findById(req.params.id).lean();
    if (!leadDoc) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const lead = { ...leadDoc, id: leadDoc._id.toString() };

    const activitiesDocs = await Activity.find({ lead_id: req.params.id }).sort({ created_at: -1 }).lean();
    const activities = activitiesDocs.map(a => ({ ...a, id: a._id.toString() }));

    const followupsDocs = await Followup.find({ lead_id: req.params.id }).sort({ due_date: 1, due_time: 1 }).lean();
    const followups = followupsDocs.map(f => ({ ...f, id: f._id.toString() }));

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

// POST /api/leads - Create new lead in MongoDB & sync to Google Sheet
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
      custom_fields = {}
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Lead Name is required' });
    }

    const newLeadDoc = await Lead.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      company: company.trim(),
      city: city.trim(),
      source,
      status,
      priority,
      deal_value: Number(deal_value) || 0,
      assigned_to,
      tags,
      notes,
      next_followup_date,
      next_followup_time,
      custom_fields
    });

    const leadId = newLeadDoc._id;

    // Log Activity
    await Activity.create({
      lead_id: leadId,
      type: 'note',
      title: 'Lead Created',
      details: `Added to system with status: ${status}`
    });

    // Schedule Follow-up if date specified
    if (next_followup_date) {
      await Followup.create({
        lead_id: leadId,
        due_date: next_followup_date,
        due_time: next_followup_time || '10:00',
        note: notes || 'Initial scheduled follow-up',
        priority
      });
    }

    const responseLead = { ...newLeadDoc.toObject(), id: leadId.toString() };

    // Real-time sync to Google Sheet
    syncToGoogleSheet('create', responseLead);

    res.status(201).json({
      success: true,
      lead: responseLead
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leads/:id - Update lead in MongoDB & sync to Google Sheet
app.put('/api/leads/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    const existing = await Lead.findById(leadId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const previousStatus = existing.status;
    const updateData = { ...req.body };
    if (updateData.deal_value !== undefined) {
      updateData.deal_value = Number(updateData.deal_value) || 0;
    }

    const updatedDoc = await Lead.findByIdAndUpdate(leadId, updateData, { new: true }).lean();
    const updatedLead = { ...updatedDoc, id: updatedDoc._id.toString() };

    // If status changed, log activity
    if (updateData.status && updateData.status !== previousStatus) {
      await Activity.create({
        lead_id: leadId,
        type: 'status_change',
        title: 'Status Changed',
        details: `Moved from ${previousStatus} to ${updateData.status}`
      });
    }

    // Real-time sync to Google Sheet
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

// PATCH /api/leads/:id/status - Quick stage update (Kanban)
app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const leadId = req.params.id;

    const existing = await Lead.findById(leadId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const previousStatus = existing.status;
    existing.status = status;
    await existing.save();

    await Activity.create({
      lead_id: leadId,
      type: 'status_change',
      title: 'Status Changed',
      details: `Moved from ${previousStatus} to ${status}`
    });

    const updated = { ...existing.toObject(), id: existing._id.toString() };
    syncToGoogleSheet('update', updated);

    res.json({ success: true, lead: updated });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/leads/:id - Delete lead from MongoDB
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    await Activity.deleteMany({ lead_id: leadId });
    await Followup.deleteMany({ lead_id: leadId });
    const result = await Lead.findByIdAndDelete(leadId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/:id/activity - Add activity log
app.post('/api/leads/:id/activity', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { type = 'note', title = 'Note Added', details = '' } = req.body;

    const actDoc = await Activity.create({
      lead_id: leadId,
      type,
      title,
      details
    });

    const activity = { ...actDoc.toObject(), id: actDoc._id.toString() };
    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/followups - Today, Overdue, Upcoming
app.get('/api/followups', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const followupsDocs = await Followup.find()
      .populate('lead_id', 'name phone email company status')
      .sort({ due_date: 1, due_time: 1 })
      .lean();

    const followups = followupsDocs.map(f => ({
      ...f,
      id: f._id.toString(),
      lead_name: f.lead_id?.name || 'Unknown',
      lead_phone: f.lead_id?.phone || '',
      lead_email: f.lead_id?.email || '',
      lead_company: f.lead_id?.company || '',
      lead_status: f.lead_id?.status || 'New',
      lead_id: f.lead_id?._id?.toString() || f.lead_id
    }));

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

    const followupDoc = await Followup.create({
      lead_id,
      due_date,
      due_time,
      note,
      priority
    });

    await Lead.findByIdAndUpdate(lead_id, {
      next_followup_date: due_date,
      next_followup_time: due_time
    });

    await Activity.create({
      lead_id,
      type: 'call',
      title: 'Follow-up Scheduled',
      details: `Follow-up set for ${due_date} at ${due_time}: ${note}`
    });

    const followup = { ...followupDoc.toObject(), id: followupDoc._id.toString() };
    res.status(201).json({ success: true, followup });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/followups/:id/complete - Mark followup complete
app.patch('/api/followups/:id/complete', async (req, res) => {
  try {
    const followupId = req.params.id;
    const existing = await Followup.findById(followupId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }

    const newStatus = existing.is_completed ? 0 : 1;
    existing.is_completed = newStatus;
    existing.completed_at = newStatus ? new Date() : null;
    await existing.save();

    if (newStatus === 1) {
      await Activity.create({
        lead_id: existing.lead_id,
        type: 'call',
        title: 'Follow-up Completed',
        details: existing.note || 'Follow-up marked as completed'
      });
    }

    res.json({ success: true, message: 'Follow-up status updated', is_completed: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics - Comprehensive Stats & Metrics from MongoDB
app.get('/api/analytics', async (req, res) => {
  try {
    const allLeadsDocs = await Lead.find().lean();
    const allLeads = allLeadsDocs.map(l => ({ ...l, id: l._id.toString() }));
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
    const recentActivitiesDocs = await Activity.find()
      .populate('lead_id', 'name')
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    const recentActivities = recentActivitiesDocs.map(a => ({
      ...a,
      id: a._id.toString(),
      lead_name: a.lead_id?.name || 'Unknown'
    }));

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

// POST /api/leads/bulk-import - Bulk import into MongoDB & sync
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

      const doc = await Lead.create({
        name, phone, email, company, city, source, status, priority, deal_value, assigned_to, tags, notes
      });

      await Activity.create({
        lead_id: doc._id,
        type: 'note',
        title: 'Imported from Sheet',
        details: 'Row imported successfully'
      });

      importedCount++;
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} leads into MongoDB!`,
      importedCount
    });
  } catch (err) {
    console.error('Error importing leads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings - Get settings from MongoDB
app.get('/api/settings', async (req, res) => {
  try {
    const docs = await Setting.find().lean();
    const settings = {};
    docs.forEach(d => {
      settings[d.key] = d.value;
    });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings - Update setting in MongoDB
app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'Key is required' });

    await Setting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Settings saved in MongoDB' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend static build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Initialize MongoDB Connection and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 CRM Server running on port ${PORT} connected to MongoDB Atlas`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB Atlas:', err.message);
  });
