import React from 'react';
import { TerminalWindow, Robot, Books, ChartLineUp, UsersThree, ArrowRight, ShieldCheck, PlayCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <nav className="landing-nav" style={{ padding: '32px 64px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand" style={{ fontSize: '24px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '1px' }} onClick={() => navigate('/')}>
          <TerminalWindow size={36} weight="bold" color="var(--accent-cyan)" />
          NEXUS UI
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            className="btn-primary" 
            style={{ padding: '10px 24px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }} 
            onClick={() => navigate('/login')}
          >
            <ShieldCheck weight="bold" size={20} /> System Login
          </button>
        </div>
      </nav>

      <main className="hero-section" style={{ flex: 1, padding: '100px 64px', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div className="hero-content" style={{ maxWidth: '800px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '2px', background: 'var(--accent-cyan)', boxShadow: '0 0 10px var(--accent-cyan)' }}></div>
            <span style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '12px', fontFamily: 'var(--font-heading)' }}>GLOBAL HEALTH INTELLIGENCE GRID</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: '72px', letterSpacing: '1px', marginBottom: '24px', color: '#fff', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
            INTELLIGENT<br />
            <span style={{ color: 'var(--accent-violet)' }}>HEALTHCARE AI</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '90%', lineHeight: '1.6', marginBottom: '40px', letterSpacing: '0.5px' }}>
            A unified neural platform featuring a Generative AI Assistant, vector-based RAG Knowledge Base, and Automated Claim Analysis.
          </p>
          <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '12px' }} onClick={() => document.getElementById('modules-grid').scrollIntoView({ behavior: 'smooth' })}>
            <PlayCircle weight="bold" size={24} /> INITIALIZE MODULES
          </button>
        </div>

        <div className="hero-image-container" style={{ position: 'absolute', right: '5%', top: '15%', opacity: 0.9, pointerEvents: 'none' }}>
           <div style={{ position: 'relative' }}>
             <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(0,240,255,0.4)', borderRadius: '8px', transform: 'translate(10px, 10px)' }}></div>
             <img src={`${import.meta.env.BASE_URL}medical_ai.jpg`} alt="Futuristic Medical AI" style={{ maxWidth: '650px', borderRadius: '8px', filter: 'drop-shadow(0 0 40px rgba(0, 240, 255, 0.2))', border: '1px solid rgba(0,240,255,0.5)', position: 'relative', zIndex: 2 }} />
           </div>
        </div>
      </main>

      <section id="modules-grid" className="functional-section" style={{ padding: '80px 64px 120px', background: 'linear-gradient(to bottom, rgba(5,7,13,0), rgba(5,7,13,1))' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', marginBottom: '40px', fontWeight: 700, letterSpacing: '2px', color: 'var(--accent-cyan)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ width: '20px', height: '2px', background: 'var(--accent-cyan)' }}></div>
           Core Ecosystem Modules
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.3s', borderLeft: '3px solid var(--accent-cyan)' }} onClick={() => navigate('/dashboard/assistant')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(0,240,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.3)' }}>
              <Robot size={24} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '12px', fontFamily: 'var(--font-heading)', letterSpacing: '1px', color: '#fff' }}>AI Assistant Node</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Interact with our advanced healthcare Llama/Mistral neural model using high-bandwidth queries.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Launch Sequence <ArrowRight />
            </div>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.3s', borderLeft: '3px solid var(--accent-violet)' }} onClick={() => navigate('/dashboard/rag')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-violet)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <Books size={24} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '12px', fontFamily: 'var(--font-heading)', letterSpacing: '1px', color: '#fff' }}>Vector Knowledge Base</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Upload medical documents for OCR extraction and query WHO directives via FAISS Vector DB.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-violet)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Launch Sequence <ArrowRight />
            </div>
          </div>





          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.3s', borderLeft: '3px solid var(--accent-cyan)' }} onClick={() => navigate('/dashboard/insurance')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(0,240,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.3)' }}>
              <ShieldCheck size={24} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '12px', fontFamily: 'var(--font-heading)', letterSpacing: '1px', color: '#fff' }}>Automated Claim Analysis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Neural calculation of deductibles and medical claims automatically.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Launch Sequence <ArrowRight />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
