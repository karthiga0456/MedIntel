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
      </div>
    </div>
  );
}
