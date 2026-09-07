import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heartbeat, LockKey, EnvelopeSimple, ShieldCheck } from '@phosphor-icons/react';
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
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass auth-box">
        <div className="auth-logo">
          <div className="brand-icon">
            <Heartbeat weight="fill" />
          </div>
          <h1>MedIntel</h1>
        </div>
        
        <div className="subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>
          Secure Access Control
        </div>
        
        {error && (
          <div style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email / Staff ID</label>
            <div className="input-icon-wrapper">
              <EnvelopeSimple weight="bold" />
              <input type="email" required placeholder="admin@medintel.gov" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrapper">
              <LockKey weight="bold" />
              <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-full mt-2" disabled={loading}>
            {loading ? (
              <>
                <i className="ph ph-spinner ph-spin"></i> Authenticating...
              </>
            ) : (
              <>
                <ShieldCheck weight="bold" size={20} /> Secure Login
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontWeight: 600, color: 'var(--accent-yellow)', marginBottom: '8px', textAlign: 'center' }}>Demo Quick Login Options</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button 
              type="button" 
              style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              onClick={() => { setEmail('worker@medintel.gov'); setPassword('workerpassword'); }}
            >
              👤 Standard User<br/>(Core Features Only)
            </button>
            <button 
              type="button" 
              style={{ background: 'rgba(96, 165, 250, 0.15)', border: '1px solid rgba(96, 165, 250, 0.3)', color: '#60a5fa', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              onClick={() => { setEmail('admin@medintel.gov'); setPassword('adminpassword'); }}
            >
              🛡️ System Admin<br/>(All Features)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
