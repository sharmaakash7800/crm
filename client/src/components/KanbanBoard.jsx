import React, { useState } from 'react';
import {
  Calendar, Phone, Building2, User, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STAGES = [
  { id: 'New', label: 'New Leads', shortLabel: 'New', color: '#3B82F6' },
  { id: 'Contacted', label: 'Contacted', shortLabel: 'Contacted', color: '#8B5CF6' },
  { id: 'In Progress', label: 'In Progress', shortLabel: 'In Progress', color: '#F59E0B' },
  { id: 'Proposal Sent', label: 'Proposal Sent', shortLabel: 'Proposal', color: '#06B6D4' },
  { id: 'Won', label: 'Won / Closed 🎉', shortLabel: 'Won', color: '#10B981' },
  { id: 'Lost', label: 'Lost', shortLabel: 'Lost', color: '#EF4444' }
];

export default function KanbanBoard({ leads, onSelectLead, onStatusChange }) {
  const [activeMobileStage, setActiveMobileStage] = useState('New');

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      if (targetStatus === 'Won') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
      onStatusChange(leadId, targetStatus);
    }
  };

  const handleMoveStage = (e, leadId, targetStatus) => {
    e.stopPropagation();
    if (targetStatus === 'Won') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
    onStatusChange(leadId, targetStatus);
  };

  const renderCard = (lead, isMobile = false) => (
    <div
      key={lead.id}
      className={`kanban-card ${isMobile ? 'mobile-kanban-card' : ''}`}
      draggable={!isMobile}
      onDragStart={(e) => handleDragStart(e, lead.id)}
      onClick={() => onSelectLead(lead.id)}
    >
      <div className="kanban-card-top">
        <div className="kanban-card-title">{lead.name}</div>
        <span className={`badge badge-priority-${lead.priority}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
          {lead.priority}
        </span>
      </div>

      {lead.company && (
        <div className="kanban-card-company">
          🏢 {lead.company} {lead.city ? `• ${lead.city}` : ''}
        </div>
      )}

      {lead.phone && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
          📞 {lead.phone}
        </div>
      )}

      {lead.next_followup_date && (
        <div style={{ fontSize: '0.725rem', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem' }}>
          <Calendar size={12} /> {lead.next_followup_date}
        </div>
      )}

      <div className="kanban-card-footer">
        <span className="deal-value">
          ₹{Number(lead.deal_value || 0).toLocaleString('en-IN')}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
          {lead.source}
        </span>
      </div>

      {/* Mobile-Friendly Stage Move Action (Touch Devices) */}
      <div className="mobile-stage-mover" onClick={(e) => e.stopPropagation()}>
        <span className="mover-label">Move to:</span>
        <select
          className="mover-select"
          value={lead.status}
          onChange={(e) => handleMoveStage(e, lead.id, e.target.value)}
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.shortLabel}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="kanban-wrapper">
      {/* Mobile Top Stage Selector Tabs (One Stage at a time on Mobile) */}
      <div className="mobile-kanban-stage-tabs mobile-only">
        {STAGES.map((stage) => {
          const count = leads.filter((l) => l.status === stage.id).length;
          const isActive = activeMobileStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveMobileStage(stage.id)}
              className={`mobile-stage-tab ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? stage.color : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)'
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: stage.color,
                  display: 'inline-block'
                }}
              />
              <span>{stage.shortLabel}</span>
              <span className="stage-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Active Column View (Width = Viewport - 32px) */}
      <div className="mobile-kanban-single-column mobile-only">
        {(() => {
          const currentStage = STAGES.find((s) => s.id === activeMobileStage) || STAGES[0];
          const stageLeads = leads.filter((l) => l.status === currentStage.id);
          const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

          return (
            <div className="kanban-column mobile-full-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: currentStage.color,
                      display: 'inline-block'
                    }}
                  />
                  <span>{currentStage.label}</span>
                  <span className="badge-count">{stageLeads.length}</span>
                </div>
                <div className="kanban-column-total">
                  ₹{stageValue.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="kanban-cards-list">
                {stageLeads.length === 0 ? (
                  <div className="kanban-empty-placeholder">
                    No leads in {currentStage.shortLabel} stage
                  </div>
                ) : (
                  stageLeads.map((lead) => renderCard(lead, true))
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Desktop Kanban Multi-Column View */}
      <div className="kanban-board desktop-only">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);
          const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

          return (
            <div
              key={stage.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: stage.color,
                      display: 'inline-block'
                    }}
                  />
                  <span>{stage.label}</span>
                  <span className="badge-count">{stageLeads.length}</span>
                </div>
                <div className="kanban-column-total">
                  ₹{stageValue.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Cards List */}
              <div className="kanban-cards-list">
                {stageLeads.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    Drag cards here
                  </div>
                ) : (
                  stageLeads.map((lead) => renderCard(lead, false))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
