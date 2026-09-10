import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Building2, MapPin, DollarSign, Tag, Calendar, Clock, AlertCircle } from 'lucide-react';

export default function LeadModal({ isOpen, onClose, onSave, lead = null }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    city: '',
    source: 'Website Form',
    status: 'New',
    priority: 'Medium',
    deal_value: 0,
    assigned_to: 'Amit Kumar',
    tags: '',
    notes: '',
    next_followup_date: '',
    next_followup_time: '11:00'
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        company: lead.company || '',
        city: lead.city || '',
        source: lead.source || 'Website Form',
        status: lead.status || 'New',
        priority: lead.priority || 'Medium',
        deal_value: lead.deal_value || 0,
        assigned_to: lead.assigned_to || 'Amit Kumar',
        tags: lead.tags || '',
        notes: lead.notes || '',
        next_followup_date: lead.next_followup_date || '',
        next_followup_time: lead.next_followup_time || '11:00'
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        company: '',
        city: '',
        source: 'Website Form',
        status: 'New',
        priority: 'Medium',
        deal_value: 0,
        assigned_to: 'Amit Kumar',
        tags: '',
        notes: '',
        next_followup_date: '',
        next_followup_time: '11:00'
      });
    }
  }, [lead, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <User className="text-primary" size={20} />
            <span>{lead ? 'Edit Lead Details' : 'Add New Lead / Client'}</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group col-span-2">
                <label className="form-label">Full Name / Client Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company / Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Infotech"
                  className="form-input"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Delhi"
                  className="form-input"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lead Stage / Status</label>
                <select
                  className="form-input select-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="New">New Lead</option>
                  <option value="Contacted">Contacted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Won">Won / Closed</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lead Priority</label>
                <select
                  className="form-input select-input"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Deal Value (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                  value={formData.deal_value}
                  onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <select
                  className="form-input select-input"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                >
                  <option value="Website Form">Website Form</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Facebook Ads">Facebook Ads</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="WhatsApp Inquiry">WhatsApp Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Sales Rep</label>
                <select
                  className="form-input select-input"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="Amit Kumar">Amit Kumar</option>
                  <option value="Sneha Roy">Sneha Roy</option>
                  <option value="Vikram Malhotra">Vikram Malhotra</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. VIP, Software, Urgent"
                  className="form-input"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Next Follow-up Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.next_followup_date}
                  onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Follow-up Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.next_followup_time}
                  onChange={(e) => setFormData({ ...formData, next_followup_time: e.target.value })}
                />
              </div>

              <div className="form-group col-span-2">
                <label className="form-label">Initial Notes / Client Requirements</label>
                <textarea
                  rows="3"
                  placeholder="Enter details about client conversation, requirements, or next steps..."
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="modal-footer lead-modal-footer">
            <button
              type="button"
              className="btn btn-secondary modal-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary modal-save-btn"
            >
              {lead ? 'Update Lead Details' : 'Save & Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
