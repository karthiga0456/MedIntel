import React from 'react';
import { Heartbeat, Robot, Books, ChartLineUp, UsersThree, ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <nav className="landing-nav" style={{ padding: '32px 64px 0' }}>
        <div className="brand" style={{ fontSize: '24px', fontWeight: '800', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Heartbeat size={32} weight="fill" color="var(--accent-yellow)" />
          MedIntel
        </div>
      </nav>

      <main className="hero-section" style={{ minHeight: '400px', flex: 'none', padding: '0 64px' }}>
        <div className="hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--accent-yellow)', borderRadius: '2px' }}></div>
            <span style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600', color: 'var(--accent-yellow)' }}>Public Health Ecosystem</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: '80px', letterSpacing: '-2px', marginBottom: '16px' }}>
            Intelligent<br />
            <span style={{ fontWeight: '300' }}>Healthcare AI</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '80%', lineHeight: '1.6', marginBottom: '32px' }}>
            A unified platform featuring a Generative AI Assistant, RAG Knowledge Base, Predictive Outbreak Engine, and Offline Health Worker synchronization.
          </p>
          <button className="btn-pill-white" style={{ background: 'var(--accent-yellow)', color: 'var(--bg-color)', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => document.getElementById('modules-grid').scrollIntoView({ behavior: 'smooth' })}>
            Explore Modules <ArrowRight weight="bold" />
          </button>
        </div>

        <div className="hero-image-container" style={{ right: '5%', top: '60%' }}>
          <img src="/static/hero.png" alt="Futuristic Medical AI" style={{ filter: 'drop-shadow(0 0 60px rgba(59, 130, 246, 0.4))' }} />
        </div>
      </main>

      <section id="modules-grid" className="functional-section" style={{ padding: '40px 64px 80px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', marginBottom: '32px', fontWeight: 600 }}>Core Ecosystem Modules</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'transform 0.3s' }} onClick={() => navigate('/dashboard/assistant')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-yellow)' }}>
              <Robot size={32} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>AI Assistant</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Interact with our advanced healthcare Llama/Mistral model using voice or text.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '14px' }}>
              Launch Module <ArrowRight />
            </div>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'transform 0.3s' }} onClick={() => navigate('/dashboard/rag')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-yellow)' }}>
              <Books size={32} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Knowledge Base</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Upload medical documents for OCR extraction and query WHO guidelines via FAISS Vector DB.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '14px' }}>
              Launch Module <ArrowRight />
            </div>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'transform 0.3s' }} onClick={() => navigate('/dashboard/outbreak')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-yellow)' }}>
              <ChartLineUp size={32} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Outbreak Predictor</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              AI-driven risk classification using LSTM and XGBoost models to predict epidemiological spikes.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '14px' }}>
              Launch Module <ArrowRight />
            </div>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'transform 0.3s' }} onClick={() => navigate('/dashboard/worker')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-yellow)' }}>
              <UsersThree size={32} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Worker Portal</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Offline-first health record entry pushing synchronized patient data directly to PostgreSQL.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '14px' }}>
              Launch Module <ArrowRight />
            </div>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'transform 0.3s' }} onClick={() => navigate('/dashboard/insurance')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-yellow)' }}>
              <ShieldCheck size={32} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Insurance Calculator</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Upload medical bills and health policies. Let AI calculate deductibles and claims automatically.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '14px' }}>
              Launch Module <ArrowRight />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
