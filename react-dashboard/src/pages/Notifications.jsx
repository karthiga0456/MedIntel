import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Siren, 
  WarningCircle, 
  CalendarCheck, 
  Info, 
  Check, 
  CheckCircle,
  Funnel
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.notifications.list();
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toUpperCase()) {
      case 'EMERGENCY':
        return <Siren size={20} weight="fill" color="#ef4444" />;
      case 'OUTBREAK':
        return <WarningCircle size={20} weight="fill" color="#f59e0b" />;
      case 'REMINDER':
        return <CalendarCheck size={20} weight="fill" color="#06b6d4" />;
      default:
        return <Info size={20} weight="fill" color="#3b82f6" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true;
    return n.category?.toUpperCase() === activeTab;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={24} weight="bold" color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Notification Broadcasts</h1>
              {unreadCount > 0 && (
                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              System-wide alerts, outbreak early warnings, and patient care reminders
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px' }}
          >
            <CheckCircle size={16} />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['ALL', 'EMERGENCY', 'OUTBREAK', 'REMINDER', 'SYSTEM'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: activeTab === tab ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.06)',
              background: activeTab === tab ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.03)',
              color: activeTab === tab ? '#38bdf8' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading alerts & broadcasts...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="card glass" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No notifications found in this category.
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id}
              className="card glass"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                borderLeft: n.is_read ? '3px solid transparent' : '3px solid #06b6d4',
                background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(6, 182, 212, 0.05)',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {getCategoryIcon(n.category)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: n.is_read ? '#cbd5e1' : '#f8fafc' }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: n.is_read ? 'var(--text-muted)' : '#e2e8f0', lineHeight: 1.5 }}>
                  {n.message}
                </p>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  title="Mark as read"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                >
                  <Check size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
