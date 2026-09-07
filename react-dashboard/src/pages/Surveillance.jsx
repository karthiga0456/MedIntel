import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  WarningCircle, 
  PlusCircle, 
  Buildings, 
  TrendUp, 
  Pulse, 
  CheckCircle,
  X,
  Funnel
} from '@phosphor-icons/react';
import { api } from '../services/api';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

export default function Surveillance() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for reporting a new case
  const [formData, setFormData] = useState({
    disease: 'Dengue Fever',
    village: 'Alandurai',
    case_count: 1,
    severity: 'moderate',
    patient_id: '',
    notes: ''
  });

  const loadSurveillanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.surveillance.getSummary();
      setSummary(res);
    } catch (err) {
      console.error('Failed to load surveillance summary:', err);
      setError(err.message || 'Error fetching surveillance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveillanceData();
  }, []);

  const handleReportCase = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.surveillance.reportCase({
        ...formData,
        case_count: parseInt(formData.case_count, 10) || 1,
        patient_id: formData.patient_id.trim() || undefined,
        notes: formData.notes.trim() || undefined
      });
      setShowModal(false);
      setFormData({
        disease: 'Dengue Fever',
        village: 'Alandurai',
        case_count: 1,
        severity: 'moderate',
        patient_id: '',
        notes: ''
      });
      await loadSurveillanceData();
    } catch (err) {
      alert(`Case reporting failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Trend Chart Data
  const trendLabels = summary?.time_series_trend?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const trendValues = summary?.time_series_trend?.data || [0, 0, 0, 0, 0, 0, 0];

  const lineChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Incident Cases',
        data: trendValues,
        fill: true,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        tension: 0.35,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#38bdf8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: { 
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { color: '#94a3b8', font: { size: 11 } } 
      },
      x: { 
        grid: { color: 'rgba(255,255,255,0.05)' }, 
        ticks: { color: '#94a3b8', font: { size: 11 } } 
      }
    }
  };

  // Disease Breakdown Doughnut Data
  const breakdownKeys = Object.keys(summary?.disease_breakdown || {});
  const breakdownValues = Object.values(summary?.disease_breakdown || {});

  const doughnutData = {
    labels: breakdownKeys.length > 0 ? breakdownKeys : ['No cases reported'],
    datasets: [
      {
        data: breakdownValues.length > 0 ? breakdownValues : [1],
        backgroundColor: [
          'rgba(239, 68, 68, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(6, 182, 212, 0.85)',
          'rgba(168, 85, 247, 0.85)',
          'rgba(16, 185, 129, 0.85)'
        ],
        borderWidth: 2,
        borderColor: '#0b1329'
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#cbd5e1', font: { size: 12 }, boxWidth: 14 }
      }
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'OUTBREAK':
        return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>OUTBREAK ALERT</span>;
      case 'WATCH':
        return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>WATCHLIST</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>NORMAL</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Pulse size={24} weight="bold" color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Epidemiological Disease Surveillance</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Real-time village case telemetry, cluster anomalies, and threshold early warning system
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <PlusCircle size={18} weight="bold" />
          Report Disease Case
        </button>
      </div>

      {/* Anomaly Banners */}
      {summary?.anomalies_detected && summary.anomalies_detected.length > 0 && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.15)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          borderRadius: '12px', 
          padding: '16px 20px', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <WarningCircle size={28} weight="fill" color="#f87171" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#fca5a5', fontSize: '14px' }}>
              High-Risk Epidemiological Anomaly Detected
            </div>
            <div style={{ color: '#fecaca', fontSize: '13px', marginTop: '2px' }}>
              {summary.anomalies_detected.map((a, idx) => (
                <span key={idx} style={{ marginRight: '16px' }}>
                  • <strong>{a.village || 'Region'}</strong>: {a.message || 'Spike in reported case velocities exceeding moving baseline.'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div className="card glass" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>TOTAL CASES LOGGED</span>
            <Pulse size={20} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {loading ? '...' : (summary?.total_cases_all_time ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Historical aggregate across all zones
          </div>
        </div>

        <div className="card glass" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>CASES (PAST 7 DAYS)</span>
            <TrendUp size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fbbf24' }}>
            {loading ? '...' : (summary?.cases_last_7_days ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Rolling weekly surveillance index
          </div>
        </div>

        <div className="card glass" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>ACTIVE OUTBREAK CLUSTERS</span>
            <WarningCircle size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f87171' }}>
            {loading ? '...' : (summary?.active_outbreak_clusters ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Hotspots currently requiring intervention
          </div>
        </div>

        <div className="card glass" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>VILLAGES MONITORED</span>
            <Buildings size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#34d399' }}>
            {loading ? '...' : (summary?.village_statistics?.length ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Active rural PHC surveillance nodes
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Time-Series Line */}
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pulse size={18} color="#06b6d4" />
            7-Day Surveillance Velocity Trend
          </h3>
          <div style={{ height: '240px' }}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Disease Breakdown */}
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pulse size={18} color="#f59e0b" />
            Disease Distribution Profile
          </h3>
          <div style={{ height: '240px' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Village Surveillance Table */}
      <div className="card glass" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Buildings size={18} color="#3b82f6" />
            Village Surveillance Status Matrix
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Updated in real-time from worker reports
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>VILLAGE</th>
                <th style={{ padding: '12px 16px' }}>DOMINANT DISEASE</th>
                <th style={{ padding: '12px 16px' }}>TOTAL REPORTED</th>
                <th style={{ padding: '12px 16px' }}>EPIDEMIOLOGICAL STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Loading surveillance nodes...
                  </td>
                </tr>
              ) : summary?.village_statistics?.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No village surveillance cases logged yet.
                  </td>
                </tr>
              ) : (
                summary?.village_statistics?.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.village}</td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8' }}>{v.top_disease || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.total_cases}</td>
                    <td style={{ padding: '12px 16px' }}>{getRiskBadge(v.risk_status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Report Disease Case */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass card" style={{ maxWidth: '500px', width: '100%', padding: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pulse size={20} color="#06b6d4" />
                Report Disease Case
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReportCase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  DISEASE / INFECTION *
                </label>
                <select 
                  className="input-field" 
                  value={formData.disease} 
                  onChange={(e) => setFormData({ ...formData, disease: e.target.value })}
                  required
                >
                  <option value="Dengue Fever">Dengue Fever</option>
                  <option value="Malaria">Malaria</option>
                  <option value="Chikungunya">Chikungunya</option>
                  <option value="Typhoid">Typhoid</option>
                  <option value="Cholera / Acute Diarrhea">Cholera / Acute Diarrhea</option>
                  <option value="Influenza A (H1N1)">Influenza A (H1N1)</option>
                  <option value="Tuberculosis">Tuberculosis</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    VILLAGE / REGION *
                  </label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    NUMBER OF CASES *
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    className="input-field"
                    value={formData.case_count}
                    onChange={(e) => setFormData({ ...formData, case_count: e.target.value })}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    SEVERITY
                  </label>
                  <select 
                    className="input-field"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    PATIENT ID (OPTIONAL)
                  </label>
                  <input 
                    type="text" 
                    placeholder="UHID-..." 
                    className="input-field"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CLINICAL NOTES / SYMPTOMS
                </label>
                <textarea 
                  rows="3" 
                  className="input-field"
                  placeholder="High fever, thrombocytopenia, joint pain..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Transmitting Case...' : 'Submit to Surveillance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
