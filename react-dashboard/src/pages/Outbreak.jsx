import React, { useState } from 'react';
import { MapPin, Virus, CaretDown, ChartBar, Target, TrendUp, WarningCircle } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Outbreak() {
  const [region, setRegion] = useState('');
  const [disease, setDisease] = useState('dengue');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handlePredict = async () => {
    if (!region) return;
    setLoading(true);
    setResult(null);

    try {
      const data = await api.outbreak.predict(region, disease);
      setResult({
        risk_level: data.risk_level || 'unknown',
        predicted_cases_next_7_days: data.predicted_cases_next_7_days || 0
      });
    } catch (error) {
      setResult({ risk_level: 'error', predicted_cases_next_7_days: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Outbreak Prediction Engine</h2>
        <p className="subtitle">AI-driven risk classification using LSTM & XGBoost.</p>
      </header>
      
      <div className="glass-panel">
        <div className="grid-2">
          <div className="form-group">
            <label>Region / District</label>
            <div className="input-icon-wrapper">
              <MapPin />
              <input 
                type="text" 
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Coimbatore" 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Disease</label>
            <div className="input-icon-wrapper select-wrapper">
              <Virus />
              <select value={disease} onChange={(e) => setDisease(e.target.value)}>
                <option value="dengue">Dengue</option>
                <option value="malaria">Malaria</option>
                <option value="cholera">Cholera</option>
              </select>
              <CaretDown className="dropdown-icon" />
            </div>
          </div>
        </div>
        
        <button className="btn-primary btn-full mt-4" onClick={handlePredict}>
          <ChartBar /> Run Prediction Model
        </button>
        
        <div className={`response-box mt-4 ${result ? 'has-data' : ''}`}>
          {loading ? (
            <div className="empty-state">
              <i className="ph ph-spinner ph-spin"></i>
              <span>Analyzing epidemiological data models...</span>
            </div>
          ) : result ? (
            <>
              <div style={{ marginBottom: '12px', fontSize: '16px' }}>
                <strong>Risk Level:</strong>{' '}
                <span className={`pill ${result.risk_level === 'high' ? 'high' : ''}`}>
                  {result.risk_level}
                </span>
              </div>
              <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                <TrendUp style={{ color: 'var(--accent-cyan)', marginRight: '6px' }} />
                <strong>Predicted Cases (Next 7 Days):</strong> <span style={{ fontSize: '18px', fontWeight: 600 }}>{result.predicted_cases_next_7_days}</span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Target />
              <span>Prediction results will appear here...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
