import React, { useState } from 'react';
import { X, UploadCloud, Download, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../api';

export default function ImportExportModal({ isOpen, onClose, leads, onImportSuccess }) {
  const [fileData, setFileData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });

        if (data && data.length > 0) {
          setFileData(data);
          setImportStatus(null);
        } else {
          alert('No data rows found in this file.');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Failed to parse file. Please upload a valid CSV or Excel file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!fileData || fileData.length === 0) return;
    try {
      setIsImporting(true);
      const res = await api.bulkImportLeads(fileData);
      if (res.success) {
        setImportStatus({ success: true, message: res.message });
        if (onImportSuccess) onImportSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setImportStatus({ success: false, message: res.error || 'Import failed' });
      }
    } catch (err) {
      setImportStatus({ success: false, message: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!leads || leads.length === 0) {
      alert('No leads data to export.');
      return;
    }

    const exportData = leads.map((l) => ({
      ID: l.id,
      Name: l.name,
      Phone: l.phone,
      Email: l.email,
      Company: l.company,
      City: l.city,
      Source: l.source,
      Status: l.status,
      Priority: l.priority,
      'Deal Value (₹)': l.deal_value,
      'Assigned To': l.assigned_to,
      Tags: l.tags,
      Notes: l.notes,
      'Next Follow-up Date': l.next_followup_date,
      'Next Follow-up Time': l.next_followup_time,
      'Created At': l.created_at
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `Leads_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet className="text-primary" size={22} />
            <span>Google Sheets / CSV Migration & Backup</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Export Section */}
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: '700', color: '#FFFFFF', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                Backup & Export all Leads
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Download all your CRM leads into a clean Excel/CSV file anytime for offline backup.
              </div>
            </div>
            <button onClick={handleExportCSV} className="btn btn-secondary" style={{ flexShrink: 0 }}>
              <Download size={16} /> Export to Excel
            </button>
          </div>

          <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '0.5rem 0' }}></div>

          {/* Import Section */}
          <div>
            <div style={{ fontWeight: '700', color: '#FFFFFF', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              Import Google Sheets / CSV File
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Download your existing Google Sheet as CSV or Excel (.xlsx) and upload it here. Columns like Name, Phone, Email, Company, Status, and Deal Value will be mapped automatically.
            </p>

            <label
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.2)',
                transition: 'border-color 0.2s ease'
              }}
            >
              <UploadCloud size={36} className="text-primary" />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: '600', color: '#60A5FA' }}>Click to browse</span> or drag and drop CSV / Excel file
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports .csv, .xlsx, .xls
                </div>
              </div>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>

            {fileName && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>📄 {fileName} ({fileData.length} records detected)</span>
                <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: '600' }}>Ready to Import</span>
              </div>
            )}

            {/* Preview of first 3 rows */}
            {fileData.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Data Preview (First 3 rows):
                </div>
                <div style={{ overflowX: 'auto', background: '#0B0F19', borderRadius: 'var(--radius-md)', padding: '0.5rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>
                    {JSON.stringify(fileData.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {importStatus && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: importStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: importStatus.success ? '#34D399' : '#F87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {importStatus.success ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {fileData.length > 0 && (
            <button
              type="button"
              disabled={isImporting}
              className="btn btn-primary"
              onClick={handleConfirmImport}
            >
              {isImporting ? 'Importing...' : `Import ${fileData.length} Leads Now`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
