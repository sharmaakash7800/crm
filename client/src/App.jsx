import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Kanban, Calendar, BarChart3, Settings,
  Plus, Search, Filter, Download, Upload, Phone, Mail, MessageSquare,
  Sparkles, CheckCircle2, ChevronDown, MoreVertical, Trash2, Edit3,
  ExternalLink, Layers, ArrowUpDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from './api';

import LeadModal from './components/LeadModal';
import LeadDetailsDrawer from './components/LeadDetailsDrawer';
import KanbanBoard from './components/KanbanBoard';
import FollowupsView from './components/FollowupsView';
import AnalyticsView from './components/AnalyticsView';
import ImportExportModal from './components/ImportExportModal';
import SettingsView from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads', 'kanban', 'followups', 'analytics', 'settings'
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modals & Drawer States
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Follow-up alerts count
  const [overdueCount, setOverdueCount] = useState(0);
  const [todayFollowupCount, setTodayFollowupCount] = useState(0);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.getLeads({
        search,
        status: statusFilter,
        source: sourceFilter,
        priority: priorityFilter,
        sortBy,
        sortOrder
      });
      if (res.success) {
        setLeads(res.leads);
      }

      // Check follow-ups for badge
      const fRes = await api.getFollowups();
      if (fRes.success && fRes.stats) {
        setOverdueCount(fRes.stats.overdueCount || 0);
        setTodayFollowupCount(fRes.stats.todayCount || 0);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, sourceFilter, priorityFilter, sortBy, sortOrder]);

  const handleCreateOrUpdateLead = async (formData) => {
    try {
      if (editingLead) {
        await api.updateLead(editingLead.id, formData);
      } else {
        await api.createLead(formData);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
      setIsLeadModalOpen(false);
      setEditingLead(null);
      fetchLeads();
      if (selectedLeadId) {
        setSelectedLeadId(selectedLeadId);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.updateLeadStatus(leadId, newStatus);
      fetchLeads();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await api.deleteLead(id);
      if (selectedLeadId === id) setSelectedLeadId(null);
      fetchLeads();
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const openWhatsApp = (phone, name) => {
    if (!phone) {
      alert('Phone number is missing for this lead.');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const msg = encodeURIComponent(`नमस्ते ${name || 'जी'}! क्या हम आपकी आवश्यकता के बारे में बात कर सकते हैं?`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Layers size={22} />
          </div>
          <div>
            <div className="brand-title">Nexus SheetLess CRM</div>
            <div className="brand-subtitle">100% Private • Google Sheet Free</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="nav-tabs">
          <button
            onClick={() => setActiveTab('leads')}
            className={`nav-tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
          >
            <Users size={16} />
            <span>Leads Database</span>
            <span className="badge-count">{leads.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`nav-tab-btn ${activeTab === 'kanban' ? 'active' : ''}`}
          >
            <Kanban size={16} />
            <span>Kanban Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('followups')}
            className={`nav-tab-btn ${activeTab === 'followups' ? 'active' : ''}`}
          >
            <Calendar size={16} />
            <span>Follow-ups</span>
            {(overdueCount > 0 || todayFollowupCount > 0) && (
              <span
                style={{
                  background: overdueCount > 0 ? '#EF4444' : '#F59E0B',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: '700'
                }}
              >
                {overdueCount + todayFollowupCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Quick Action Buttons */}
        <div className="nav-actions">
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="btn btn-secondary"
            title="Import or Export Sheet Data"
          >
            <Upload size={16} />
            <span>Sheet Import/Export</span>
          </button>

          <button
            onClick={() => {
              setEditingLead(null);
              setIsLeadModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>+ Add New Lead</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="main-content">
        {/* TAB 1: LEADS DATABASE (TABLE / GRID) */}
        {activeTab === 'leads' && (
          <div>
            {/* Filter & Search Toolbar */}
            <div className="toolbar">
              <div className="search-box">
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search by client name, phone, company, city, tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <select
                  className="select-input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Stages (Status)</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>

                <select
                  className="select-input"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  <option value="all">All Sources</option>
                  <option value="Website Form">Website Form</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Facebook Ads">Facebook Ads</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                </select>

                <select
                  className="select-input"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  className="select-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="created_at">Sort: Newest First</option>
                  <option value="deal_value">Sort: Deal Value</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="next_followup_date">Sort: Next Follow-up</option>
                </select>
              </div>
            </div>

            {/* Table Container */}
            <div className="table-container">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading CRM leads...
                </div>
              ) : leads.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', margin: '0 auto' }} />
                  <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', marginBottom: '0.5rem' }}>No leads found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    Click "+ Add New Lead" or "Sheet Import" to bring your data into the CRM.
                  </p>
                  <button
                    onClick={() => {
                      setEditingLead(null);
                      setIsLeadModalOpen(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Plus size={16} /> Create First Lead
                  </button>
                </div>
              ) : (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Lead / Client</th>
                      <th>Contact Details</th>
                      <th>Stage (Status)</th>
                      <th>Priority</th>
                      <th>Deal Value</th>
                      <th>Next Follow-up</th>
                      <th>Assigned To</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <div className="lead-name-cell">
                            <span
                              className="name"
                              onClick={() => setSelectedLeadId(lead.id)}
                            >
                              {lead.name}
                            </span>
                            <span className="company">
                              {lead.company ? `🏢 ${lead.company}` : ''} {lead.city ? `• ${lead.city}` : ''}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1' }}>
                                {lead.phone || '-'}
                              </span>
                              {lead.phone && (
                                <button
                                  onClick={() => openWhatsApp(lead.phone, lead.name)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                  title="Quick WhatsApp"
                                >
                                  <MessageSquare size={13} style={{ color: '#25D366' }} />
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {lead.email || '-'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <select
                            className={`select-input badge badge-status-${lead.status.replace(/\s+/g, '')}`}
                            style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Won">Won</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>

                        <td>
                          <span className={`badge badge-priority-${lead.priority}`}>
                            {lead.priority}
                          </span>
                        </td>

                        <td>
                          <span className="deal-value">
                            ₹{Number(lead.deal_value || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td>
                          {lead.next_followup_date ? (
                            <div style={{ fontSize: '0.8rem', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} />
                              <span>{lead.next_followup_date}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                          )}
                        </td>

                        <td>
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                            {lead.assigned_to || 'Unassigned'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="btn btn-secondary btn-sm"
                              title="Open Profile"
                            >
                              Profile
                            </button>
                            <button
                              onClick={() => {
                                setEditingLead(lead);
                                setIsLeadModalOpen(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              title="Edit Lead"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`क्या आप ${lead.name} को हटाना चाहते हैं?`)) {
                                  handleDeleteLead(lead.id);
                                }
                              }}
                              className="btn btn-danger btn-sm"
                              title="Delete Lead"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: KANBAN PIPELINE */}
        {activeTab === 'kanban' && (
          <KanbanBoard
            leads={leads}
            onSelectLead={(id) => setSelectedLeadId(id)}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* TAB 3: FOLLOW-UPS & CALL REMINDERS */}
        {activeTab === 'followups' && (
          <FollowupsView
            onSelectLead={(id) => setSelectedLeadId(id)}
          />
        )}

        {/* TAB 4: ANALYTICS & INSIGHTS */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            onSelectLead={(id) => setSelectedLeadId(id)}
          />
        )}

        {/* TAB 5: SETTINGS & TEMPLATES */}
        {activeTab === 'settings' && (
          <SettingsView />
        )}
      </main>

      {/* MODAL 1: Create / Edit Lead */}
      <LeadModal
        isOpen={isLeadModalOpen}
        lead={editingLead}
        onClose={() => {
          setIsLeadModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleCreateOrUpdateLead}
      />

      {/* MODAL 2: Lead Profile & Activity Drawer */}
      {selectedLeadId && (
        <LeadDetailsDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={fetchLeads}
          onEditLead={(lead) => {
            setSelectedLeadId(null);
            setEditingLead(lead);
            setIsLeadModalOpen(true);
          }}
          onDeleteLead={(id) => {
            handleDeleteLead(id);
            setSelectedLeadId(null);
          }}
        />
      )}

      {/* MODAL 3: Google Sheets CSV Migration & Backup */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        leads={leads}
        onClose={() => setIsImportExportOpen(false)}
        onImportSuccess={fetchLeads}
      />
    </div>
  );
}
