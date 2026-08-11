import React, { useState, useEffect } from 'react';
import { User, HouseLine, CalendarBlank, Syringe, CaretDown, FloppyDisk, ArrowsClockwise, CheckCircle, WarningCircle, CloudSlash } from '@phosphor-icons/react';
import { api } from '../services/api';
import { offlineSync } from '../services/offlineSync';

export default function WorkerPortal() {
  const [formData, setFormData] = useState({
    patient_name: '', village: '', age: '', vaccination_status: 'fully_vaccinated', symptoms: '',
    worker_id: 'worker-demo-001'  // In production this comes from the authenticated session
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setResult(null); // Clear previous results to show syncing state
      await offlineSync.syncQueue();
      // Wait a moment before clearing UI state if needed, or we can just fetch list
    };
    
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check to push anything pending if started online
    if (navigator.onLine) {
      offlineSync.syncQueue();
    }

    return () => {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        patient_name: formData.patient_name,
        village: formData.village,
        age: formData.age ? parseInt(formData.age, 10) : null,
        vaccination_status: formData.vaccination_status,
        symptoms: formData.symptoms,
        worker_id: formData.worker_id,
      };
      if (!navigator.onLine) {
        // Offline Flow
        const queuedItem = await offlineSync.queueRecord(payload);
        setResult({ success: true, offline: true, id: queuedItem._queue_id });
      } else {
        // Online Flow
        const data = await api.worker.submitRecord(payload);
        setResult({ success: true, offline: false, id: data.record_id || data.id || 'SYNC-' + Math.floor(Math.random() * 10000) });
      }
      setFormData({ patient_name: '', village: '', age: '', vaccination_status: 'fully_vaccinated', symptoms: '', worker_id: 'worker-demo-001' });
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
        {isOffline && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--warning-yellow-bg)', color: 'var(--warning-yellow)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
            <CloudSlash weight="bold" /> Working Offline
          </div>
        )}
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
                  value={formData.patient_name} 
                  onChange={e => setFormData({...formData, patient_name: e.target.value})} 
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
                <select value={formData.vaccination_status} onChange={e => setFormData({...formData, vaccination_status: e.target.value})}>
                  <option value="fully_vaccinated">Fully Vaccinated</option>
                  <option value="partially_vaccinated">Partially Vaccinated</option>
                  <option value="not_vaccinated">Not Vaccinated</option>
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
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: result.offline ? 'var(--warning-yellow-bg)' : 'var(--accent-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: result.offline ? 'var(--warning-yellow)' : 'var(--accent-green)' }}>
                {result.offline ? <CloudSlash weight="bold" size={24} /> : <CheckCircle weight="bold" size={24} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.offline ? 'Record Queued (Offline Mode)' : 'Record Saved Successfully'}
                </div>
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
