import React, { useState, useRef } from 'react';
import { FileText, UploadSimple, Calculator, CheckCircle, WarningCircle, ShieldCheck } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Insurance() {
  const [billFile, setBillFile] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const billInputRef = useRef(null);
  const policyInputRef = useRef(null);

  const handleCalculate = async () => {
    if (!billFile || !policyFile) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await api.insurance.calculateClaim(billFile, policyFile);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process insurance claim documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (type) => {
    if (type === 'bill') {
      billInputRef.current?.click();
    } else {
      policyInputRef.current?.click();
    }
  };

  const handleFileChange = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'bill') setBillFile(file);
      else setPolicyFile(file);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Insurance Claim Intelligence</h2>
        <p className="subtitle">AI-driven extraction of medical bills and policy cross-referencing to calculate coverage.</p>
      </header>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-yellow)" /> 1. Upload Medical Bill
          </h3>
          <input 
            type="file" 
            accept=".pdf,.png,.jpg,.jpeg" 
            ref={billInputRef} 
            onChange={(e) => handleFileChange('bill', e)} 
            style={{ display: 'none' }} 
          />
          <div className="upload-zone" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => handleUploadClick('bill')}>
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
          <input 
            type="file" 
            accept=".pdf,.png,.jpg,.jpeg" 
            ref={policyInputRef} 
            onChange={(e) => handleFileChange('policy', e)} 
            style={{ display: 'none' }} 
          />
          <div className="upload-zone" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => handleUploadClick('policy')}>
            <UploadSimple weight="bold" />
            <h4 style={{ marginBottom: '8px' }}>Upload Policy</h4>
            <p className="subtitle" style={{ fontSize: '13px', marginBottom: 0 }}>PDF or Image</p>
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

      {error && (
        <div className="glass-panel" style={{ marginBottom: '24px', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171' }}>
            <WarningCircle size={24} />
            <div>
              <strong>Claim Assessment Failed:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="glass-panel" style={{ animation: 'fadeUp 0.5s forwards' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--accent-cyan)' }}>Claim Assessment Summary</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Billed</div>
              <div style={{ fontSize: '26px', fontWeight: 700 }}>₹{result.totalBilled?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '18px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ color: 'var(--accent-green)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Covered Amount</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-green)' }}>₹{result.coveredAmount?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '18px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ color: 'var(--danger-red)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Out of Pocket</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--danger-red)' }}>₹{result.outOfPocket?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '18px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Deductible Applied</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#fbbf24' }}>₹{result.deductibleApplied?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '18px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ color: '#60a5fa', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Co-Pay Applied</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#60a5fa' }}>₹{result.coPayApplied?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '18px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
              <div style={{ color: '#c084fc', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Non-Covered</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#c084fc' }}>₹{result.nonCoveredAmount?.toLocaleString()}</div>
            </div>
          </div>

          {result.lineItems && result.lineItems.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '12px', color: '#f8fafc' }}>Parsed Line Items</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>DESCRIPTION</th>
                      <th style={{ padding: '8px 12px' }}>AMOUNT</th>
                      <th style={{ padding: '8px 12px' }}>COVERED</th>
                      <th style={{ padding: '8px 12px' }}>REASON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lineItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 12px', color: '#f8fafc' }}>{item.description}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>₹{item.amount?.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ 
                            color: item.is_covered ? '#34d399' : '#f87171',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: item.is_covered ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)'
                          }}>
                            {item.is_covered ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{item.coverage_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <WarningCircle size={24} color="var(--accent-yellow)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>AI Policy Analysis Notes:</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{result.notes}</div>
            </div>
          </div>

          {result.disclaimer && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
              {result.disclaimer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
