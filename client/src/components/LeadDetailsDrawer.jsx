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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '850px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !leadData ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading lead profile...
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="modal-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#FFFFFF' }}>{leadData.name}</h2>
                  <span className={`badge badge-status-${leadData.status.replace(/\s+/g, '')}`}>
                    {leadData.status}
                  </span>
                  <span className={`badge badge-priority-${leadData.priority}`}>
                    {leadData.priority} Priority
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                  {leadData.company && <span>🏢 {leadData.company}</span>}
                  {leadData.city && <span>📍 {leadData.city}</span>}
                  <span>🎯 {leadData.source}</span>
                  <span>👤 Assigned: {leadData.assigned_to}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onEditLead(leadData)}
                  title="Edit Lead Details"
                >
                  <Edit3 size={15} /> Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (window.confirm(`क्या आप ${leadData.name} को हटाना चाहते हैं?`)) {
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

            {/* Body */}
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              {/* Left Column: Quick Actions, WhatsApp & Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Pipeline Stage Movement */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                    Quick Stage Change
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {['New', 'Contacted', 'In Progress', 'Proposal Sent', 'Won', 'Lost'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`btn btn-sm ${leadData.status === st ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        {st === 'Won' && <Sparkles size={12} />}
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {leadData.phone && (
                    <a
                      href={`tel:${leadData.phone}`}
                      className="btn btn-secondary"
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      <Phone size={15} className="text-primary" /> Call Now
                    </a>
                  )}
                  {leadData.email && (
                    <a
                      href={`mailto:${leadData.email}`}
                      className="btn btn-secondary"
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      <Mail size={15} className="text-primary" /> Send Email
                    </a>
                  )}
                </div>

                {/* WhatsApp Quick Messenger */}
                <div style={{ background: 'rgba(37, 211, 102, 0.05)', border: '1px solid rgba(37, 211, 102, 0.2)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#25D366', fontWeight: '700', fontSize: '0.875rem' }}>
                      <MessageSquare size={16} /> WhatsApp Direct
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => handleTemplateChange('intro')}
                        className={`btn btn-sm ${selectedTemplate === 'intro' ? 'btn-whatsapp' : 'btn-secondary'}`}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        Intro
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateChange('followup')}
                        className={`btn btn-sm ${selectedTemplate === 'followup' ? 'btn-whatsapp' : 'btn-secondary'}`}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        Followup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateChange('proposal')}
                        className={`btn btn-sm ${selectedTemplate === 'proposal' ? 'btn-whatsapp' : 'btn-secondary'}`}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTemplateChange('offer')}
                        className={`btn btn-sm ${selectedTemplate === 'offer' ? 'btn-whatsapp' : 'btn-secondary'}`}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        Offer
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows="3"
                    className="form-input"
                    style={{ width: '100%', marginBottom: '0.75rem', fontSize: '0.825rem' }}
                    value={customWaMsg}
                    onChange={(e) => setCustomWaMsg(e.target.value)}
                  ></textarea>

                  <button
                    onClick={openWhatsApp}
                    className="btn btn-whatsapp"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Send size={15} /> Send WhatsApp Message
                  </button>
                </div>

                {/* Add Call Log / Activity */}
                <form onSubmit={handleAddActivity} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem', color: '#FFFFFF' }}>
                    + Log Call / Note / Meeting
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      className="form-input select-input"
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
                    placeholder="Key discussion points, objections, next steps..."
                    className="form-input"
                    style={{ width: '100%', marginBottom: '0.5rem', fontSize: '0.825rem' }}
                    value={activityDetails}
                    onChange={(e) => setActivityDetails(e.target.value)}
                  ></textarea>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    Save Activity Log
                  </button>
                </form>
              </div>

              {/* Right Column: Lead Stats & Activity History Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Details Snapshot Card */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Deal Value:</span>
                    <span className="deal-value" style={{ fontSize: '1.15rem' }}>₹{Number(leadData.deal_value || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone:</span>
                    <span style={{ fontSize: '0.85rem', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{leadData.phone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email:</span>
                    <span style={{ fontSize: '0.85rem', color: '#93C5FD' }}>{leadData.email || 'N/A'}</span>
                  </div>
                  {leadData.tags && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {leadData.tags.split(',').map((tag, idx) => (
                        <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', color: '#CBD5E1' }}>
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow-up Section */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFFFFF' }}>⏰ Follow-ups</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.725rem' }}
                      onClick={() => setShowFollowupForm(!showFollowupForm)}
                    >
                      {showFollowupForm ? 'Cancel' : '+ Schedule'}
                    </button>
                  </div>

                  {showFollowupForm && (
                    <form onSubmit={handleScheduleFollowup} style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
                        placeholder="Reminder purpose..."
                        className="form-input"
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                        value={followupNote}
                        onChange={(e) => setFollowupNote(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Save Follow-up
                      </button>
                    </form>
                  )}

                  {followups.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No follow-up scheduled yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {followups.slice(0, 3).map((f) => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#FFFFFF' }}>📅 {f.due_date} at {f.due_time}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>{f.note}</div>
                          </div>
                          {f.is_completed ? (
                            <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓ Done</span>
                          ) : (
                            <button
                              onClick={async () => {
                                await api.completeFollowup(f.id);
                                loadLeadDetails();
                                if (onLeadUpdated) onLeadUpdated();
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem' }}
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity Timeline */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem', color: '#FFFFFF' }}>
                    📜 Activity Timeline & History
                  </div>

                  {activities.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No activities logged yet.</p>
                  ) : (
                    <div className="timeline">
                      {activities.map((act) => (
                        <div key={act.id} className="timeline-item">
                          <div className="timeline-dot"></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.825rem', fontWeight: '600', color: '#F1F5F9' }}>{act.title}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {act.details && (
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {act.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
