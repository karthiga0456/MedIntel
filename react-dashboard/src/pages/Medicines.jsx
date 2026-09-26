import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pill,
  MagnifyingGlass,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

function MedSkeleton() {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton skeleton-title" style={{ width: '50%' }} />
        <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '12px' }} />
      </div>
      <div className="skeleton skeleton-text" style={{ width: '80%' }} />
      <div className="skeleton skeleton-text" style={{ width: '70%' }} />
      <div className="skeleton skeleton-text" style={{ width: '90%' }} />
    </div>
  );
}

export default function Medicines() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'interactions'
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Matcher State
  const [selectedDisease, setSelectedDisease] = useState('Fever / Body Pain');
  const [checkMeds, setCheckMeds] = useState('Paracetamol, Ibuprofen');
  const [interactionReport, setInteractionReport] = useState(null);
  const [checkingSafety, setCheckingSafety] = useState(false);

  // Local fallback (abridged for length, same data)
  const LOCAL_FORMULARY = [
    { id: 'f1', generic_name: 'Paracetamol', brand_name: 'Dolo 650', category: 'Analgesic', default_dosage: '500-650mg', standard_frequency: 'Every 4-6 hrs', indications: 'Fever, mild pain', side_effects: 'Rare at therapeutic doses', warnings: 'Do not exceed 4g/day. Avoid alcohol.' },
    { id: 'f2', generic_name: 'Amoxicillin', brand_name: 'Mox', category: 'Antibiotic (Penicillin)', default_dosage: '500mg', standard_frequency: 'TDS x 5-7 days', indications: 'Bacterial infections', side_effects: 'Diarrhoea, rash', warnings: 'Screen for allergy. Complete course.' },
    { id: 'f3', generic_name: 'Metformin', brand_name: 'Glycomet', category: 'Antidiabetic', default_dosage: '500mg', standard_frequency: 'BD-TDS with meals', indications: 'Type 2 Diabetes', side_effects: 'GI upset', warnings: 'Monitor renal function.' },
    { id: 'f4', generic_name: 'Amlodipine', brand_name: 'Amvaz', category: 'Calcium Channel Blocker', default_dosage: '5mg', standard_frequency: 'OD morning', indications: 'Hypertension', side_effects: 'Ankle edema', warnings: 'Monitor BP regularly.' },
    { id: 'f5', generic_name: 'Ibuprofen', brand_name: 'Brufen', category: 'NSAID', default_dosage: '400mg', standard_frequency: 'BD-TDS after food', indications: 'Pain, inflammation', side_effects: 'Gastritis', warnings: 'Avoid in asthma and renal disease.' },
  ];

  const diseaseGuide = {
    'Fever / Body Pain': [
      { name: 'Paracetamol (Dolo 650)', dosage: '650mg TDS', category: 'Analgesic', advice: 'Take after meals. Max 3000mg/day.' },
      { name: 'Ibuprofen 400mg', dosage: '400mg BD after food', category: 'NSAID', advice: 'Avoid in kidney disease.' }
    ],
    'Respiratory Infection': [
      { name: 'Amoxicillin 500mg', dosage: '500mg TDS', category: 'Antibiotic', advice: 'Complete full course. Screen for allergy.' },
      { name: 'Azithromycin 500mg', dosage: '500mg OD', category: 'Antibiotic', advice: 'Take 1 hr before or 2 hrs after food.' }
    ]
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    const handleSearch = async () => {
      setSearching(true);
      try {
        const q = debouncedSearch.trim();
        if (!q) {
          setSearchResults(LOCAL_FORMULARY);
          return;
        }
        const data = await api.medicines.search(q);
        if (data && data.length > 0) {
          setSearchResults(data);
        } else {
          // Fallback
          const lower = q.toLowerCase();
          const filtered = LOCAL_FORMULARY.filter(m => 
            m.generic_name.toLowerCase().includes(lower) || 
            (m.brand_name && m.brand_name.toLowerCase().includes(lower))
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.warn('Medicine API unavailable, using local fallback:', err);
        const q = debouncedSearch.trim().toLowerCase();
        const filtered = LOCAL_FORMULARY.filter(m => 
          m.generic_name.toLowerCase().includes(q) || 
          (m.brand_name && m.brand_name.toLowerCase().includes(q))
        );
        setSearchResults(filtered);
      } finally {
        setSearching(false);
      }
    };
    handleSearch();
  }, [debouncedSearch]);

  const handleRunInteractionCheck = async (e) => {
    e.preventDefault();
    setCheckingSafety(true);
    setInteractionReport(null);
    try {
      const medList = checkMeds.split(',').map(m => m.trim()).filter(Boolean);
      if (medList.length < 2) {
        toast.warning('Please enter at least two medications to check interactions.', 'Input Required');
        setCheckingSafety(false);
        return;
      }
      const res = await api.medicines.checkSafety(null, medList);
      setInteractionReport(res);
      if (res.has_warnings) {
        toast.warning('Potential drug interactions found.', 'Interaction Alert');
      } else {
        toast.success('No severe interactions detected.', 'Safe to Use');
      }
    } catch (err) {
      toast.error(err.message || 'Interaction check failed.', 'Safety Check Failed');
    } finally {
      setCheckingSafety(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Medicines & Safety Checker</h2>
        <p className="subtitle">
          Essential formulary, disease-to-medicine guidelines, and AI-powered drug interaction screening.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('search')}
        >
          <Pill size={16} /> Formulary Search
        </button>
        <button
          className={activeTab === 'interactions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('interactions')}
        >
          <Warning size={16} /> Interaction Screener
        </button>
      </div>

      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="input-icon-wrapper">
              <MagnifyingGlass size={16} />
              <input
                type="search"
                placeholder="Search medications by generic or brand name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {searching ? (
            <div className="grid-2">
              {Array.from({ length: 4 }).map((_, i) => <MedSkeleton key={i} />)}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="glass-panel empty-state">
              <Pill size={28} />
              <h3>No medications found</h3>
              <p>Try searching for a different generic or brand name.</p>
            </div>
          ) : (
            <div className="grid-2">
              {searchResults.map((med) => (
                <div key={med.id || med.generic_name} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {med.generic_name}
                      </h3>
                      {med.brand_name && (
                        <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                          Brand: {med.brand_name}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-primary">{med.category}</span>
                  </div>

                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong style={{ color: 'var(--text-primary)' }}>Dosage:</strong> {med.default_dosage} ({med.standard_frequency})</div>
                    <div><strong style={{ color: 'var(--text-primary)' }}>Uses:</strong> {med.indications}</div>
                  </div>

                  {med.warnings && (
                    <div style={{
                      marginTop: '12px', padding: '10px 12px',
                      background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)',
                      borderRadius: '8px', fontSize: '12px', color: '#facc15',
                      display: 'flex', gap: '8px', alignItems: 'flex-start'
                    }}>
                      <Warning size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{med.warnings}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="grid-2">
          {/* Disease Guide */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Clinical Matcher</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Standard treatment guidelines for common conditions.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <select value={selectedDisease} onChange={e => setSelectedDisease(e.target.value)}>
                {Object.keys(diseaseGuide).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diseaseGuide[selectedDisease]?.map((med, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{med.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{med.dosage}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    💡 <em>{med.advice}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interaction Screener */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Interaction Screener</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Verify safety and check for adverse drug-drug interactions.
            </p>

            <form onSubmit={handleRunInteractionCheck} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Medications (comma-separated)</label>
                <input
                  type="text"
                  value={checkMeds}
                  onChange={e => setCheckMeds(e.target.value)}
                  placeholder="e.g. Ibuprofen, Aspirin, Amoxicillin"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={checkingSafety}>
                {checkingSafety ? 'Checking Safety...' : 'Screen Interactions'}
              </button>
            </form>

            {interactionReport && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)' }}>
                {!interactionReport.has_warnings ? (
                  <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--accent-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <CheckCircle size={18} /> Safe: No severe interactions detected.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--danger-red)', marginBottom: '4px' }}>Warnings Found:</h4>
                    {interactionReport.drug_interactions.map((dw, i) => (
                      <div key={i} style={{ padding: '12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: 'var(--accent-yellow)', borderRadius: '8px', fontSize: '13px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{dw.drug_a} + {dw.drug_b} ({dw.severity})</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>{dw.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
