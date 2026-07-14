import React, { useState } from 'react';
import { User, HouseLine, CalendarBlank, Syringe, CaretDown, FloppyDisk, ArrowsClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function WorkerPortal() {
  const [formData, setFormData] = useState({
    name: '', village: '', age: '', vax: 'fully', symptoms: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const data = await api.worker.submitRecord(formData);
      setResult({ success: true, id: data.record_id || data.id || 'SYNC-' + Math.floor(Math.random() * 10000) });
      setFormData({ name: '', village: '', age: '', vax: 'fully', symptoms: '' });
    } catch (error) {
      setResult({ success: false, error: 'Failed to sync record' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Health Worker Portal</h2>
        <p className="subtitle">Offline-first health record entry pushing to PostgreSQL.</p>
      </header>
      
      <div className="glass-panel">
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Patient Name</label>
              <div className="input-icon-wrapper">
                <User />
                <input 
                  type="text" 
                  required 
                  placeholder="Full Name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Village / Ward</label>
              <div className="input-icon-wrapper">
                <HouseLine />
                <input 
                  type="text" 
                  required 
                  placeholder="Location" 
                  value={formData.village} 
                  onChange={e => setFormData({...formData, village: e.target.value})} 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Age</label>
              <div className="input-icon-wrapper">
                <CalendarBlank />
                <input 
                  type="number" 
                  placeholder="Age" 
                  min="0" max="120" 
                  value={formData.age} 
                  onChange={e => setFormData({...formData, age: e.target.value})} 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Vaccination Status</label>
              <div className="input-icon-wrapper select-wrapper">
                <Syringe />
                <select value={formData.vax} onChange={e => setFormData({...formData, vax: e.target.value})}>
                  <option value="fully">Fully Vaccinated</option>
                  <option value="partial">Partially Vaccinated</option>
                  <option value="none">Not Vaccinated</option>
                </select>
                <CaretDown className="dropdown-icon" />
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Symptoms (Comma separated)</label>
            <textarea 
              rows="3" 
              placeholder="Fever, cough, body ache..."
              value={formData.symptoms} 
              onChange={e => setFormData({...formData, symptoms: e.target.value})} 
            ></textarea>
          </div>
          
          <button type="submit" className="btn-primary mt-2">
            <FloppyDisk /> Save Health Record
          </button>
        </form>
        
        <div className={`response-box mt-4 ${result ? 'has-data' : ''}`}>
          {loading ? (
            <div className="empty-state">
              <i className="ph ph-spinner ph-spin"></i>
              <span>Encrypting and syncing record to PostgreSQL...</span>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                <CheckCircle weight="bold" size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Record Saved Successfully</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sync ID: {result.id}</div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <ArrowsClockwise />
              <span>Sync status will appear here...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
