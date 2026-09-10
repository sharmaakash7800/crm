import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, Phone, MessageSquare,
  Plus, Check, ArrowUpRight, User, Building2
} from 'lucide-react';
import { api } from '../api';

export default function FollowupsView({ onSelectLead }) {
  const [followupData, setFollowupData] = useState({
    overdue: [],
    today: [],
    upcoming: [],
    completed: [],
    stats: { overdueCount: 0, todayCount: 0, upcomingCount: 0, completedCount: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const loadFollowups = async () => {
    try {
      setLoading(true);
      const res = await api.getFollowups();
      if (res.success) {
        setFollowupData(res);
      }
    } catch (err) {
      console.error('Failed to load followups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowups();
  }, []);

  const handleToggleComplete = async (id) => {
    try {
      await api.completeFollowup(id);
      loadFollowups();
    } catch (err) {
      console.error('Error completing follow-up:', err);
    }
  };

  const openWhatsApp = (phone, name) => {
    if (!phone) {
      alert('Phone number not available');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const msg = encodeURIComponent(`नमस्ते ${name || 'जी'}! क्या हम आपकी आवश्यकता के बारे में बात कर सकते हैं?`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const renderFollowupCard = (item, type) => (
    <div key={item.id} className={`followup-card mobile-followup-card ${type}`}>
      {/* Top Header: Lead Name + Status */}
      <div className="followup-card-top-row">
        <div className="followup-lead-info">
          <span
            onClick={() => onSelectLead(item.lead_id)}
            className="followup-lead-name"
          >
            {item.lead_name}
          </span>
          {item.lead_company && (
            <div className="followup-lead-company">
              🏢 {item.lead_company}
            </div>
          )}
        </div>

        <span className={`badge badge-status-${(item.lead_status || 'New').replace(/\s+/g, '')}`}>
          {item.lead_status}
        </span>
      </div>

      {/* Note / Follow-up detail */}
      <div className="followup-card-note">
        {item.note || 'Scheduled follow-up with client'}
      </div>

      {/* Due Date & Time Banner */}
      <div className="followup-card-meta">
        <div className="followup-time-chip">
          <Calendar size={13} />
          <span>{item.due_date}</span>
          <span className="dot-sep">·</span>
          <Clock size={13} />
          <span>{item.due_time}</span>
        </div>

        {item.is_completed && (
          <span className="followup-done-badge">
            <Check size={12} /> Done
          </span>
        )}
      </div>

      {/* Action Buttons: 2-column layout for WhatsApp/Call + Open button */}
      <div className="followup-card-actions">
        {item.lead_phone ? (
          <>
            <button
              onClick={() => openWhatsApp(item.lead_phone, item.lead_name)}
              className="btn btn-whatsapp followup-action-btn"
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </button>

            <a
              href={`tel:${item.lead_phone}`}
              className="btn btn-secondary followup-action-btn"
              style={{ textDecoration: 'none' }}
            >
              <Phone size={14} />
              <span>Call</span>
            </a>
          </>
        ) : (
          <button
            onClick={() => handleToggleComplete(item.id)}
            className="btn btn-secondary followup-action-btn"
          >
            <Check size={14} />
            <span>{item.is_completed ? 'Mark Pending' : 'Mark Done'}</span>
          </button>
        )}

        <button
          onClick={() => onSelectLead(item.lead_id)}
          className="btn btn-secondary followup-open-btn"
          title="Open Lead Profile"
        >
          <ArrowUpRight size={15} />
          <span>Open</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="metric-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="metric-details">
            <span className="metric-label">Overdue Follow-ups</span>
            <span className="metric-value" style={{ color: '#EF4444' }}>{followupData.stats?.overdueCount || 0}</span>
            <span className="metric-sub">Need immediate attention</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="metric-details">
            <span className="metric-label">Today's Calls & Tasks</span>
            <span className="metric-value" style={{ color: '#F59E0B' }}>{followupData.stats?.todayCount || 0}</span>
            <span className="metric-sub">Scheduled for today</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="metric-details">
            <span className="metric-label">Upcoming Pipeline Calls</span>
            <span className="metric-value" style={{ color: '#3B82F6' }}>{followupData.stats?.upcomingCount || 0}</span>
            <span className="metric-sub">Next 7 to 30 days</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="metric-details">
            <span className="metric-label">Completed Calls</span>
            <span className="metric-value" style={{ color: '#10B981' }}>{followupData.stats?.completedCount || 0}</span>
            <span className="metric-sub">Tasks finished</span>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Overdue Section */}
        {followupData.overdue?.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#EF4444', fontWeight: '700' }}>
              <AlertCircle size={18} />
              <span>🚨 Overdue Follow-ups ({followupData.overdue.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {followupData.overdue.map((item) => renderFollowupCard(item, 'overdue'))}
            </div>
          </div>
        )}

        {/* Today's Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#F59E0B', fontWeight: '700' }}>
            <Clock size={18} />
            <span>🔥 Today's Schedule ({followupData.today?.length || 0})</span>
          </div>
          {followupData.today?.length === 0 ? (
            <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No follow-ups pending for today. Great job!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {followupData.today.map((item) => renderFollowupCard(item, 'today'))}
            </div>
          )}
        </div>

        {/* Upcoming Section */}
        {followupData.upcoming?.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#3B82F6', fontWeight: '700' }}>
              <Calendar size={18} />
              <span>📅 Upcoming Calls & Meetings ({followupData.upcoming.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {followupData.upcoming.map((item) => renderFollowupCard(item, 'upcoming'))}
            </div>
          </div>
        )}

        {/* Completed Section */}
        {followupData.completed?.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10B981', fontWeight: '700' }}>
              <CheckCircle2 size={18} />
              <span>✅ Completed History ({followupData.completed.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {followupData.completed.slice(0, 5).map((item) => renderFollowupCard(item, 'completed'))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
