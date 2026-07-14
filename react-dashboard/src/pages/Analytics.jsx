import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { ChartPieSlice, DownloadSimple } from '@phosphor-icons/react';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function Analytics() {
  
  // Dummy data for Line Chart (Disease Trends)
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        fill: true,
        label: 'Dengue Cases',
        data: [65, 59, 80, 81, 56, 55, 40],
        borderColor: 'rgba(6, 182, 212, 1)',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        tension: 0.4
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#f8fafc' } },
      title: { display: true, text: 'Monthly Disease Trend (Superset Data)', color: '#94a3b8' }
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
    }
  };

  // Dummy data for Bar Chart (Resource Allocation)
  const barData = {
    labels: ['Coimbatore', 'Chennai', 'Madurai', 'Salem', 'Trichy'],
    datasets: [
      {
        label: 'Medical Kits Distributed',
        data: [120, 190, 80, 50, 70],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      }
    ]
  };
  
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#f8fafc' } },
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
    }
  };

  return (
    <div className="module-view">
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Reports & Analytics</h2>
          <p className="subtitle">Real-time insights using Apache Superset and ChartJS.</p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.05)' }}>
          <DownloadSimple /> Export PDF
        </button>
      </header>

      <div className="grid-2">
        <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Disease Trends</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Resource Allocation</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>
      
      <div className="glass-panel mt-4">
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Key Metrics Summary</h3>
        <div className="grid-2">
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Cases (YTD)</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>12,450</div>
          </div>
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Active Outbreak Alerts</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--danger-red)' }}>3</div>
          </div>
        </div>
      </div>
    </div>
  );
}
