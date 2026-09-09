const API_BASE = 'http://localhost:5000/api';

export const api = {
  // Leads
  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/leads?${query}`);
    return res.json();
  },

  async getLead(id) {
    const res = await fetch(`${API_BASE}/leads/${id}`);
    return res.json();
  },

  async createLead(leadData) {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
    return res.json();
  },

  async updateLead(id, leadData) {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
    return res.json();
  },

  async updateLeadStatus(id, status) {
    const res = await fetch(`${API_BASE}/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async deleteLead(id) {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async addActivity(leadId, activityData) {
    const res = await fetch(`${API_BASE}/leads/${leadId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData)
    });
    return res.json();
  },

  // Follow-ups
  async getFollowups() {
    const res = await fetch(`${API_BASE}/followups`);
    return res.json();
  },

  async createFollowup(data) {
    const res = await fetch(`${API_BASE}/followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async completeFollowup(id) {
    const res = await fetch(`${API_BASE}/followups/${id}/complete`, {
      method: 'PATCH'
    });
    return res.json();
  },

  // Analytics
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  // Bulk Import
  async bulkImportLeads(rows) {
    const res = await fetch(`${API_BASE}/leads/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async saveSetting(key, value) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    return res.json();
  },

  async testGoogleSheet(url) {
    const res = await fetch(`${API_BASE}/test-google-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  }
};
