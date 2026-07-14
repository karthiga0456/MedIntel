import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heartbeat, LockKey, EnvelopeSimple, ShieldCheck } from '@phosphor-icons/react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate JWT/OAuth2.0 Auth flow
    setTimeout(() => {
      setLoading(false);
      navigate('/assistant');
    }, 1500);
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
          Secure Access Control (JWT/OAuth 2.0)
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email / Staff ID</label>
            <div className="input-icon-wrapper">
              <EnvelopeSimple weight="bold" />
              <input type="email" required placeholder="admin@medintel.gov" />
            </div>
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrapper">
              <LockKey weight="bold" />
              <input type="password" required placeholder="••••••••" />
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
