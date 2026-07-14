import React, { useState } from 'react';
import { FileText, UploadSimple, Calculator, CheckCircle, WarningCircle, ShieldCheck } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Insurance() {
  const [billFile, setBillFile] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCalculate = async () => {
    if (!billFile || !policyFile) return;
    setLoading(true);
    setResult(null);

    try {
      const data = await api.insurance.calculateClaim(billFile, policyFile);
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (type) => {
    if (type === 'bill') {
      setBillFile({ name: 'hospital_bill_024.pdf' });
    } else {
      setPolicyFile({ name: 'health_insurance_policy_2026.pdf' });
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Insurance Calculating Agent</h2>
        <p className="subtitle">AI-driven extraction of medical bills and policy cross-referencing to calculate coverage.</p>
      </header>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-yellow)" /> 1. Upload Medical Bill
          </h3>
          <div className="upload-zone" style={{ padding: '24px' }} onClick={() => handleUpload('bill')}>
            <UploadSimple weight="bold" />
            <h4 style={{ marginBottom: '8px' }}>Upload Bill</h4>
            <p className="subtitle" style={{ fontSize: '13px', marginBottom: 0 }}>PDF or Image</p>
          </div>
          {billFile && (
            <div className="file-item" style={{ marginTop: '12px' }}>
              <FileText size={20} color="var(--accent-cyan)" />
              <div style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{billFile.name}</div>
              <CheckCircle size={20} color="var(--accent-green)" weight="fill" />
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--accent-yellow)" /> 2. Upload Insurance Policy
          </h3>
          <div className="upload-zone" style={{ padding: '24px' }} onClick={() => handleUpload('policy')}>
            <UploadSimple weight="bold" />
            <h4 style={{ marginBottom: '8px' }}>Upload Policy</h4>
            <p className="subtitle" style={{ fontSize: '13px', marginBottom: 0 }}>PDF document</p>
          </div>
          {policyFile && (
            <div className="file-item" style={{ marginTop: '12px' }}>
              <ShieldCheck size={20} color="var(--accent-cyan)" />
              <div style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{policyFile.name}</div>
              <CheckCircle size={20} color="var(--accent-green)" weight="fill" />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <button 
          className="btn-primary" 
          disabled={!billFile || !policyFile || loading}
          onClick={handleCalculate}
          style={{ padding: '16px 40px', fontSize: '16px', borderRadius: '30px', opacity: (!billFile || !policyFile) ? 0.5 : 1 }}
        >
          {loading ? <i className="ph ph-spinner ph-spin"></i> : <Calculator weight="bold" />}
          {loading ? "Analyzing Documents with AI..." : "Analyze & Calculate Claim"}
        </button>
      </div>

      {result && (
        <div className="glass-panel" style={{ animation: 'fadeUp 0.5s forwards' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--accent-cyan)' }}>Calculation Results</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Billed</div>
              <div style={{ fontSize: '32px', fontWeight: 700 }}>${result.totalBilled}</div>
            </div>
            <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Covered by Insurance</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-green)' }}>${result.coveredAmount}</div>
            </div>
            <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ color: 'var(--danger-red)', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Out of Pocket</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--danger-red)' }}>${result.outOfPocket}</div>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <WarningCircle size={24} color="var(--accent-yellow)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>AI Policy Analysis Notes:</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{result.notes}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
