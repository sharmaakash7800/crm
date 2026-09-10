import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Building2, MapPin, DollarSign, Tag, Calendar,
  Clock, MessageSquare, Send, CheckCircle, ArrowRight, User,
  PlusCircle, FileText, Trash2, Edit3, Award, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';

export default function LeadDetailsDrawer({ leadId, onClose, onLeadUpdated, onEditLead, onDeleteLead }) {
  const [leadData, setLeadData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Note / Activity State
  const [activityType, setActivityType] = useState('call');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDetails, setActivityDetails] = useState('');

  // Follow-up form state
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().split('T')[0]);
  const [followupTime, setFollowupTime] = useState('11:00');
  const [followupNote, setFollowupNote] = useState('');

  // WhatsApp Templates
  const [selectedTemplate, setSelectedTemplate] = useState('intro');
  const [customWaMsg, setCustomWaMsg] = useState('');

  const loadLeadDetails = async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const res = await api.getLead(leadId);
      if (res.success) {
        setLeadData(res.lead);
        setActivities(res.activities || []);
        setFollowups(res.followups || []);
        
        // Prepare default whatsapp message
        const clientName = res.lead.name || 'Client';
        setCustomWaMsg(`नमस्ते ${clientName} जी! हमने आपकी इन्क्वायरी प्राप्त की है। क्या हम आपकी आवश्यकता के बारे में बात कर सकते हैं?`);
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadDetails();
  }, [leadId]);

  const handleStatusChange = async (newStatus) => {
    if (!leadData) return;
    try {
      if (newStatus === 'Won') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      await api.updateLeadStatus(leadData.id, newStatus);
      await loadLeadDetails();
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;
    try {
      await api.addActivity(leadData.id, {
        type: activityType,
        title: activityTitle,
        details: activityDetails
      });
      setActivityTitle('');
      setActivityDetails('');
      await loadLeadDetails();
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error adding activity:', err);
    }
  };

  const handleScheduleFollowup = async (e) => {
    e.preventDefault();
    if (!followupDate) return;
    try {
      await api.createFollowup({
        lead_id: leadData.id,
        due_date: followupDate,
        due_time: followupTime,
        note: followupNote || 'Scheduled call/meeting'
      });
      setShowFollowupForm(false);
      setFollowupNote('');
      await loadLeadDetails();
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Error scheduling follow-up:', err);
    }
  };

  const openWhatsApp = () => {
    if (!leadData || !leadData.phone) {
      alert('कृपया इस लीड का फोन नंबर दर्ज करें।');
      return;
    }
    // Clean phone number (remove spaces, dashes, +)
    let cleanPhone = leadData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const encodedMsg = encodeURIComponent(customWaMsg);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  const handleTemplateChange = (type) => {
    setSelectedTemplate(type);
    const name = leadData ? leadData.name : 'Client';
    const email = leadData ? leadData.email : '';
    if (type === 'intro') {
      setCustomWaMsg(`नमस्ते ${name} जी! हमने आपकी इन्क्वायरी प्राप्त की है। क्या हम आपकी आवश्यकता के बारे में कुछ मिनट बात कर सकते हैं?`);
    } else if (type === 'followup') {
      setCustomWaMsg(`Hello ${name}, hope you are doing well! Following up on our previous discussion regarding your requirements. Let us know a good time to connect.`);
    } else if (type === 'proposal') {
      setCustomWaMsg(`Dear ${name}, we have sent the detailed quotation and proposal to your email (${email}). Please review it and let us know your feedback!`);
    } else if (type === 'offer') {
      setCustomWaMsg(`Hi ${name}! We have an exclusive special discount offer on our services this week. Would you like to schedule a quick demo?`);
    }
  };

  if (!leadId) return null;

  return (
    <div className="modal-overlay lead-drawer-overlay" onClick={onClose}>
      <div
        className="modal-content lead-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !leadData ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading lead profile...
          </div>
        ) : (
          <>
            {/* Header: Lead Name, Status, Deal Value, Close */}
            <div className="lead-profile-header">
              <div className="lead-header-info">
                <div className="lead-header-title-row">
                  <h2 className="lead-profile-name">{leadData.name}</h2>
                  <span className={`badge badge-status-${leadData.status.replace(/\s+/g, '')}`}>
                    {leadData.status}
                  </span>
                </div>

                <div className="lead-profile-sub">
                  {leadData.company && <span>🏢 {leadData.company}</span>}
                  {leadData.city && <span>📍 {leadData.city}</span>}
                  <span className="lead-deal-highlight">
                    ₹{Number(leadData.deal_value || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="lead-header-ctrls">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onEditLead(leadData)}
                  title="Edit Lead"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (window.confirm(`Delete ${leadData.name}?`)) {
                      onDeleteLead(leadData.id);
                    }
                  }}
                  title="Delete Lead"
                >
                  <Trash2 size={15} />
                </button>
                <button className="btn-icon" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar: 3 Equal Width Buttons (WhatsApp | Call | Email) */}
            <div className="lead-quick-actions-bar">
              <button
                onClick={openWhatsApp}
                className="btn btn-whatsapp quick-action-btn"
              >
                <MessageSquare size={16} />
                <span>WhatsApp</span>
              </button>

              <a
                href={leadData.phone ? `tel:${leadData.phone}` : '#'}
                className="btn btn-secondary quick-action-btn"
                style={{ textDecoration: 'none' }}
                onClick={(e) => {
                  if (!leadData.phone) {
                    e.preventDefault();
                    alert('Phone number not available');
                  }
                }}
              >
                <Phone size={16} />
                <span>Call</span>
              </a>

              <a
                href={leadData.email ? `mailto:${leadData.email}` : '#'}
                className="btn btn-secondary quick-action-btn"
                style={{ textDecoration: 'none' }}
                onClick={(e) => {
                  if (!leadData.email) {
                    e.preventDefault();
                    alert('Email address not available');
                  }
                }}
              >
                <Mail size={16} />
                <span>Email</span>
              </a>
            </div>

            {/* Body: Stacked Mobile-Friendly Single Column Sections */}
            <div className="lead-profile-body">
              {/* SECTION 1: Pipeline Stage Movement */}
              <div className="lead-section-card">
                <div className="section-title">Change Pipeline Stage</div>
                <div className="stage-buttons-grid">
                  {['New', 'Contacted', 'In Progress', 'Proposal Sent', 'Won', 'Lost'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`btn btn-sm ${leadData.status === st ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {st === 'Won' && <Sparkles size={12} />}
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: Contact Details & Deal Information */}
              <div className="lead-section-card">
                <div className="section-title">Contact & Deal Information</div>
                <div className="lead-info-list">
                  <div className="info-item">
                    <span className="info-label">Deal Value:</span>
                    <span className="info-value deal-val">
                      ₹{Number(leadData.deal_value || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Priority:</span>
                    <span className={`badge badge-priority-${leadData.priority}`}>
                      {leadData.priority}
                    </span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value text-break">
                      {leadData.phone || 'N/A'}
                    </span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value text-break">
                      {leadData.email || 'N/A'}
                    </span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Source:</span>
                    <span className="info-value">{leadData.source || 'Website'}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Assigned:</span>
                    <span className="info-value">{leadData.assigned_to || 'Unassigned'}</span>
                  </div>

                  {leadData.tags && (
                    <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span className="info-label">Tags:</span>
                      <div className="tags-container">
                        {leadData.tags.split(',').map((tag, idx) => (
                          <span key={idx} className="tag-pill">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: WhatsApp Quick Messenger with Templates */}
              <div className="lead-section-card wa-template-section">
                <div className="wa-section-header">
                  <div className="wa-title">
                    <MessageSquare size={16} /> WhatsApp Template
                  </div>
                  <div className="wa-template-pills">
                    {['intro', 'followup', 'proposal', 'offer'].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => handleTemplateChange(tpl)}
                        className={`template-pill ${selectedTemplate === tpl ? 'active' : ''}`}
                      >
                        {tpl.charAt(0).toUpperCase() + tpl.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows="3"
                  className="form-input wa-msg-input"
                  value={customWaMsg}
                  onChange={(e) => setCustomWaMsg(e.target.value)}
                />

                <button
                  onClick={openWhatsApp}
                  className="btn btn-whatsapp"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Send size={15} /> Send WhatsApp Now
                </button>
              </div>

              {/* SECTION 4: Follow-ups Schedule */}
              <div className="lead-section-card">
                <div className="section-header-row">
                  <div className="section-title">⏰ Follow-ups & Reminders</div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowFollowupForm(!showFollowupForm)}
                  >
                    {showFollowupForm ? 'Cancel' : '+ Schedule'}
                  </button>
                </div>

                {showFollowupForm && (
                  <form onSubmit={handleScheduleFollowup} className="followup-inline-form">
                    <div className="form-grid-2">
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                      />
                      <input
                        type="time"
                        className="form-input"
                        value={followupTime}
                        onChange={(e) => setFollowupTime(e.target.value)}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Reminder purpose / notes..."
                      className="form-input"
                      value={followupNote}
                      onChange={(e) => setFollowupNote(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                      Save Follow-up
                    </button>
                  </form>
                )}

                {followups.length === 0 ? (
                  <p className="empty-subtext">No follow-ups scheduled.</p>
                ) : (
                  <div className="followups-stacked-list">
                    {followups.slice(0, 4).map((f) => (
                      <div key={f.id} className="followup-mini-row">
                        <div>
                          <div className="followup-due">📅 {f.due_date} at {f.due_time}</div>
                          <div className="followup-desc">{f.note}</div>
                        </div>
                        {f.is_completed ? (
                          <span className="done-tag">✓ Done</span>
                        ) : (
                          <button
                            onClick={async () => {
                              await api.completeFollowup(f.id);
                              loadLeadDetails();
                              if (onLeadUpdated) onLeadUpdated();
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: Add Note / Activity Log */}
              <div className="lead-section-card">
                <div className="section-title">+ Log Call / Meeting / Note</div>
                <form onSubmit={handleAddActivity} className="activity-form">
                  <div className="form-grid-2">
                    <select
                      className="form-input"
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                    >
                      <option value="call">📞 Phone Call</option>
                      <option value="meeting">🤝 Meeting</option>
                      <option value="note">📝 Note</option>
                      <option value="whatsapp">💬 WhatsApp</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Title (e.g. Discussed pricing)"
                      className="form-input"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                    />
                  </div>
                  <textarea
                    rows="2"
                    placeholder="Key discussion points, next steps..."
                    className="form-input"
                    value={activityDetails}
                    onChange={(e) => setActivityDetails(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    Save Activity Log
                  </button>
                </form>
              </div>

              {/* SECTION 6: Activity Timeline History */}
              <div className="lead-section-card">
                <div className="section-title">📜 Activity Timeline & History</div>
                {activities.length === 0 ? (
                  <p className="empty-subtext">No activities logged yet.</p>
                ) : (
                  <div className="timeline">
                    {activities.map((act) => (
                      <div key={act.id} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-item-header">
                          <span className="timeline-title">{act.title}</span>
                          <span className="timeline-time">
                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {act.details && (
                          <div className="timeline-details text-break">
                            {act.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
