import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Bell, Pill, Robot, Siren, MapPin,
  ArrowRight, TrendUp, CheckCircle, Warning,
  ChartPieSlice, ShieldCheck
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function StatCard({ label, value, accent, icon: Icon, trend, trendLabel, loading }) {
  return (
    <div className="stat-card" style={{ '--stat-accent': accent }}>
      {Icon && (
        <div className="stat-icon">
          <Icon size={48} weight="fill" />
        </div>
      )}
      <div className="stat-label">{label}</div>
      {loading ? (
        <div className="skeleton skeleton-text lg" style={{ width: '60px', marginTop: '4px' }} />
      ) : (
        <div className="stat-value">{value}</div>
      )}
      {trendLabel && (
        <div className={'stat-trend ' + (trend || 'neutral')} style={{ marginTop: '8px' }}>
          {trend === 'up' && <TrendUp size={14} weight="bold" />}
          {trend === 'down' && <TrendUp size={14} weight="bold" style={{ transform: 'rotate(180deg)' }} />}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'AI Health Assistant', desc: 'Ask medical questions, get health info', to: '/dashboard/assistant', icon: Robot, color: 'var(--accent-cyan)' },
  { label: 'Drug Interaction Check', desc: 'Check medicine safety and interactions', to: '/dashboard/medicines', icon: Pill, color: 'var(--accent-violet)' },
  { label: 'Find Nearby Hospitals', desc: 'Locate clinics and pharmacies near you', to: '/dashboard/nearby-hospitals', icon: MapPin, color: 'var(--success-green)' },
  { label: 'Notification Broadcasts', desc: 'System alerts and health advisories', to: '/dashboard/notifications', icon: Bell, color: 'var(--warning-yellow)' },
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
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const userName = currentUser?.email?.split('@')[0].toUpperCase() || 'USER';

  return (
    <div className="module-view">
      {/* Cyber Hero Section */}
      <div className="glass-panel" style={{ 
        padding: '60px 40px', 
        backgroundImage: `linear-gradient(90deg, rgba(5,7,13,0.95) 0%, rgba(13,17,28,0.7) 60%, rgba(0,240,255,0.1) 100%), url('/medical_ai.jpg')`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center right',
        borderColor: 'rgba(0,240,255,0.3)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,240,255,0.15)'
      }}>
        {/* Subtle animated visual element */}
        <div style={{ position: 'absolute', top: '10%', right: '2%', opacity: 0.2, pointerEvents: 'none', animation: 'spin 20s linear infinite' }}>
          <Robot size={320} color="rgba(0,240,255,0.2)" weight="thin" />
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '2px', fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            {greeting}, {userName}
          </h2>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: '#fff', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '16px', lineHeight: 1.1 }}>
            NEXUS COMMAND CENTER
          </h1>
          <p className="subtitle" style={{ fontSize: '16px', maxWidth: '480px', marginBottom: '24px', letterSpacing: '0.5px' }}>
            Your AI-powered intelligence platform is running at optimal capacity. All systems are currently operational and monitoring data streams.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <span className="dot pulse" style={{ backgroundColor: 'var(--success-green)', width: '10px', height: '10px' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success-green)', letterSpacing: '1.5px', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>ALL SYSTEMS OPERATIONAL</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {isAdmin ? (
              <>
                <button className="btn-primary" onClick={() => navigate('/dashboard/analytics')}>
                  <ChartPieSlice weight="bold" size={18} /> View Analytics
                </button>
                <button className="btn-secondary" onClick={() => navigate('/dashboard/patients')}>
                  Explore Data
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => navigate('/dashboard/assistant')}>
                  <Robot weight="bold" size={18} /> Launch AI Assistant
                </button>
                <button className="btn-secondary" onClick={() => navigate('/dashboard/medicines')}>
                  Explore Formulary
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-kpi">
        {isAdmin && (
          <StatCard
            label="Registry Size"
            value={stats.patients !== null ? stats.patients.toLocaleString() : '—'}
            accent="var(--accent-cyan)"
            icon={Users}
            loading={loadingStats}
            trendLabel="Targeting stability"
            trend="neutral"
          />
        )}
        <StatCard
          label="Active Alerts"
          value={stats.notifications !== null ? stats.notifications : '—'}
          accent={stats.notifications > 0 ? 'var(--danger-red)' : 'var(--success-green)'}
          icon={Bell}
          loading={loadingStats}
          trendLabel={stats.notifications > 0 ? 'Priority review' : 'Systems nominal'}
          trend={stats.notifications > 0 ? 'down' : 'up'}
        />
        <StatCard
          label="Neural Core"
          value="Online"
          accent="var(--accent-violet)"
          icon={Robot}
          loading={false}
          trendLabel="LLaMA3-70b Active"
          trend="neutral"
        />
        <StatCard
          label="Clearance"
          value={isAdmin ? 'Lvl-5' : 'Lvl-1'}
          accent="var(--warning-yellow)"
          icon={isAdmin ? ShieldCheck : CheckCircle}
          loading={false}
          trendLabel={isAdmin ? 'Full access granted' : 'Standard protocols'}
          trend="neutral"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '16px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Available Modules
        </h3>
        <div className="grid-2">
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.to}
              className="glass-panel card-interactive"
              style={{ padding: '20px 24px', cursor: 'pointer', borderLeft: '3px solid ' + action.color }}
              onClick={() => navigate(action.to)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(action.to)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '4px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid ' + action.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: 'inset 0 0 10px ' + action.color + '40'
                }}>
                  <action.icon size={22} color={action.color} weight="duotone" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px', fontFamily: 'var(--font-heading)', letterSpacing: '0.5px' }}>
                    {action.label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {action.desc}
                  </div>
                </div>
                <ArrowRight size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
