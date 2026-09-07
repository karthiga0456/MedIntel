import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadSimple,
  CheckCircle,
  WarningCircle,
  ChartLine,
  User,
  ShieldCheck,
  TrendUp,
} from '@phosphor-icons/react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { api } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Labs() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [file, setFile] = useState(null);
  const [testType, setTestType] = useState('Complete Blood Count (CBC)');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [history, setHistory] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'history'

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await api.patients.list({ size: 50 });
        setPatients(data.items || []);
        if (data.items && data.items.length > 0) {
          setSelectedPatientId(data.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients for labs:', err);
      }
    };
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadHistory(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadHistory = async (patientId) => {
    try {
      const data = await api.labs.getPatientHistory(patientId);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load lab history:', err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedPatientId) {
      alert('Please select both a patient and a lab report document.');
      return;
    }

    setAnalyzing(true);
    setCurrentReport(null);
    try {
      const result = await api.labs.uploadReport(file, selectedPatientId, testType);
      setCurrentReport(result);
      loadHistory(selectedPatientId);
    } catch (err) {
      alert('Lab analysis failed: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', label: 'CRITICAL' };
      case 'HIGH':
        return { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', label: 'HIGH' };
      case 'LOW':
        return { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', label: 'LOW' };
      default:
        return { bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', label: 'NORMAL' };
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Lab Report Analyzer & Biomarker Surveillance</h2>
        <p className="subtitle">
          AI-assisted lab test extraction, reference interval classification, and longitudinal biomarker tracking.
        </p>
      </header>

      {/* Patient Selector */}
      <div className="glass-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <User size={20} color="#60a5fa" />
        <label style={{ fontWeight: 600, fontSize: '14px' }}>Select Patient:</label>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          style={{ maxWidth: '350px', padding: '8px 12px', fontSize: '14px' }}
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.uhid} • {p.village})
            </option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            className={activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('upload')}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            Upload Report
          </button>
          <button
            className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('history')}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            Biomarker Trends & History
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Upload Form */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadSimple size={20} color="#38bdf8" /> Upload Medical Lab Report
            </h3>
            <form onSubmit={handleUploadSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Report Panel / Category</label>
                <select value={testType} onChange={(e) => setTestType(e.target.value)}>
                  <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                  <option value="Blood Glucose & HbA1c">Blood Glucose & HbA1c</option>
                  <option value="Lipid Profile">Lipid Profile</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  <option value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</option>
                  <option value="Thyroid Profile">Thyroid Profile (TSH)</option>
                  <option value="Urine Analysis">Urine Analysis</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Report File (PDF or Image)</label>
                <div
                  style={{
                    border: '2px dashed rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('lab-file-input').click()}
                >
                  <FileText size={40} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                    {file ? file.name : 'Click to select or drop lab report (PDF/PNG/JPG)'}
                  </p>
                  <input
                    id="lab-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={analyzing || !file}
                style={{ width: '100%', padding: '12px' }}
              >
                {analyzing ? 'Extracting & Analyzing Biomarkers...' : 'Analyze Lab Report'}
              </button>
            </form>
          </div>

          {/* Analysis Results View */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#10b981" /> Extracted Clinical Biomarkers
            </h3>

            {!currentReport ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                <p>Upload a lab report on the left to extract and view biomarker values.</p>
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: '16px', fontSize: '13px', lineHeight: '1.5' }}>
                  <strong>Summary: </strong> {currentReport.summary}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 12px' }}>Test Parameter</th>
                        <th style={{ padding: '8px 12px' }}>Value</th>
                        <th style={{ padding: '8px 12px' }}>Reference Range</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentReport.results.map((res, i) => {
                        const badge = getStatusBadge(res.status);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{res.test_name}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              {res.value} {res.unit}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{res.reference_range}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 700,
                                  backgroundColor: badge.bg,
                                  color: badge.color,
                                }}
                              >
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  {currentReport.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Historical Trends View */
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChartLine size={20} color="#818cf8" /> Longitudinal Biomarker Charts
          </h3>

          {!history || !history.reports || history.reports.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '30px 0' }}>No previous lab reports archived for this patient.</p>
          ) : (
            <div>
              {/* Render charts for available biomarkers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {Object.entries(history.biomarker_trends || {}).slice(0, 4).map(([testName, dataPoints]) => {
                  const chartData = {
                    labels: dataPoints.map((d) => d.date),
                    datasets: [
                      {
                        label: `${testName} (${dataPoints[0]?.unit || ''})`,
                        data: dataPoints.map((d) => d.value),
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.2)',
                        tension: 0.3,
                        pointRadius: 5,
                      },
                    ],
                  };

                  return (
                    <div
                      key={testName}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{testName} Trend</h4>
                      <div style={{ height: '200px' }}>
                        <Line
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                            },
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
