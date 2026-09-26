import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { DownloadSimple, TrendUp, WarningCircle } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function ChartSkeleton() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton skeleton-title" style={{ width: '40%' }} />
      <div className="skeleton" style={{ flex: 1, borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}

export default function Analytics() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summary = await api.analytics.getSummary();
        setData(summary);
      } catch (error) {
        console.error("Failed to load analytics", error);
        toast.error('Failed to load analytics data. Please try again.', 'Data Error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const lineData = {
    labels: data?.disease_trends?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        fill: true,
        label: 'Dengue Cases',
        data: data?.disease_trends?.data || [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgba(6, 182, 212, 1)',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(6, 182, 212, 1)',
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-secondary)' } },
      title: { display: false }
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'var(--text-muted)' } },
      x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'var(--text-muted)' } }
    }
  };

  const barData = {
    labels: data?.resource_allocation?.labels || ['Coimbatore', 'Chennai', 'Madurai', 'Salem', 'Trichy'],
    datasets: [
      {
        label: 'Medical Kits Distributed',
        data: data?.resource_allocation?.data || [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderRadius: 4,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-secondary)' } },
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'var(--text-muted)' } },
      x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'var(--text-muted)' } }
    }
  };

  return (
    <div className="module-view">
      <header className="module-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Reports & Analytics</h2>
          <p className="subtitle">Real-time health insights and resource tracking.</p>
        </div>
        <button className="btn-secondary" style={{ flexShrink: 0 }}>
          <DownloadSimple size={16} /> Export PDF
        </button>
      </header>

      {/* KPI Summary */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', color: 'var(--text-secondary)' }}>
          Key Metrics Summary
        </h3>
        <div className="grid-2">
          <div className="stat-card" style={{ '--stat-accent': 'var(--accent-cyan)' }}>
            <div className="stat-label">Total Cases (YTD)</div>
            {loading ? (
              <div className="skeleton skeleton-text lg" style={{ width: '80px', marginTop: '4px' }} />
            ) : (
              <div className="stat-value">{data?.total_cases_ytd?.toLocaleString() || 0}</div>
            )}
            <div className="stat-trend up" style={{ marginTop: '4px' }}>
              <TrendUp size={13} weight="bold" /> <span>+12% vs last year</span>
            </div>
          </div>
          <div className="stat-card" style={{ '--stat-accent': 'var(--danger-red)' }}>
            <div className="stat-label">Active Outbreak Alerts</div>
            {loading ? (
              <div className="skeleton skeleton-text lg" style={{ width: '60px', marginTop: '4px' }} />
            ) : (
              <div className="stat-value">{data?.active_outbreak_alerts || 0}</div>
            )}
            <div className="stat-trend down" style={{ marginTop: '4px' }}>
              <WarningCircle size={13} weight="bold" /> <span>Requires attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="glass-panel" style={{ height: '420px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <>
              <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Monthly Disease Trend
              </h3>
              <div style={{ flex: 1, position: 'relative' }}>
                <Line data={lineData} options={lineOptions} />
              </div>
            </>
          )}
        </div>

        <div className="glass-panel" style={{ height: '420px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <>
              <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Resource Allocation
              </h3>
              <div style={{ flex: 1, position: 'relative' }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
