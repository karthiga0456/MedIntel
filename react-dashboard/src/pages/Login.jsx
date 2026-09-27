import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heartbeat, LockKey, EnvelopeSimple, ShieldCheck, TerminalWindow } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('SYSTEM ERROR: INCOMPLETE CREDENTIALS');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'ACCESS DENIED. INVALID CREDENTIALS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="brand-icon" style={{ width: 56, height: 56, fontSize: 32 }}>
            <TerminalWindow weight="bold" />
          </div>
          <h1>NEXUS UI</h1>
          <p>Intelligent • Secure • Connected</p>
        </div>
        
        {error && (
          <div style={{ color: 'var(--danger-red)', background: 'rgba(255,0,60,0.1)', border: '1px solid var(--danger-red)', padding: '12px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center', fontSize: '13px', fontFamily: 'var(--font-heading)', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: 'inset 0 0 10px rgba(255,0,60,0.2)', textShadow: '0 0 5px rgba(255,0,60,0.5)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Security Clearance / Email</label>
            <div className="input-icon-wrapper">
              <EnvelopeSimple weight="bold" />
              <input type="email" required placeholder="admin@medintel.gov" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          
          <div className="form-group">
            <label>Passphrase</label>
            <div className="input-icon-wrapper">
              <LockKey weight="bold" />
              <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-full mt-4" disabled={loading} style={{ height: '50px', fontSize: '16px' }}>
            {loading ? (
              <>
                <i className="ph ph-spinner ph-spin"></i> AUTHENTICATING...
              </>
            ) : (
              <>
                <ShieldCheck weight="bold" size={24} /> INITIALIZE SEQUENCE
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px dashed rgba(0,240,255,0.3)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-10px', left: '16px', background: 'var(--bg-color)', padding: '0 8px', fontSize: '10px', fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)', letterSpacing: '2px', textTransform: 'uppercase' }}>Demo Access Nodes</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
            <button 
              type="button" 
              style={{ background: 'rgba(0,255,102,0.1)', border: '1px solid rgba(0,255,102,0.4)', color: 'var(--success-green)', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s', boxShadow: 'inset 0 0 10px rgba(0,255,102,0.1)' }}
              onClick={() => { setEmail('worker@medintel.gov'); setPassword('workerpassword'); }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,255,102,0.2)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,102,0.3)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,255,102,0.1)'; e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,255,102,0.1)'; }}
            >
              [ Worker Node ]
            </button>
            <button 
              type="button" 
              style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.4)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s', boxShadow: 'inset 0 0 10px rgba(0,240,255,0.1)' }}
              onClick={() => { setEmail('admin@medintel.gov'); setPassword('adminpassword'); }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,240,255,0.2)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.3)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,240,255,0.1)'; e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(0,240,255,0.1)'; }}
            >
              [ Admin Node ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
