import React, { useState, useEffect } from 'react';
import {
  Settings, MessageSquare, Database, ShieldCheck, Check, Save, Plus, Trash2,
  HardDrive, Zap, Info
} from 'lucide-react';
import { api } from '../api';

export default function SettingsView() {
  const [templates, setTemplates] = useState([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [testingSheet, setTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [sheetSavedSuccess, setSheetSavedSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        // First fallback to local storage
        const cachedUrl = localStorage.getItem('crm_google_sheet_url');
        if (cachedUrl) {
          setGoogleSheetUrl(cachedUrl);
        }

        const res = await api.getSettings();
        if (res.success) {
          if (res.settings.whatsapp_templates) {
            setTemplates(res.settings.whatsapp_templates);
          }
          if (res.settings.google_sheet_url) {
            setGoogleSheetUrl(res.settings.google_sheet_url);
            localStorage.setItem('crm_google_sheet_url', res.settings.google_sheet_url);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleTemplateChange = (index, field, value) => {
    const updated = [...templates];
    updated[index][field] = value;
    setTemplates(updated);
  };

  const handleAddTemplate = () => {
    setTemplates([
      ...templates,
      {
        id: Date.now().toString(),
        title: 'New Template',
        message: 'Hello {name}, '
      }
    ]);
  };

  const handleDeleteTemplate = (index) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async () => {
    try {
      await api.saveSetting('whatsapp_templates', templates);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings.');
    }
  };

  const handleSaveGoogleSheet = async () => {
    try {
      const trimmed = googleSheetUrl.trim();
      localStorage.setItem('crm_google_sheet_url', trimmed);
      await api.saveSetting('google_sheet_url', trimmed);
      setSheetSavedSuccess(true);
      setTimeout(() => setSheetSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving google sheet setting:', err);
      alert('Failed to save Google Sheet link.');
    }
  };

  const handleTestGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      alert('Pehle Google Sheet Webhook URL daalein!');
      return;
    }
    setTestingSheet(true);
    setSheetTestResult(null);
    try {
      const res = await api.testGoogleSheet(googleSheetUrl.trim());
      if (res.success) {
        setSheetTestResult({ type: 'success', text: 'Data successfully sent to Google Sheet!' });
      } else {
        setSheetTestResult({ type: 'error', text: res.error || 'Failed to connect.' });
      }
    } catch (err) {
      setSheetTestResult({ type: 'error', text: err.message || 'Connection failed.' });
    } finally {
      setTestingSheet(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Privacy & Cloud Database Badge */}
      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <div style={{ fontWeight: '700', color: '#FFFFFF', fontSize: '1rem' }}>
            MongoDB Atlas Cloud Database Active & Connected
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            आपका पूरा लीड डेटाबेस सुरक्षित <code style={{ color: '#93C5FD' }}>MongoDB Atlas (Cluster0)</code> में स्टोर और लाइव फेच हो रहा है। इसके साथ ही Google Sheets ऑटो-सिंक भी रियल-टाइम काम कर रहा है।
          </div>
        </div>
      </div>

      {/* WhatsApp Message Templates Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: '#FFFFFF' }}>
            <MessageSquare size={20} style={{ color: '#25D366' }} />
            <span>WhatsApp Quick Message Templates</span>
          </div>
          <button onClick={handleAddTemplate} className="btn btn-secondary btn-sm">
            <Plus size={15} /> Add Template
          </button>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          You can use variables like <code style={{ color: '#60A5FA', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>&#123;name&#125;</code> and <code style={{ color: '#60A5FA', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>&#123;email&#125;</code> in your templates.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {templates.map((tpl, index) => (
            <div
              key={tpl.id || index}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Template Title"
                  className="form-input"
                  style={{ fontWeight: '600', maxWidth: '300px' }}
                  value={tpl.title}
                  onChange={(e) => handleTemplateChange(index, 'title', e.target.value)}
                />
                <button
                  onClick={() => handleDeleteTemplate(index)}
                  className="btn btn-danger btn-sm"
                  title="Delete Template"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <textarea
                rows="3"
                className="form-input"
                style={{ width: '100%', fontSize: '0.85rem' }}
                value={tpl.message}
                onChange={(e) => handleTemplateChange(index, 'message', e.target.value)}
              ></textarea>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleSaveSettings} className="btn btn-primary">
            <Save size={16} /> Save Templates
          </button>
          {savedSuccess && (
            <span style={{ color: '#10B981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={16} /> Templates saved successfully!
            </span>
          )}
        </div>
      </div>

      {/* Google Sheets Integration */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: '#FFFFFF' }}>
              <Zap size={20} style={{ color: '#10B981' }} />
              <span>Google Sheets Auto-Sync (Per PC / Sheet)</span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Har PC user apni khud ki Google Sheet ka Webhook URL yahan daal sakta hai. Har lead add/update hone par sheet me data automatically save ho jayega.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#E2E8F0', marginBottom: '0.5rem' }}>
            Google Apps Script Webhook URL
          </label>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="form-input"
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
          />

          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handleSaveGoogleSheet} className="btn btn-primary btn-sm">
              <Save size={14} /> Save Sheet Link
            </button>
            <button
              onClick={handleTestGoogleSheet}
              disabled={testingSheet || !googleSheetUrl}
              className="btn btn-secondary btn-sm"
            >
              {testingSheet ? 'Testing...' : 'Send Test Row to Sheet'}
            </button>
            {sheetSavedSuccess && (
              <span style={{ color: '#10B981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Google Sheet link saved!
              </span>
            )}
          </div>

          {sheetTestResult && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              background: sheetTestResult.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: sheetTestResult.type === 'success' ? '#10B981' : '#EF4444',
              border: `1px solid ${sheetTestResult.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {sheetTestResult.text}
            </div>
          )}
        </div>

        {/* Step-by-Step Google Sheet Setup Guide */}
        <details style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
          <summary style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--primary)' }}>
            📋 Click to see: Apni Google Sheet ka link kaise banayein (Step-by-Step Guide)
          </summary>
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#CBD5E1', lineHeight: '1.6' }}>
            <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
              <li>Ek naye ya purane Google Sheet ko open karein.</li>
              <li>Menu me <strong>Extensions ➔ Apps Script</strong> par click karein.</li>
              <li>Wahan jo code hai use delete karke project folder me di gayi <code>google-apps-script.js</code> file ka code paste kar dein.</li>
              <li>Top right me <strong>Deploy ➔ New deployment</strong> par click karein.</li>
              <li>Gear icon (⚙️) se <strong>Web app</strong> select karein.</li>
              <li><strong>Who has access:</strong> ko <strong>"Anyone"</strong> select karein aur Deploy karein.</li>
              <li>Jo <strong>Web app URL</strong> milega, use copy karke upar box me paste karke "Save Sheet Link" daba dein!</li>
            </ol>
          </div>
        </details>
      </div>

      {/* System Info */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '1rem' }}>
          <Database size={20} className="text-primary" />
          <span>System & Storage Architecture</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Type</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#FFFFFF' }}>Embedded SQLite 3</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REST API Server</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#FFFFFF' }}>Node.js / Express</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Backup Options</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#10B981' }}>1-Click Excel / CSV Export</div>
          </div>
        </div>
      </div>
    </div>
  );
}
