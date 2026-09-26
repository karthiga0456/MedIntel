import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Bell, Pill, Robot, Siren, MapPin,
  ArrowRight, TrendUp, CheckCircle, Warning,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function StatCard({ label, value, accent, icon: Icon, trend, trendLabel, loading }) {
  return (
    <div className="stat-card" style={{ '--stat-accent': accent }}>
      {Icon && (
        <div className="stat-icon">
          <Icon size={48} weight="fill" color={accent} />
        </div>
      )}
      <div className="stat-label">{label}</div>
      {loading ? (
        <div className="skeleton skeleton-text lg" style={{ width: '60px', marginTop: '4px' }} />
      ) : (
        <div className="stat-value">{value}</div>
      )}
      {trendLabel && (
        <div className={'stat-trend ' + (trend || 'neutral')} style={{ marginTop: '4px' }}>
          {trend === 'up' && <TrendUp size={13} weight="bold" />}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'AI Health Assistant', desc: 'Ask medical questions, get health info', to: '/dashboard/assistant', icon: Robot, color: 'var(--accent-cyan)' },
  { label: 'Drug Interaction Check', desc: 'Check medicine safety and interactions', to: '/dashboard/medicines', icon: Pill, color: '#a78bfa' },
  { label: 'Find Nearby Hospitals', desc: 'Locate clinics and pharmacies near you', to: '/dashboard/nearby-hospitals', icon: MapPin, color: '#34d399' },
  { label: 'Notification Broadcasts', desc: 'System alerts and health advisories', to: '/dashboard/notifications', icon: Bell, color: '#fbbf24' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [stats, setStats] = useState({ patients: null, notifications: null, systemOk: null });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [patientsRes, notifRes] = await Promise.allSettled([
          isAdmin ? api.patients.list({ size: 1 }) : Promise.resolve(null),
          api.notifications.list(),
        ]);
        setStats({
          patients: patientsRes.status === 'fulfilled' && patientsRes.value ? (patientsRes.value.total || 0) : null,
          notifications: notifRes.status === 'fulfilled' ? (notifRes.value?.unread_count || 0) : 0,
          systemOk: true,
        });
      } catch (_) {
        setStats(prev => ({ ...prev, systemOk: false }));
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, [isAdmin]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = currentUser?.email?.split('@')[0] || 'User';

  return (
    <div className="module-view">
      {/* Welcome header */}
      <div className="glass-panel" style={{ padding: '24px 28px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.08) 100%)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
              {greeting}, {userName} 👋
            </h2>
            <p className="subtitle">
              Welcome to MedIntel — your intelligent public health command centre.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 14px', borderRadius: 'var(--radius-full)',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
              fontSize: '13px', fontWeight: 600, color: '#34d399',
            }}>
              <CheckCircle size={14} weight="fill" />
              All Systems Operational
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-kpi">
        {isAdmin && (
          <StatCard
            label="Total Patients"
            value={stats.patients !== null ? stats.patients.toLocaleString() : '—'}
            accent="var(--accent-cyan)"
            icon={Users}
            loading={loadingStats}
            trendLabel="In registry"
            trend="neutral"
          />
        )}
        <StatCard
          label="Unread Alerts"
          value={stats.notifications !== null ? stats.notifications : '—'}
          accent={stats.notifications > 0 ? 'var(--danger-red)' : 'var(--accent-green)'}
          icon={Bell}
          loading={loadingStats}
          trendLabel={stats.notifications > 0 ? 'Needs attention' : 'All clear'}
          trend={stats.notifications > 0 ? 'down' : 'up'}
        />
        <StatCard
          label="AI Provider"
          value="Groq"
          accent="var(--accent-purple)"
          icon={Robot}
          loading={false}
          trendLabel="llama3-70b-8192"
          trend="neutral"
        />
        <StatCard
          label="System Mode"
          value={isAdmin ? 'Admin' : 'Staff'}
          accent="var(--accent-yellow)"
          icon={isAdmin ? Siren : CheckCircle}
          loading={false}
          trendLabel={isAdmin ? 'Full access' : 'Core modules'}
          trend="neutral"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
          Quick Actions
        </h3>
        <div className="grid-2">
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.to}
              className="glass-panel card-interactive"
              style={{ padding: '18px 20px', cursor: 'pointer' }}
              onClick={() => navigate(action.to)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(action.to)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                  background: action.color + '18',
                  border: '1px solid ' + action.color + '30',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <action.icon size={20} color={action.color} weight="duotone" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {action.label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {action.desc}
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin shortcuts */}
      {isAdmin && (
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
            Administration
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { label: 'Patient Registry', to: '/dashboard/patients', color: 'var(--accent-cyan)' },
              { label: 'Emergency Triage', to: '/dashboard/emergency', color: 'var(--danger-red)' },
              { label: 'Reports & Analytics', to: '/dashboard/analytics', color: 'var(--accent-green)' },
              { label: 'Admin Panel', to: '/dashboard/admin', color: 'var(--accent-yellow)' },
            ].map(item => (
              <button
                key={item.to}
                className="btn-secondary btn-sm"
                onClick={() => navigate(item.to)}
                style={{ borderColor: item.color + '30', color: item.color }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
