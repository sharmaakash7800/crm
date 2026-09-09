import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, DollarSign, Award, Target, PieChart as PieIcon,
  BarChart3, Activity, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { api } from '../api';

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981', '#EF4444', '#EC4899', '#6366F1'];

export default function AnalyticsView({ onSelectLead }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.getAnalytics();
        if (res.success) {
          setAnalytics(res);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading business metrics and charts...
      </div>
    );
  }

  const { metrics, statusData, sourceData, recentActivities } = analytics;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top High-Impact KPIs */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box metric-icon-blue">
            <Users size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Total Leads</span>
            <span className="metric-value">{metrics.totalLeads}</span>
            <span className="metric-sub">{metrics.inProgressCount} active in pipeline</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box metric-icon-green">
            <DollarSign size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Total Pipeline Value</span>
            <span className="metric-value">₹{(metrics.totalPipelineValue || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">Across all leads</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box metric-icon-purple">
            <Award size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Won Revenue</span>
            <span className="metric-value" style={{ color: '#34D399' }}>₹{(metrics.wonValue || 0).toLocaleString('en-IN')}</span>
            <span className="metric-sub">{metrics.wonCount} closed deals</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box metric-icon-amber">
            <Target size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Win Conversion Rate</span>
            <span className="metric-value">{metrics.winRate}%</span>
            <span className="metric-sub">Won / Total leads</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Stage Funnel Bar Chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontWeight: '700', fontSize: '1rem' }}>
            <BarChart3 size={18} className="text-primary" />
            <span>Leads by Pipeline Stage</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  formatter={(val, name) => [val, 'Leads']}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Pie Chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontWeight: '700', fontSize: '1rem' }}>
            <PieIcon size={18} className="text-primary" />
            <span>Leads by Acquisition Source</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: '700', fontSize: '1rem' }}>
          <Activity size={18} className="text-primary" />
          <span>Recent Lead Activities & Updates</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }}></div>
                  <div>
                    <span
                      onClick={() => onSelectLead(act.lead_id)}
                      style={{ fontWeight: '600', color: '#60A5FA', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {act.lead_name}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                      {act.title}
                    </span>
                    {act.details && (
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {act.details}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity records.</p>
          )}
        </div>
      </div>
    </div>
  );
}
