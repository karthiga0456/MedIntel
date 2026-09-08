import React, { useState, useEffect } from 'react';
import {
  Pill,
  MagnifyingGlass,
  ShieldWarning,
  Plus,
  Trash,
  CheckCircle,
  FileArrowUp,
  User,
  Warning,
  CaretRight,
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Medicines() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'interactions'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Disease & Drug Matcher state
  const [selectedDisease, setSelectedDisease] = useState('Fever / Body Pain');
  const [checkMeds, setCheckMeds] = useState('Paracetamol, Ibuprofen');
  const [interactionReport, setInteractionReport] = useState(null);
  const [checkingSafety, setCheckingSafety] = useState(false);

  const diseaseGuide = {
    'Fever / Body Pain': [
      { name: 'Paracetamol (Dolo 650)', dosage: '650mg TDS', category: 'Analgesic / Antipyretic', advice: 'Take after meals. Max 3000mg/day. Avoid alcohol.' },
      { name: 'Ibuprofen 400mg', dosage: '400mg BD after food', category: 'NSAID', advice: 'Take with food to prevent gastric irritation. Avoid in kidney disease.' }
    ],
    'Bacterial Respiratory Infection': [
      { name: 'Amoxicillin 500mg', dosage: '500mg TDS for 5–7 days', category: 'Antibiotic (Penicillin)', advice: 'Complete full course. Screen for penicillin allergy before prescribing.' },
      { name: 'Azithromycin 500mg', dosage: '500mg OD for 3 days', category: 'Macrolide Antibiotic', advice: 'Take 1 hour before or 2 hours after food. Avoid with antacids.' }
    ],
    'Hypertension / High BP': [
      { name: 'Amlodipine 5mg', dosage: '5mg OD morning', category: 'Calcium Channel Blocker', advice: 'Monitor BP regularly. Watch for ankle edema and facial flushing.' },
      { name: 'Telmisartan 40mg', dosage: '40mg OD morning', category: 'ARB Antihypertensive', advice: 'Monitor serum potassium and renal function periodically.' },
      { name: 'Hydrochlorothiazide 12.5mg', dosage: '12.5mg OD morning', category: 'Thiazide Diuretic', advice: 'Monitor electrolytes. Take in morning to avoid nocturia.' }
    ],
    'Type 2 Diabetes': [
      { name: 'Metformin 500mg', dosage: '500mg BD with meals', category: 'Biguanide Antidiabetic', advice: 'Take with meals to minimize GI side effects. Check renal function.' },
      { name: 'Glimepiride 1mg', dosage: '1mg OD before breakfast', category: 'Sulfonylurea', advice: 'Risk of hypoglycemia. Keep glucose tablets/sugar handy at all times.' }
    ],
    'Malaria (Uncomplicated P. falciparum)': [
      { name: 'Artemether-Lumefantrine (AL)', dosage: '80/480mg — 4 tabs BD × 3 days', category: 'Artemisinin Combination Therapy (ACT)', advice: 'Take with fatty meal. Do NOT use in 1st trimester pregnancy. Full 3-day course mandatory.' },
      { name: 'Primaquine 7.5mg', dosage: '0.25 mg/kg OD × 14 days', category: 'Antirelapse (8-Aminoquinoline)', advice: 'Screen for G6PD deficiency before use. Contraindicated in pregnancy.' }
    ],
    'Malaria (P. vivax / Relapsing)': [
      { name: 'Chloroquine 500mg', dosage: '10mg/kg Day 1, 10mg/kg Day 2, 5mg/kg Day 3', category: 'Schizontocidal', advice: 'Take with water or milk. Available free at PHCs under NVBDCP.' },
      { name: 'Primaquine 7.5mg', dosage: '0.25 mg/kg OD × 14 days', category: 'Antirelapse', advice: 'Prevents relapses. G6PD test required. Free at government facilities.' }
    ],
    'Tuberculosis (TB) — DOTS Regimen': [
      { name: 'Rifampicin 600mg', dosage: '600mg OD on empty stomach', category: 'First-line Anti-TB (DOTS)', advice: 'Turns urine/sweat orange — normal. Avoid alcohol. Free under NTEP programme.' },
      { name: 'Isoniazid 300mg', dosage: '300mg OD with Pyridoxine (B6)', category: 'First-line Anti-TB (DOTS)', advice: 'Add Pyridoxine 10mg daily to prevent peripheral neuropathy.' },
      { name: 'Pyrazinamide 1500mg', dosage: '25mg/kg OD', category: 'First-line Anti-TB (Intensive Phase)', advice: 'Monitor liver enzymes. Report jaundice or severe joint pain.' }
    ],
    'Diarrhoea & Dehydration': [
      { name: 'ORS (Oral Rehydration Salts)', dosage: '1 sachet in 1 litre boiled water — sip frequently', category: 'Rehydration Therapy', advice: 'First-line treatment. Free at all AWC and PHCs. Prepare fresh each time.' },
      { name: 'Zinc 20mg', dosage: '20mg OD × 14 days (children 10mg)', category: 'Micronutrient Supplement', advice: 'Reduces duration and severity of diarrhoea. Continue for full 14 days.' },
      { name: 'Metronidazole 400mg', dosage: '400mg TDS × 5 days', category: 'Antiprotozoal / Anaerobic antibiotic', advice: 'For amoebic dysentery. Avoid alcohol completely during course.' }
    ],
    'Gastritis / Acid Reflux': [
      { name: 'Pantoprazole 40mg', dosage: '40mg OD before breakfast', category: 'Proton Pump Inhibitor (PPI)', advice: 'Take 30 minutes before morning meal on empty stomach. Avoid spicy foods.' },
      { name: 'Antacid Suspension', dosage: '10–20ml after meals and at bedtime', category: 'Antacid', advice: 'Provides immediate relief. Do not take within 2 hours of other medicines.' }
    ],
    'Allergies & Rhinitis': [
      { name: 'Cetirizine 10mg', dosage: '10mg OD at bedtime', category: 'Antihistamine (2nd gen)', advice: 'Minimal drowsiness. Safe for most adults. Avoid in severe kidney disease.' },
      { name: 'Montelukast 10mg', dosage: '10mg OD at bedtime', category: 'Leukotriene Receptor Antagonist', advice: 'Good for allergic rhinitis with asthma component. Take at same time daily.' }
    ],
    'Skin Infections / Scabies': [
      { name: 'Permethrin 5% Cream', dosage: 'Apply whole body (neck down), wash off after 8–14 hours', category: 'Topical Scabicide', advice: 'Treat all household members simultaneously. Wash all bedding in hot water.' },
      { name: 'Clotrimazole 1% Cream', dosage: 'Apply BD to affected area for 2–4 weeks', category: 'Topical Antifungal', advice: 'Effective for ringworm, athlete\'s foot, and candidal skin infections.' }
    ],
    'Iron-Deficiency Anaemia': [
      { name: 'Ferrous Sulphate 200mg', dosage: '200mg BD between meals', category: 'Iron Supplement (IFA)', advice: 'Take with Vitamin C (lemon juice) to improve absorption. May cause dark stools — normal. Free under IFA programme at AWC.' },
      { name: 'Folic Acid 5mg', dosage: '5mg OD', category: 'B-Vitamin Supplement', advice: 'Essential in pregnancy. Take throughout 1st trimester and beyond. Free at PHCs.' }
    ],
    'Intestinal Worms (Helminthiasis)': [
      { name: 'Albendazole 400mg', dosage: '400mg single dose (chew or swallow)', category: 'Anthelmintic', advice: 'Single dose effective for most worm infections. Safe from 12 months of age. Free under NDD.' },
      { name: 'Mebendazole 500mg', dosage: '500mg single dose', category: 'Anthelmintic', advice: 'Alternative to Albendazole. Take with food. Repeat after 2 weeks if heavy infestation.' }
    ]
  };

  useEffect(() => {
    handleSearch('');
  }, []);

  // Local formulary fallback — shown when backend is unreachable
  const LOCAL_FORMULARY = [
    { id: 'f1', generic_name: 'Paracetamol (Acetaminophen)', brand_name: 'Dolo 650, Crocin', category: 'Analgesic / Antipyretic', default_dosage: '500–650mg', standard_frequency: 'Every 4–6 hours (max 4g/day)', indications: 'Fever, mild-to-moderate pain, headache, body ache', side_effects: 'Rare at therapeutic doses; hepatotoxicity in overdose', warnings: 'Do not exceed 4g/day. Avoid with alcohol. Caution in liver disease.' },
    { id: 'f2', generic_name: 'Amoxicillin', brand_name: 'Mox, Novamox', category: 'Antibiotic (Penicillin)', default_dosage: '500mg', standard_frequency: 'TDS × 5–7 days', indications: 'Bacterial pharyngitis, ear infections, pneumonia, UTI', side_effects: 'Diarrhoea, skin rash, nausea', warnings: 'Screen for penicillin allergy. Complete full course.' },
    { id: 'f3', generic_name: 'Metformin', brand_name: 'Glycomet, Glucophage', category: 'Biguanide Antidiabetic', default_dosage: '500mg', standard_frequency: 'BD–TDS with meals', indications: 'Type 2 Diabetes mellitus (first-line)', side_effects: 'GI upset, metallic taste, lactic acidosis (rare)', warnings: 'Hold 48h before contrast imaging. Monitor eGFR — avoid if <30.' },
    { id: 'f4', generic_name: 'Amlodipine', brand_name: 'Amvaz, Norvasc', category: 'Calcium Channel Blocker', default_dosage: '5mg', standard_frequency: 'OD morning', indications: 'Hypertension, stable angina', side_effects: 'Ankle oedema, flushing, headache, palpitations', warnings: 'Monitor BP regularly. Grapefruit juice may increase levels.' },
    { id: 'f5', generic_name: 'Artemether + Lumefantrine', brand_name: 'Coartem, AL Tabs', category: 'Artemisinin Combination Therapy', default_dosage: '80mg/480mg per tablet', standard_frequency: '4 tablets BD × 3 days', indications: 'Uncomplicated P. falciparum malaria (first-line ACT)', side_effects: 'Dizziness, headache, nausea, QT prolongation (rare)', warnings: 'Take with fatty food. Avoid in 1st trimester. Full 3-day course is mandatory.' },
    { id: 'f6', generic_name: 'Chloroquine Phosphate', brand_name: 'Lariago, Resochin', category: 'Schizontocidal Antimalarial', default_dosage: '500mg (300mg base)', standard_frequency: 'Day 1: 600mg, Day 2: 300mg, Day 3: 300mg', indications: 'P. vivax malaria, P. malariae (free under NVBDCP)', side_effects: 'Nausea, headache, blurred vision, pruritus', warnings: 'Resistance in P. falciparum. Ophthalmology review for long-term use.' },
    { id: 'f7', generic_name: 'ORS — Oral Rehydration Salts', brand_name: 'Electral, Pedialyte', category: 'Rehydration Therapy', default_dosage: '1 sachet in 1 litre boiled water', standard_frequency: 'Sip 200–400ml after every loose stool', indications: 'Acute diarrhoea, dehydration, heat exhaustion', side_effects: 'None at standard doses', warnings: 'Prepare fresh solution every 24 hours. Do NOT add extra sugar or salt.' },
    { id: 'f8', generic_name: 'Albendazole', brand_name: 'Zentel, Bandy', category: 'Anthelmintic (Broad-spectrum)', default_dosage: '400mg', standard_frequency: 'Single dose — repeat after 2 weeks if needed', indications: 'Roundworms, hookworms, whipworms, giardia (NDD Programme)', side_effects: 'Mild GI upset, headache — usually well tolerated', warnings: 'Contraindicated in pregnancy. Free under National Deworming Day (NDD).' },
    { id: 'f9', generic_name: 'Ferrous Sulphate + Folic Acid', brand_name: 'IFA Tablets (Government)', category: 'Iron & Folate Supplement', default_dosage: 'Ferrous Sulphate 200mg + Folic Acid 0.5mg', standard_frequency: 'OD / BD (by deficiency severity)', indications: 'Iron-deficiency anaemia, pregnancy, adolescent girls (IFA scheme)', side_effects: 'Dark stools, constipation, nausea', warnings: 'Take with Vitamin C for better absorption. Avoid with tea/coffee. Free at PHC.' },
    { id: 'f10', generic_name: 'Pantoprazole', brand_name: 'Pantocid, Pan-D', category: 'Proton Pump Inhibitor (PPI)', default_dosage: '40mg', standard_frequency: 'OD — 30 minutes before breakfast', indications: 'GERD, peptic ulcer, Zollinger-Ellison syndrome, H. pylori eradication', side_effects: 'Headache, diarrhoea, hypomagnesemia (long-term)', warnings: 'Long-term use: monitor Mg2+ and B12. May mask gastric cancer symptoms.' },
    { id: 'f11', generic_name: 'Cetirizine', brand_name: 'Cetzine, Alerid', category: '2nd Generation Antihistamine', default_dosage: '10mg', standard_frequency: 'OD at bedtime', indications: 'Allergic rhinitis, urticaria, atopic dermatitis', side_effects: 'Minimal sedation, dry mouth, dizziness (rare)', warnings: 'Caution in severe renal impairment. Reduce dose to 5mg OD.' },
    { id: 'f12', generic_name: 'Azithromycin', brand_name: 'Azithral, Zithromax', category: 'Macrolide Antibiotic', default_dosage: '500mg', standard_frequency: 'OD × 3 days (or OD × 5 days for CAP)', indications: 'Community-acquired pneumonia, typhoid, chlamydia, AECB', side_effects: 'GI upset, QT prolongation, hepatotoxicity (rare)', warnings: 'Caution with drugs that prolong QT interval. Take on empty stomach.' },
    { id: 'f13', generic_name: 'Ibuprofen', brand_name: 'Brufen, Advil', category: 'NSAID', default_dosage: '400mg', standard_frequency: 'BD–TDS after food', indications: 'Pain, inflammation, dysmenorrhea, fever', side_effects: 'Gastritis, heartburn, renal impairment', warnings: 'Avoid in asthma, severe renal disease, and peptic ulcers.' },
    { id: 'f14', generic_name: 'Salbutamol (Albuterol)', brand_name: 'Asthalin', category: 'Short-acting Beta2 Agonist (SABA)', default_dosage: '100–200mcg (1-2 puffs)', standard_frequency: 'PRN (as needed for symptoms)', indications: 'Asthma, COPD, acute bronchospasm', side_effects: 'Tremor, tachycardia, palpitations', warnings: 'Monitor heart rate. Seek emergency help if inhaler provides no relief.' },
    { id: 'f15', generic_name: 'Atorvastatin', brand_name: 'Lipikind, Tonact', category: 'Statin (Lipid-lowering)', default_dosage: '10–40mg', standard_frequency: 'OD at bedtime', indications: 'Hypercholesterolemia, prevention of cardiovascular disease', side_effects: 'Myalgia (muscle pain), elevated liver enzymes', warnings: 'Monitor LFTs. Avoid grapefruit juice. Report unexplained muscle weakness.' },
    { id: 'f16', generic_name: 'Diclofenac', brand_name: 'Voveran, Dynapar', category: 'NSAID', default_dosage: '50mg', standard_frequency: 'BD–TDS after food', indications: 'Osteoarthritis, rheumatoid arthritis, acute musculoskeletal pain', side_effects: 'GI bleeding, renal toxicity, fluid retention', warnings: 'Higher cardiovascular risk. Use lowest effective dose for shortest duration.' },
  ];

  const handleSearch = async (queryToRun) => {
    const q = (queryToRun !== undefined ? queryToRun : searchQuery).trim();
    if (!q) {
      setSearchResults(LOCAL_FORMULARY);
      return;
    }
    setSearching(true);
    try {
      const data = await api.medicines.search(q);
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        // Backend returned empty — use local formulary filtered by query
        const lower = q.toLowerCase();
        const filtered = LOCAL_FORMULARY.filter(
          (m) =>
            m.generic_name.toLowerCase().includes(lower) ||
            (m.brand_name && m.brand_name.toLowerCase().includes(lower)) ||
            (m.category && m.category.toLowerCase().includes(lower)) ||
            (m.indications && m.indications.toLowerCase().includes(lower))
        );
        setSearchResults(filtered.length > 0 ? filtered : LOCAL_FORMULARY);
      }
    } catch (err) {
      console.warn('Medicine API unavailable, using local formulary:', err.message);
      const lower = q.toLowerCase();
      const filtered = LOCAL_FORMULARY.filter(
        (m) =>
          m.generic_name.toLowerCase().includes(lower) ||
          (m.brand_name && m.brand_name.toLowerCase().includes(lower)) ||
          (m.category && m.category.toLowerCase().includes(lower)) ||
          (m.indications && m.indications.toLowerCase().includes(lower))
      );
      setSearchResults(filtered.length > 0 ? filtered : LOCAL_FORMULARY);
    } finally {
      setSearching(false);
    }
  };

  const handleRunInteractionCheck = async (e) => {
    e.preventDefault();
    setCheckingSafety(true);
    try {
      const medList = checkMeds.split(',').map((m) => m.trim()).filter(Boolean);
      const res = await api.medicines.checkSafety(null, medList);
      setInteractionReport(res);
    } catch (err) {
      alert('Safety check failed: ' + err.message);
    } finally {
      setCheckingSafety(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Medicines Formulary & Disease Drug Matcher</h2>
        <p className="subtitle">
          Essential health medicines formulary, full basic drug details, disease-to-medicine suggestions, and drug interaction safety.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('search')}
        >
          Formulary Medicine Details
        </button>
        <button
          className={activeTab === 'interactions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('interactions')}
        >
          Disease Matcher & Interaction Checker
        </button>
      </div>

      {activeTab === 'search' && (
        <div>
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ display: 'flex', gap: '12px' }}>
              <div className="input-icon-wrapper" style={{ flex: 1 }}>
                <MagnifyingGlass />
                <input
                  type="text"
                  placeholder="Search by generic name or brand (e.g. Paracetamol, Dolo, Amoxicillin, Metformin, Amlodipine)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {searchResults.map((med) => (
              <div key={med.id || med.generic_name} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>{med.generic_name}</h3>
                    {med.brand_name && (
                      <span style={{ fontSize: '12px', color: '#93c5fd' }}>Brand: {med.brand_name}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                    {med.category || 'Essential Medicine'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                  <div><strong>Standard Dosage: </strong>{med.default_dosage || '500mg - 650mg'}</div>
                  <div><strong>Frequency: </strong>{med.standard_frequency || 'TDS / Every 6-8 hours'}</div>
                  <div><strong>Indications: </strong>{med.indications || 'Fever, Mild to Moderate Pain, Inflammation'}</div>
                  <div><strong>Side Effects: </strong>{med.side_effects || 'Nausea, mild dizziness, rash (rare)'}</div>
                </div>

                {med.warnings && (
                  <div style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(234,179,8,0.1)', color: '#fde047', display: 'flex', gap: '6px' }}>
                    <Warning size={16} style={{ flexShrink: 0 }} />
                    <span>{med.warnings}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'interactions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Disease to Medicine Suggester */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px' }}>Disease / Condition Medicine Finder</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Select a medical condition to view recommended essential medicines, dosages, and administration notes.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Select Disease or Clinical Condition</label>
              <select value={selectedDisease} onChange={(e) => setSelectedDisease(e.target.value)}>
                {Object.keys(diseaseGuide).map((disease) => (
                  <option key={disease} value={disease}>{disease}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diseaseGuide[selectedDisease]?.map((med, idx) => (
                <div key={idx} style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#fff' }}>{med.name}</strong>
                    <span style={{ fontSize: '11px', color: '#60a5fa' }}>{med.dosage}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                    Category: {med.category}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    💡 <em>{med.advice}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Drug Interaction Screener */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px' }}>Drug-Drug Interaction Screener</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Check potential adverse interactions between multiple prescribed medications.
            </p>

            <form onSubmit={handleRunInteractionCheck}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Medications to Screen (comma-separated)</label>
                <input
                  type="text"
                  value={checkMeds}
                  onChange={(e) => setCheckMeds(e.target.value)}
                  placeholder="e.g. Ibuprofen, Aspirin, Amoxicillin"
                />
              </div>

              <button type="submit" className="btn-primary" disabled={checkingSafety}>
                {checkingSafety ? 'Screening...' : 'Screen Interactions'}
              </button>
            </form>

            {interactionReport && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                {!interactionReport.has_warnings ? (
                  <div style={{ padding: '12px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <CheckCircle size={18} /> No severe drug-drug interactions detected for these medications.
                  </div>
                ) : (
                  <div>
                    {interactionReport.drug_interactions.map((dw, i) => (
                      <div key={i} style={{ padding: '12px', background: 'rgba(249,115,22,0.2)', color: '#fb923c', borderRadius: '8px', marginBottom: '8px', fontSize: '12px' }}>
                        <strong>{dw.drug_a} + {dw.drug_b} ({dw.severity}): </strong>{dw.description}
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
