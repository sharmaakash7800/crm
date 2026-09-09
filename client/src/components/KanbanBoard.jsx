import React from 'react';
import {
  Calendar, Phone, Building2, User, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STAGES = [
  { id: 'New', label: 'New Leads', color: '#3B82F6' },
  { id: 'Contacted', label: 'Contacted', color: '#8B5CF6' },
  { id: 'In Progress', label: 'In Progress', color: '#F59E0B' },
  { id: 'Proposal Sent', label: 'Proposal Sent', color: '#06B6D4' },
  { id: 'Won', label: 'Won / Closed 🎉', color: '#10B981' },
  { id: 'Lost', label: 'Lost', color: '#EF4444' }
];

export default function KanbanBoard({ leads, onSelectLead, onStatusChange }) {
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

  return (
    <div className="kanban-board">
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
                ></span>
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
                stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    draggable
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
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
