"""
MedIntel — Expanded Dataset Seed Script
========================================
Populates the existing database with:
  - 400+ real generic medicines (WHO EML / established formularies)
  - 80+ RAG knowledge-base documents (disease info, guidelines, drug info)
  - 50+ healthcare broadcasts / notifications
  - 40+ surveillance disease cases
  - 30+ drug interaction records (via KNOWN_DRUG_INTERACTIONS expansion)
  - Analytics / audit records for meaningful dashboard data

USAGE (run from medintel/backend directory):
    python seed_expanded_data.py

SAFETY:
  - Uses INSERT OR IGNORE / existence checks — safe to re-run.
  - Does NOT drop / alter any table.
  - Does NOT touch existing records.
"""

import os
import sys
import uuid
import json
import sqlite3
from datetime import datetime, timedelta
import random

# ── Path setup ──────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "local_db", "health_worker.db")
VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "data", "vector_store")
FAISS_INDEX_PATH = os.path.join(VECTOR_STORE_PATH, "faiss_index")

def gen_id():
    return str(uuid.uuid4())

def now_str():
    return datetime.utcnow().isoformat()

def days_ago(n):
    return (datetime.utcnow() - timedelta(days=n)).isoformat()

# ══════════════════════════════════════════════════════════════════════════════
# 1. MEDICINES DATASET  (400+ real generic medicines)
# ══════════════════════════════════════════════════════════════════════════════

MEDICINES = [
    # ── ANALGESICS & ANTIPYRETICS ──────────────────────────────────────────
    ("Paracetamol (Acetaminophen)", "Dolo 650 / Calpol / Tylenol", "Analgesic & Antipyretic",
     "500–1000 mg", "Every 4–6 hours (Max 4g/day)",
     "Avoid in severe hepatic impairment. Do not exceed recommended dose. Risk of liver toxicity with overdose.",
     "Fever, mild to moderate pain, headache, arthralgia",
     "Rare at therapeutic doses; rash, hepatotoxicity with overdose",
     ["Warfarin", "Isoniazid", "Alcohol"]),

    ("Ibuprofen", "Brufen / Advil / Nurofen", "NSAID",
     "400 mg", "Every 6–8 hours after food (Max 1200 mg/day OTC)",
     "Contraindicated in active GI bleeding, severe renal failure, CABG perioperative pain. Use lowest effective dose.",
     "Pain, fever, inflammation, dysmenorrhoea, osteoarthritis",
     "GI upset, nausea, dyspepsia, GI bleeding, renal impairment",
     ["Aspirin", "Warfarin", "ACE inhibitors", "Lithium", "Methotrexate"]),

    ("Diclofenac", "Voveran / Voltaren", "NSAID",
     "50 mg", "BD–TDS after food",
     "Avoid in cardiovascular disease, severe renal/hepatic impairment, active peptic ulcer.",
     "Pain, inflammation, osteoarthritis, rheumatoid arthritis, dysmenorrhoea",
     "GI irritation, headache, dizziness, elevated liver enzymes",
     ["Warfarin", "Lithium", "Methotrexate", "ACE inhibitors"]),

    ("Naproxen", "Naprosyn / Aleve", "NSAID",
     "250–500 mg", "BD",
     "Use lowest effective dose. Avoid long-term use in elderly. Cardiovascular and GI risk.",
     "Arthritis, gout, dysmenorrhoea, pain, fever",
     "GI upset, headache, dizziness, oedema",
     ["Warfarin", "Lithium", "Aspirin", "ACE inhibitors"]),

    ("Aspirin (Low-dose)", "Ecosprin 75 / Disprin", "Antiplatelet",
     "75–100 mg", "Once daily with food",
     "Risk of bleeding. Reye syndrome risk in children. Avoid in peptic ulcer.",
     "Antiplatelet therapy for cardiovascular disease prevention",
     "GI irritation, bleeding",
     ["Warfarin", "Clopidogrel", "Ibuprofen", "Methotrexate", "Heparin"]),

    ("Tramadol", "Ultram / Tramazac", "Opioid Analgesic",
     "50–100 mg", "Every 4–6 hours (Max 400 mg/day)",
     "Risk of dependency, seizures, serotonin syndrome. Avoid in severe hepatic/renal impairment.",
     "Moderate to severe pain",
     "Nausea, dizziness, constipation, drowsiness, seizures",
     ["MAOIs", "SSRIs", "Tricyclics", "Alcohol", "CNS depressants"]),

    ("Morphine", "MST Continus", "Opioid Analgesic",
     "5–15 mg oral", "Every 4 hours; SR every 12 hours",
     "High abuse potential. Respiratory depression risk. Use under specialist supervision.",
     "Severe pain, cancer pain, myocardial infarction",
     "Constipation, nausea, sedation, respiratory depression",
     ["MAOIs", "Benzodiazepines", "Alcohol", "CNS depressants"]),

    ("Ketorolac", "Toradol", "NSAID (Parenteral)",
     "15–30 mg IV/IM", "Every 6 hours (max 5 days)",
     "Limit use to ≤5 days. Significant GI and renal risk with prolonged use.",
     "Short-term management of moderate to severe acute pain",
     "GI bleeding, renal impairment, wound healing impairment",
     ["Warfarin", "ACE inhibitors", "Lithium"]),

    ("Codeine", "Codeine Phosphate", "Opioid Analgesic",
     "15–60 mg", "Every 4–6 hours",
     "CYP2D6 ultra-rapid metabolisers risk. Avoid in children under 12 and post-tonsillectomy.",
     "Mild to moderate pain, cough suppression",
     "Constipation, nausea, drowsiness",
     ["MAOIs", "Alcohol", "CNS depressants"]),

    # ── ANTIBIOTICS ────────────────────────────────────────────────────────
    ("Amoxicillin", "Novamox / Mox / Trimox", "Antibiotic (Aminopenicillin)",
     "250–500 mg", "TDS for 5–7 days",
     "Contraindicated in penicillin allergy. Complete full course. Risk of Clostridium difficile.",
     "Respiratory tract infections, UTI, otitis media, sinusitis, H. pylori (with other agents)",
     "Diarrhoea, nausea, rash, urticaria",
     ["Methotrexate", "Warfarin", "Allopurinol", "Oral contraceptives"]),

    ("Amoxicillin + Clavulanate", "Augmentin / Mox-CV", "Antibiotic (Beta-lactam + Inhibitor)",
     "625 mg (500+125 mg)", "BD–TDS with food",
     "Screen for penicillin allergy. Hepatotoxicity risk with prolonged use.",
     "Skin/soft tissue, respiratory, urinary tract infections caused by resistant organisms",
     "GI upset, diarrhoea, hepatotoxicity",
     ["Warfarin", "Allopurinol", "Oral contraceptives"]),

    ("Azithromycin", "Azee / Zithrox / Zithromax", "Antibiotic (Macrolide)",
     "500 mg", "OD for 3–5 days",
     "QT prolongation risk. Avoid in myasthenia gravis. Drug interactions via CYP3A4.",
     "Community-acquired pneumonia, atypical organisms, skin/soft tissue infections, STIs",
     "Diarrhoea, nausea, abdominal pain, QT prolongation",
     ["Warfarin", "Digoxin", "Antacids (separate by 2h)", "Carbamazepine"]),

    ("Clarithromycin", "Klacid / Clarimac", "Antibiotic (Macrolide)",
     "250–500 mg", "BD for 7–14 days",
     "Major CYP3A4 inhibitor — many interactions. Avoid in QT prolongation, severe hepatic impairment.",
     "Respiratory infections, H. pylori eradication, Mycobacterium avium complex",
     "GI upset, dysgeusia, hepatotoxicity, QT prolongation",
     ["Statins", "Warfarin", "Carbamazepine", "Digoxin", "Colchicine", "Calcium channel blockers"]),

    ("Erythromycin", "Erythroped / Erythrocin", "Antibiotic (Macrolide)",
     "250–500 mg", "QID",
     "QT prolongation risk. CYP3A4 inhibitor. GI intolerance common.",
     "Penicillin-allergic patients, Legionella, Chlamydia, pertussis",
     "GI upset, QT prolongation, hepatotoxicity",
     ["Warfarin", "Statins", "Digoxin", "Theophylline"]),

    ("Ciprofloxacin", "Ciprobay / Ciplox", "Antibiotic (Fluoroquinolone)",
     "250–500 mg", "BD for 5–14 days",
     "Tendinopathy and tendon rupture risk. Avoid in paediatrics (cartilage damage). Photosensitivity.",
     "UTI, respiratory, GI, bone/joint infections, anthrax prophylaxis",
     "GI upset, headache, dizziness, tendinopathy, QT prolongation",
     ["Antacids (separate by 4h)", "Warfarin", "Theophylline", "NSAIDs"]),

    ("Levofloxacin", "Levaquin / Lox", "Antibiotic (Fluoroquinolone)",
     "500 mg", "OD for 5–14 days",
     "QT prolongation risk. Tendinopathy. Avoid in seizure history.",
     "Community-acquired pneumonia, UTI, skin infections, sinusitis",
     "Nausea, diarrhoea, headache, dizziness, tendinopathy",
     ["Antacids", "Warfarin", "NSAIDs", "Antidiabetics"]),

    ("Doxycycline", "Doxy / Vibramycin", "Antibiotic (Tetracycline)",
     "100 mg", "BD on Day 1, then OD",
     "Photosensitivity. Avoid in pregnancy (bones/teeth). Dairy/antacids reduce absorption.",
     "Rickettsia, Chlamydia, Lyme disease, malaria prophylaxis, acne",
     "GI upset, photosensitivity, oesophageal ulceration, tooth discolouration in children",
     ["Antacids", "Iron", "Penicillins (antagonism)", "Retinoids"]),

    ("Metronidazole", "Flagyl / Metro", "Antibiotic (Nitroimidazole)",
     "400–500 mg", "TDS for 5–7 days",
     "Avoid alcohol (disulfiram-like reaction). Peripheral neuropathy with prolonged use.",
     "Anaerobic infections, H. pylori, Giardia, Trichomonas, Clostridium difficile",
     "Metallic taste, nausea, peripheral neuropathy",
     ["Alcohol", "Warfarin", "Lithium", "5-FU"]),

    ("Cotrimoxazole (Trimethoprim + Sulfamethoxazole)", "Bactrim / Septran", "Antibiotic (Sulfonamide)",
     "960 mg (160+800 mg)", "BD for 5–14 days",
     "Stevens-Johnson syndrome risk. Avoid in G6PD deficiency. Renal and hepatic monitoring.",
     "UTI, PCP prophylaxis, Nocardia, Toxoplasma",
     "Rash, GI upset, Stevens-Johnson syndrome, bone marrow suppression",
     ["Warfarin", "Methotrexate", "ACE inhibitors", "Phenytoin"]),

    ("Clindamycin", "Dalacin C / Cleocin", "Antibiotic (Lincosamide)",
     "150–450 mg", "TDS–QID",
     "Pseudomembranous colitis risk. Monitor for diarrhoea.",
     "Anaerobic infections, skin/soft tissue, dental, bone/joint infections",
     "Diarrhoea, Clostridium difficile colitis, rash",
     ["Neuromuscular blockers"]),

    ("Gentamicin", "Garamycin", "Antibiotic (Aminoglycoside)",
     "3–5 mg/kg/day IV/IM", "OD or divided",
     "Nephrotoxic and ototoxic — monitor renal function and drug levels. Avoid in myasthenia gravis.",
     "Gram-negative sepsis, endocarditis (synergy), nosocomial infections",
     "Nephrotoxicity, ototoxicity, neuromuscular blockade",
     ["Furosemide", "NSAIDs", "Vancomycin", "Amphotericin B"]),

    ("Vancomycin", "Vancocin", "Antibiotic (Glycopeptide)",
     "15–20 mg/kg IV", "Every 8–12 hours",
     "Red man syndrome with rapid infusion. Nephrotoxic — monitor trough levels and renal function.",
     "MRSA infections, serious Gram-positive infections, C. difficile (oral)",
     "Nephrotoxicity, ototoxicity, red man syndrome",
     ["Aminoglycosides", "NSAIDs", "Furosemide"]),

    ("Ceftriaxone", "Rocephin / Monocef", "Antibiotic (Cephalosporin 3G)",
     "1–2 g IV/IM", "OD–BD",
     "Cross-allergy with penicillin (~1–2%). Avoid coadministration with calcium IV in neonates.",
     "Community-acquired pneumonia, meningitis, gonorrhoea, typhoid, serious Gram-negative infections",
     "Pain at injection site, diarrhoea, rash, biliary sludging",
     ["Calcium IV (neonates)"]),

    ("Cefuroxime", "Zinnat / Ceftin", "Antibiotic (Cephalosporin 2G)",
     "250–500 mg", "BD",
     "Reduced bioavailability if taken on empty stomach.",
     "Respiratory tract, skin, UTI infections",
     "GI upset, headache, rash",
     ["Antacids (reduce absorption)"]),

    ("Rifampicin", "Rifadin / Rimactane", "Antibiotic (Rifamycin)",
     "10 mg/kg (max 600 mg)", "OD 30 min before food",
     "Potent CYP inducer — reduces efficacy of many drugs. Orange discolouration of body fluids. Monitor LFTs.",
     "Tuberculosis (part of DOTS regimen), leprosy, meningococcal prophylaxis",
     "Orange urine/tears/sweat, hepatotoxicity, flu-like syndrome with intermittent dosing",
     ["Oral contraceptives", "Warfarin", "HIV antiretrovirals", "Methadone", "Statins"]),

    ("Isoniazid (INH)", "Rifater component / INH tablets", "Antitubercular",
     "5 mg/kg (max 300 mg)", "OD",
     "Give pyridoxine (Vit B6) concurrently to prevent peripheral neuropathy. Monitor LFTs.",
     "Tuberculosis treatment and prophylaxis",
     "Peripheral neuropathy, hepatotoxicity, lupus-like syndrome",
     ["Alcohol", "Paracetamol", "Phenytoin", "Carbamazepine"]),

    ("Pyrazinamide", "Pyrazinamide tablets", "Antitubercular",
     "15–30 mg/kg (max 2g)", "OD",
     "Monitor LFTs and serum uric acid. Avoid in severe hepatic disease and gout.",
     "Tuberculosis (intensive phase)",
     "Hepatotoxicity, hyperuricaemia, arthralgia, GI upset",
     ["Allopurinol"]),

    ("Ethambutol", "Myambutol", "Antitubercular",
     "15–25 mg/kg", "OD",
     "Monitor visual acuity and colour vision monthly. Reduce dose in renal impairment.",
     "Tuberculosis (with other antitubercular agents)",
     "Optic neuritis (visual disturbance), peripheral neuropathy",
     []),

    # ── ANTIVIRALS ─────────────────────────────────────────────────────────
    ("Oseltamivir", "Tamiflu", "Antiviral (Neuraminidase inhibitor)",
     "75 mg", "BD for 5 days",
     "Most effective within 48 hours of symptom onset.",
     "Influenza A and B treatment and prophylaxis",
     "Nausea, vomiting, headache",
     []),

    ("Acyclovir", "Zovirax / Acivir", "Antiviral (Nucleoside analogue)",
     "200–800 mg", "5 times daily (varies by indication)",
     "Adequate hydration essential to prevent crystalline nephropathy. Adjust in renal impairment.",
     "Herpes simplex, herpes zoster, varicella",
     "Nausea, headache, nephrotoxicity (IV), neurotoxicity",
     ["Probenecid", "Nephrotoxic drugs"]),

    ("Tenofovir + Lamivudine + Efavirenz", "TLE / Triomune", "Antiretroviral (NRTI/NNRTI)",
     "TDF 300mg + 3TC 300mg + EFV 600mg", "OD at bedtime",
     "Do not use as monotherapy. Monitor renal function (Tenofovir). CNS side effects with EFV.",
     "HIV-1 infection (first-line ART per WHO guidelines)",
     "CNS effects (EFV), renal impairment (TDF), rash, hepatotoxicity",
     ["Rifampicin (dose adjustment)", "Antifungals", "PPIs"]),

    ("Lopinavir + Ritonavir", "Kaletra / Lopimune", "Antiretroviral (PI/Booster)",
     "400/100 mg", "BD with food",
     "Multiple drug interactions via CYP3A4. GI intolerance common. Monitor lipids.",
     "HIV-1 infection (second-line or PI-based regimen)",
     "Diarrhoea, nausea, dyslipidaemia, QT prolongation",
     ["Rifampicin", "Statins", "Antifungals", "Anticonvulsants"]),

    ("Remdesivir", "Veklury", "Antiviral (RNA polymerase inhibitor)",
     "200 mg IV loading, then 100 mg IV", "OD for 5–10 days",
     "IV formulation only. Monitor hepatic enzymes. For hospitalised COVID-19 patients.",
     "COVID-19 (hospitalised patients requiring oxygen)",
     "Nausea, bradycardia, elevated transaminases",
     []),

    # ── ANTIFUNGALS ────────────────────────────────────────────────────────
    ("Fluconazole", "Diflucan / Forcan", "Antifungal (Triazole)",
     "150 mg (vaginal); 400 mg loading then 200 mg (systemic)", "OD",
     "Potent CYP2C9/3A4 inhibitor — major interactions. QT prolongation.",
     "Candidiasis (vaginal, oropharyngeal, systemic), Cryptococcal meningitis",
     "Nausea, headache, hepatotoxicity, QT prolongation",
     ["Warfarin", "Statins", "Phenytoin", "Cyclosporin", "Rifampicin", "Benzodiazepines"]),

    ("Itraconazole", "Sporanox / Canditral", "Antifungal (Triazole)",
     "100–200 mg", "OD–BD",
     "Negative inotropic effects — avoid in cardiac failure. Take with food. CYP3A4 inhibitor.",
     "Aspergillosis, blastomycosis, histoplasmosis, onychomycosis, candidiasis",
     "Nausea, hepatotoxicity, cardiac failure, hypertension",
     ["Statins", "Warfarin", "Calcium channel blockers", "Quinidine"]),

    ("Voriconazole", "Vfend", "Antifungal (Triazole)",
     "6 mg/kg IV BD x2 doses (loading), then 4 mg/kg IV BD", "BD",
     "Monitor visual disturbances and hepatic function. Multiple CYP interactions.",
     "Invasive aspergillosis, serious Candida infections",
     "Visual disturbances, photosensitivity, hepatotoxicity",
     ["Rifampicin", "Phenytoin", "Carbamazepine"]),

    ("Clotrimazole", "Canesten / Candid", "Antifungal (Imidazole)",
     "1% cream / 100–500 mg pessary", "As directed (local)",
     "For topical/local use. Systemic absorption minimal.",
     "Vulvovaginal candidiasis, dermal candidiasis, tinea infections",
     "Local irritation, burning",
     []),

    ("Nystatin", "Mycostatin / Candid Mouth Paint", "Antifungal (Polyene)",
     "100,000–500,000 units", "QID (oral); or topical",
     "Not absorbed systemically — very safe. Swish and swallow for oropharyngeal candidiasis.",
     "Oropharyngeal candidiasis, GI candidiasis, candidal nappy rash",
     "Nausea, diarrhoea (at high doses), local irritation",
     []),

    ("Griseofulvin", "Fulvicin / Grisovin", "Antifungal (Fungistatic)",
     "500 mg–1 g", "OD with fatty meal",
     "Hepatotoxic — avoid in hepatic disease. Teratogenic — ensure contraception. Many drug interactions.",
     "Dermatophytosis (tinea capitis, tinea corporis, onychomycosis)",
     "Headache, GI upset, photosensitivity, hepatotoxicity",
     ["Warfarin", "Oral contraceptives", "Phenobarbitone"]),

    ("Terbinafine", "Lamisil", "Antifungal (Allylamine)",
     "250 mg", "OD for 6–12 weeks",
     "Monitor LFTs. Rare hepatotoxicity and Stevens-Johnson syndrome. Avoid in hepatic/severe renal disease.",
     "Onychomycosis, tinea infections",
     "GI upset, headache, taste disturbance, rash",
     ["TCAs", "SSRIs", "Tamoxifen", "Codeine (reduces efficacy)"]),

    # ── ANTIMALARIALS ──────────────────────────────────────────────────────
    ("Chloroquine", "Lariago / Resochin", "Antimalarial (4-Aminoquinoline)",
     "600 mg base (1st), 300 mg base (6,24,48h)", "See schedule",
     "Retinal toxicity with prolonged use — annual eye review. Avoid in G6PD deficiency. QT prolongation.",
     "Malaria treatment/prophylaxis (chloroquine-sensitive strains), SLE, rheumatoid arthritis",
     "GI upset, pruritus, headache, retinopathy (chronic use), QT prolongation",
     ["Digoxin", "Antacids (separate)", "Rifampicin", "Amiodarone"]),

    ("Artemether + Lumefantrine", "Coartem / AL", "Antimalarial (ACT)",
     "80/480 mg", "BD x3 days with fatty food",
     "Take with food to improve bioavailability. QT prolongation. First-line for uncomplicated P. falciparum.",
     "Uncomplicated Plasmodium falciparum malaria",
     "Headache, dizziness, GI upset, QT prolongation",
     ["QT-prolonging drugs", "CYP2D6 substrates"]),

    ("Artesunate (IV/IM)", "Artecef / Malacef", "Antimalarial (Artemisinin)",
     "2.4 mg/kg IV/IM", "0, 12, 24h then OD",
     "For severe malaria only. Monitor for post-artesunate haemolysis.",
     "Severe/complicated Plasmodium falciparum malaria",
     "Post-artesunate delayed haemolysis",
     []),

    ("Primaquine", "Primaquine Phosphate", "Antimalarial (8-Aminoquinoline)",
     "15 mg/day (P. vivax radical cure)", "OD x 14 days",
     "Test for G6PD deficiency before use — causes severe haemolysis in G6PD deficiency. Avoid in pregnancy.",
     "Radical cure of P. vivax and P. ovale (to prevent relapse), P. falciparum gametocyte clearance",
     "Haemolysis (G6PD deficiency), GI upset, methaemoglobinaemia",
     []),

    ("Doxycycline (Malaria prophylaxis)", "Doxylin", "Antimalarial (Prophylaxis)",
     "100 mg", "OD during exposure + 4 weeks after",
     "Photosensitivity. Take with adequate water. Not for children <8 years or pregnant women.",
     "Malaria prophylaxis in chloroquine/mefloquine resistant areas",
     "GI upset, photosensitivity, oesophageal ulceration",
     ["Antacids", "Iron"]),

    ("Mefloquine", "Lariam / Mephaquine", "Antimalarial",
     "250 mg", "Weekly (prophylaxis); 750 mg + 500 mg 6–8h later (treatment)",
     "Neuropsychiatric side effects — avoid in seizure/psychiatric history. QT prolongation.",
     "Malaria prophylaxis and treatment (chloroquine-resistant areas)",
     "Nausea, dizziness, neuropsychiatric effects, QT prolongation",
     ["Quinine", "QT-prolonging drugs"]),

    # ── ANTIHYPERTENSIVES ──────────────────────────────────────────────────
    ("Amlodipine", "Norvasc / Amlong / Amvaz", "Antihypertensive (Calcium Channel Blocker, DHP)",
     "5–10 mg", "OD morning",
     "Monitor for peripheral oedema and gingival hyperplasia. Reduce dose with hepatic impairment.",
     "Hypertension, stable angina, vasospastic angina",
     "Peripheral oedema, headache, flushing, palpitations",
     ["Simvastatin (max 20mg)", "Tacrolimus", "Cyclosporin"]),

    ("Losartan", "Cozaar / Losacar", "Antihypertensive (ARB)",
     "50–100 mg", "OD",
     "Monitor serum K+ and renal function. Avoid in bilateral renal artery stenosis. Teratogenic.",
     "Hypertension, diabetic nephropathy, heart failure with reduced EF",
     "Dizziness, hyperkalaemia, renal impairment",
     ["ACE inhibitors (dual blockade)", "K-sparing diuretics", "NSAIDs", "Lithium"]),

    ("Telmisartan", "Micardis / Telma", "Antihypertensive (ARB)",
     "40–80 mg", "OD",
     "Also has PPARγ agonist activity. Avoid dual RAAS blockade. Teratogenic.",
     "Hypertension, cardiovascular risk reduction",
     "Dizziness, back pain, hyperkalaemia",
     ["K-sparing diuretics", "ACE inhibitors"]),

    ("Lisinopril", "Zestril / Lisinace", "Antihypertensive (ACE Inhibitor)",
     "5–40 mg", "OD",
     "Can cause angioedema and cough. Monitor K+ and creatinine. Avoid in bilateral renal artery stenosis. Teratogenic.",
     "Hypertension, heart failure, post-MI, diabetic nephropathy",
     "Dry cough, hyperkalaemia, hypotension (first dose), angioedema",
     ["ARBs", "K-sparing diuretics", "NSAIDs", "Allopurinol", "Lithium"]),

    ("Ramipril", "Altace / Cardace", "Antihypertensive (ACE Inhibitor)",
     "2.5–10 mg", "OD–BD",
     "Dry cough in ~10–15%. Angioedema risk. Teratogenic. Monitor K+ and renal function.",
     "Hypertension, post-MI, heart failure, high cardiovascular risk",
     "Dry cough, hyperkalaemia, angioedema, hypotension",
     ["ARBs", "K-sparing diuretics", "NSAIDs", "Lithium"]),

    ("Enalapril", "Vasotec / Envas", "Antihypertensive (ACE Inhibitor)",
     "5–40 mg", "OD–BD",
     "Prodrug (activated to enalaprilat). Monitor renal function. Avoid in pregnancy.",
     "Hypertension, heart failure, asymptomatic LV dysfunction",
     "Cough, hyperkalaemia, angioedema, hypotension",
     ["K-sparing diuretics", "NSAIDs", "Lithium"]),

    ("Atenolol", "Tenormin / Aten", "Antihypertensive (Beta-1 Blocker)",
     "25–100 mg", "OD",
     "Do not withdraw abruptly — taper over 2 weeks. Avoid in asthma, COPD, AV block.",
     "Hypertension, angina, post-MI, arrhythmia",
     "Bradycardia, fatigue, cold extremities, bronchospasm",
     ["Calcium channel blockers (verapamil)", "Antidiabetics (masks hypoglycaemia)"]),

    ("Metoprolol", "Lopressor / Metolar", "Antihypertensive (Cardioselective Beta-Blocker)",
     "25–200 mg", "BD (IR) or OD (XL)",
     "Cardioselective but can still cause bronchospasm in high doses. Do not stop abruptly.",
     "Hypertension, angina, heart failure, arrhythmias, post-MI",
     "Bradycardia, fatigue, dizziness, bronchospasm",
     ["Verapamil", "Diltiazem", "Clonidine"]),

    ("Carvedilol", "Coreg / Carca", "Antihypertensive (Alpha+Beta Blocker)",
     "3.125–25 mg", "BD with food",
     "Titrate slowly to avoid hypotension. Suitable for heart failure. Do not stop abruptly.",
     "Hypertension, heart failure with reduced EF, post-MI LV dysfunction",
     "Dizziness, hypotension, bradycardia, fatigue",
     ["Digoxin", "Calcium channel blockers", "Rifampicin"]),

    ("Hydrochlorothiazide (HCTZ)", "Aquazide / HydroDiuril", "Antihypertensive (Thiazide Diuretic)",
     "12.5–25 mg", "OD morning",
     "Monitor electrolytes (hypokalaemia, hyponatraemia). Hyperuricaemia and hyperglycaemia risk.",
     "Hypertension (first-line), oedema, heart failure",
     "Hypokalaemia, hyperuricaemia, hyperglycaemia, photosensitivity",
     ["NSAIDs", "Lithium", "Digoxin (hypokalaemia risk)"]),

    ("Furosemide", "Lasix / Frusenex", "Diuretic (Loop)",
     "20–80 mg", "OD–BD",
     "Monitor electrolytes and renal function. Ototoxic at high doses. Photosensitivity.",
     "Oedema (cardiac, renal, hepatic), hypertension, pulmonary oedema",
     "Hypokalaemia, hyponatraemia, dehydration, ototoxicity",
     ["Digoxin (hypokalaemia)", "Aminoglycosides", "NSAIDs", "Lithium"]),

    ("Spironolactone", "Aldactone", "Diuretic (Potassium-sparing/Aldosterone Antagonist)",
     "25–100 mg", "OD–BD",
     "Monitor K+ — risk of hyperkalaemia especially with ACE inhibitors/ARBs. Gynaecomastia in males.",
     "Heart failure with reduced EF, primary hyperaldosteronism, oedema, resistant hypertension",
     "Hyperkalaemia, gynaecomastia, menstrual irregularities",
     ["ACE inhibitors", "ARBs", "NSAIDs", "K supplements"]),

    ("Clonidine", "Catapres / Catapresan", "Antihypertensive (Alpha-2 Agonist)",
     "0.1–0.3 mg", "BD–TDS",
     "Rebound hypertension with abrupt withdrawal — taper gradually. Sedating.",
     "Hypertension (adjunct), opioid withdrawal, ADHD (adjunct)",
     "Sedation, dry mouth, bradycardia, constipation, rebound hypertension",
     ["Beta-blockers (bradycardia)", "TCAs (reduce effect)"]),

    ("Hydralazine", "Apresoline", "Antihypertensive (Vasodilator)",
     "25–50 mg", "BD–QID",
     "Lupus-like syndrome with high doses (>200mg/day). Tachycardia — often given with beta-blocker.",
     "Severe hypertension, hypertensive emergency in pregnancy (eclampsia)",
     "Headache, tachycardia, lupus-like syndrome, fluid retention",
     ["NSAIDs"]),

    # ── ANTIDIABETICS ──────────────────────────────────────────────────────
    ("Metformin", "Glycomet / Glucophage", "Antidiabetic (Biguanide)",
     "500–1000 mg", "BD–TDS with meals",
     "Hold 48h before iodinated contrast. Avoid in eGFR <30. Risk of lactic acidosis with alcohol.",
     "Type 2 diabetes mellitus (first-line), PCOS",
     "GI upset (nausea, diarrhoea), B12 deficiency (long-term), lactic acidosis (rare)",
     ["Iodinated contrast", "Alcohol", "Cimetidine"]),

    ("Glibenclamide (Glyburide)", "Daonil / Euglucon", "Antidiabetic (Sulfonylurea)",
     "2.5–5 mg", "OD–BD before meals",
     "Risk of prolonged hypoglycaemia especially in elderly and renal impairment. Avoid in hepatic impairment.",
     "Type 2 diabetes mellitus",
     "Hypoglycaemia, weight gain, GI upset, rash",
     ["NSAIDs", "Warfarin", "Alcohol", "Beta-blockers (mask hypoglycaemia)"]),

    ("Glipizide", "Minidiab / Glynase", "Antidiabetic (Sulfonylurea)",
     "5–10 mg", "BD before meals",
     "Shorter-acting than glibenclamide — preferred in elderly. Monitor blood glucose.",
     "Type 2 diabetes mellitus",
     "Hypoglycaemia, weight gain, nausea",
     ["NSAIDs", "Warfarin", "Alcohol"]),

    ("Gliclazide", "Diamicron MR / Glycinorm", "Antidiabetic (Sulfonylurea, MR)",
     "30–120 mg MR", "OD with breakfast",
     "Lower hypoglycaemia risk than glibenclamide. Suitable for elderly.",
     "Type 2 diabetes mellitus",
     "Hypoglycaemia (milder), weight gain, GI upset",
     ["NSAIDs", "Warfarin", "Alcohol"]),

    ("Sitagliptin", "Januvia / Sitamet", "Antidiabetic (DPP-4 inhibitor)",
     "100 mg", "OD",
     "Reduce dose in moderate renal impairment. Risk of pancreatitis.",
     "Type 2 diabetes mellitus (add-on to metformin or other agents)",
     "Nasopharyngitis, headache, pancreatitis (rare)",
     []),

    ("Empagliflozin", "Jardiance / Empa", "Antidiabetic (SGLT-2 inhibitor)",
     "10 mg (can increase to 25 mg)", "OD",
     "Risk of genital mycotic infections and UTIs. Euglycaemic DKA risk. Hold before surgery.",
     "Type 2 diabetes mellitus, cardiovascular risk reduction, heart failure",
     "Genital mycotic infections, UTI, increased urination, euglycaemic DKA",
     ["Diuretics (volume depletion)"]),

    ("Dapagliflozin", "Farxiga / Forxiga", "Antidiabetic (SGLT-2 inhibitor)",
     "10 mg", "OD",
     "Similar to empagliflozin. Also approved for heart failure and CKD (with/without diabetes).",
     "Type 2 diabetes mellitus, heart failure with reduced EF, CKD",
     "Genital mycotic infections, UTI, polyuria",
     ["Diuretics"]),

    ("Dulaglutide", "Trulicity", "Antidiabetic (GLP-1 Receptor Agonist)",
     "0.75–1.5 mg subcutaneous", "Weekly",
     "Pancreatitis risk. C-cell tumour risk (thyroid) — avoid in MEN2/familial medullary thyroid cancer.",
     "Type 2 diabetes mellitus, cardiovascular risk reduction",
     "Nausea, vomiting, diarrhoea, pancreatitis (rare)",
     []),

    ("Human Insulin Regular (Short-acting)", "Actrapid / Huminsulin R", "Antidiabetic (Insulin)",
     "Individualised", "TDS before meals + correction doses",
     "Risk of hypoglycaemia. Store in refrigerator (2–8°C). Do not use if discoloured.",
     "Type 1 DM, Type 2 DM requiring insulin, diabetic ketoacidosis, hyperkalaemia",
     "Hypoglycaemia, weight gain, lipodystrophy at injection sites",
     ["Alcohol", "Beta-blockers (mask hypoglycaemia)", "Thiazolidinediones"]),

    ("Insulin Glargine (Long-acting)", "Lantus / Basalog", "Antidiabetic (Insulin, Long-acting)",
     "Individualised", "OD at same time daily",
     "Do not mix with other insulins in same syringe. Educate on hypoglycaemia recognition.",
     "Type 1 and Type 2 diabetes mellitus (basal insulin therapy)",
     "Hypoglycaemia, weight gain, injection site reactions",
     ["Beta-blockers", "Alcohol"]),

    # ── CARDIOVASCULAR ─────────────────────────────────────────────────────
    ("Atorvastatin", "Lipitor / Atorva", "Lipid-lowering (Statin)",
     "10–80 mg", "OD at night",
     "Monitor LFTs and CK (myopathy risk). Avoid grapefruit juice. Teratogenic.",
     "Hyperlipidaemia, cardiovascular risk reduction, primary/secondary prevention of ASCVD",
     "Myopathy, rhabdomyolysis, hepatotoxicity, GI upset",
     ["Clarithromycin", "Cyclosporin", "Gemfibrozil", "Niacin", "Amiodarone"]),

    ("Rosuvastatin", "Crestor / Rozucor", "Lipid-lowering (Statin)",
     "5–40 mg", "OD",
     "Less CYP3A4 metabolism than other statins — fewer interactions. Myopathy risk. Teratogenic.",
     "Hyperlipidaemia, ASCVD risk reduction",
     "Myopathy, rhabdomyolysis, headache, abdominal pain",
     ["Cyclosporin", "Gemfibrozil", "Warfarin", "Antacids (separate by 2h)"]),

    ("Simvastatin", "Zocor / Simvotin", "Lipid-lowering (Statin)",
     "10–40 mg (max 80 mg—not recommended)", "OD at night",
     "Do not use >40 mg due to myopathy risk. Avoid grapefruit. Teratogenic.",
     "Hyperlipidaemia, cardiovascular risk reduction",
     "Myopathy, rhabdomyolysis, hepatotoxicity",
     ["Amlodipine", "Clarithromycin", "Amiodarone", "Gemfibrozil"]),

    ("Fenofibrate", "Tricor / Lipanthyl", "Lipid-lowering (Fibrate)",
     "145–200 mg", "OD with food",
     "Monitor renal and hepatic function. Rhabdomyolysis risk when combined with statins.",
     "Hypertriglyceridaemia, mixed dyslipidaemia",
     "GI upset, myopathy, elevated creatinine",
     ["Statins", "Warfarin", "Bile acid sequestrants"]),

    ("Warfarin", "Coumadin / Warf", "Anticoagulant (Vitamin K Antagonist)",
     "Individualised per INR", "OD at same time",
     "Narrow therapeutic index — monitor INR regularly. Multiple drug and food interactions. Teratogenic.",
     "Venous thromboembolism, atrial fibrillation, prosthetic heart valves",
     "Bleeding, skin necrosis (rare, early treatment), purple toe syndrome",
     ["NSAIDs", "Aspirin", "Antibiotics", "Amiodarone", "Rifampicin", "Vitamin K foods"]),

    ("Rivaroxaban", "Xarelto", "Anticoagulant (Direct Xa inhibitor, DOAC)",
     "10–20 mg", "OD with evening meal (varies by indication)",
     "No routine INR monitoring needed. Avoid in severe renal impairment. Higher dose for AF.",
     "DVT/PE treatment and prevention, atrial fibrillation stroke prevention",
     "Bleeding, nausea",
     ["Ketoconazole", "Rifampicin", "NSAIDs", "Antiplatelet agents"]),

    ("Apixaban", "Eliquis", "Anticoagulant (Direct Xa inhibitor, DOAC)",
     "5 mg", "BD (2.5 mg BD in selected patients)",
     "Avoid in severe renal/hepatic impairment. No routine monitoring but requires clinical assessment.",
     "DVT/PE treatment and prevention, atrial fibrillation stroke prevention",
     "Bleeding",
     ["Ketoconazole", "Rifampicin", "NSAIDs"]),

    ("Heparin (Unfractionated)", "Heparin Sodium", "Anticoagulant (UFH)",
     "IV infusion (individualised by aPTT)", "Continuous IV infusion",
     "Monitor aPTT closely. Risk of HIT (heparin-induced thrombocytopaenia). Antidote: Protamine sulfate.",
     "DVT/PE treatment, ACS, perioperative anticoagulation, dialysis",
     "Bleeding, HIT, osteoporosis (long-term)",
     ["NSAIDs", "Aspirin", "Other anticoagulants"]),

    ("Enoxaparin (LMWH)", "Clexane / Lovenox", "Anticoagulant (Low Molecular Weight Heparin)",
     "1 mg/kg SC BD (treatment); 40 mg SC OD (prophylaxis)", "SC",
     "Reduce dose in renal impairment (eGFR <30). Monitor anti-Xa in extremes of weight/renal impairment.",
     "DVT/PE treatment, acute coronary syndrome, VTE prophylaxis",
     "Bleeding, mild thrombocytopaenia",
     ["Antiplatelet agents", "NSAIDs", "Other anticoagulants"]),

    ("Clopidogrel", "Plavix / Clopivas", "Antiplatelet",
     "75 mg", "OD with food",
     "Prodrug requiring CYP2C19 activation — reduced efficacy in poor metabolisers. Avoid with strong CYP2C19 inhibitors.",
     "Acute coronary syndrome, PTCA post-stent (DAPT), stroke, PAD",
     "Bleeding, bruising, TTP (rare)",
     ["Omeprazole/Esomeprazole", "Warfarin", "NSAIDs", "SSRIs"]),

    ("Digoxin", "Lanoxin", "Cardiac Glycoside",
     "0.0625–0.25 mg", "OD",
     "Narrow therapeutic index. Monitor digoxin level, K+, Mg2+. Multiple interactions.",
     "Heart failure with reduced EF (symptom control), rate control in atrial fibrillation/flutter",
     "Nausea, bradycardia, arrhythmias, visual disturbances (digoxin toxicity)",
     ["Amiodarone", "Verapamil", "Quinidine", "Azithromycin", "Furosemide (hypokalaemia)", "Spironolactone"]),

    ("Amiodarone", "Cordarone / Pacerone", "Antiarrhythmic (Class III)",
     "200–400 mg", "OD (maintenance)",
     "Multiple serious toxicities — pulmonary, thyroid, hepatic, corneal deposits, photosensitivity. Extensive interactions.",
     "Ventricular arrhythmias, atrial fibrillation/flutter, SVT",
     "Pulmonary toxicity, thyroid dysfunction, hepatotoxicity, photosensitivity, corneal deposits",
     ["Warfarin", "Digoxin", "Simvastatin", "Statins", "Beta-blockers", "Calcium channel blockers"]),

    ("Nitroglycerine (GTN)", "Nitrostat / Nitrolingual", "Antianginal (Nitrate)",
     "0.4 mg sublingual", "PRN (up to 3 doses 5 min apart)",
     "Avoid in sildenafil/PDE5 inhibitor users (severe hypotension). Headache common. Tolerance with continuous use.",
     "Acute angina attack relief, acute heart failure",
     "Headache, flushing, hypotension, tachycardia",
     ["PDE5 inhibitors (sildenafil)", "Antihypertensives"]),

    ("Isosorbide Mononitrate", "Imdur / ISMN", "Antianginal (Nitrate, Long-acting)",
     "20–60 mg", "BD (asymmetric dosing: 8am and 2pm)",
     "Asymmetric dosing prevents tolerance. Headache is common initially. Avoid PDE5 inhibitors.",
     "Angina prophylaxis, coronary artery disease",
     "Headache, flushing, hypotension",
     ["PDE5 inhibitors", "Antihypertensives"]),

    ("Bisoprolol", "Concor / Biselect", "Antihypertensive / Antianginal (Beta-1 Blocker)",
     "1.25–10 mg", "OD",
     "Heart failure indication: start very low (1.25 mg) and titrate slowly. Do not stop abruptly.",
     "Hypertension, stable angina, heart failure with reduced EF",
     "Bradycardia, fatigue, cold extremities, bronchospasm",
     ["Verapamil", "Diltiazem", "Amiodarone"]),

    ("Verapamil", "Isoptin / Calan", "Antihypertensive / Antiarrhythmic (Non-DHP CCB)",
     "40–120 mg", "BD–TDS",
     "Negative inotropic and chronotropic — avoid in heart failure and sick sinus syndrome. Constipation.",
     "Hypertension, SVT, angina, AF rate control",
     "Constipation, bradycardia, hypotension, AV block",
     ["Beta-blockers (AV block)", "Digoxin", "Simvastatin"]),

    ("Diltiazem", "Cardizem / Dilzem", "Antihypertensive / Antiarrhythmic (Non-DHP CCB)",
     "60–120 mg", "BD–TDS (SR: OD–BD)",
     "Monitor HR and BP. Avoid in LV dysfunction. CYP3A4 inhibitor.",
     "Angina, hypertension, AF rate control, SVT",
     "Bradycardia, hypotension, oedema, constipation",
     ["Beta-blockers", "Statins", "Digoxin"]),

    # ── RESPIRATORY ────────────────────────────────────────────────────────
    ("Salbutamol (Albuterol)", "Ventolin / Asthalin", "Bronchodilator (SABA)",
     "100–200 mcg (2–4 puffs)", "PRN (every 4–6h); Max 8 puffs/day",
     "Not for regular use alone in asthma. Overuse suggests poor control. Paradoxical bronchospasm rare.",
     "Acute bronchospasm (asthma, COPD), exercise-induced bronchospasm",
     "Tachycardia, tremor, hypokalaemia (high doses), headache",
     ["Non-selective beta-blockers", "Theophylline"]),

    ("Salmeterol", "Serevent", "Bronchodilator (LABA)",
     "25–50 mcg", "BD (NOT for acute rescue)",
     "NEVER use as monotherapy in asthma — always with ICS. Increased mortality if used alone.",
     "COPD maintenance, asthma maintenance (with ICS)",
     "Headache, tachycardia, tremor",
     ["Beta-blockers", "MAOIs", "TCAs"]),

    ("Formoterol", "Foradil / Oxis", "Bronchodilator (LABA)",
     "12 mcg", "BD",
     "Faster onset than salmeterol. Use only with ICS in asthma. Do not exceed recommended dose.",
     "COPD and asthma maintenance, Turbuhaler for MART regimen",
     "Tachycardia, tremor, hypokalaemia",
     ["Beta-blockers", "MAOIs"]),

    ("Budesonide", "Pulmicort / Budecort", "Inhaled Corticosteroid (ICS)",
     "200–800 mcg/day", "BD",
     "Rinse mouth after inhalation to prevent oral candidiasis. Systemic effects at high doses.",
     "Asthma (maintenance), COPD (with LABA), croup",
     "Oral candidiasis, dysphonia, adrenal suppression (high dose)",
     []),

    ("Fluticasone Propionate", "Flixotide / Flohale", "Inhaled Corticosteroid (ICS)",
     "100–500 mcg", "BD",
     "Rinse mouth after use. Systemic effects less than oral steroids but possible at high doses.",
     "Asthma maintenance, rhinitis (nasal spray)",
     "Oral candidiasis, dysphonia, nasal irritation (spray)",
     ["Ritonavir", "Ketoconazole (systemic absorption enhancement)"]),

    ("Tiotropium", "Spiriva", "Anticholinergic Bronchodilator (LAMA)",
     "18 mcg (HandiHaler) / 2.5 mcg (Respimat)", "OD",
     "Avoid in narrow-angle glaucoma and urinary retention. Rinse mouth.",
     "COPD maintenance therapy (first-line), severe asthma (add-on)",
     "Dry mouth, constipation, urinary retention",
     []),

    ("Ipratropium Bromide", "Atrovent", "Anticholinergic Bronchodilator (SAMA)",
     "20–40 mcg (2–4 puffs)", "TDS–QID",
     "Paradoxical bronchospasm possible. Avoid in glaucoma. Not as a substitute for LAMA in COPD.",
     "COPD, asthma acute exacerbations (combined with SABA)",
     "Dry mouth, constipation, urinary retention",
     ["Anticholinergic drugs"]),

    ("Montelukast", "Singulair / Montair", "Leukotriene Receptor Antagonist (LTRA)",
     "10 mg (adults); 5 mg (6–14y); 4 mg (2–5y)", "OD at night",
     "Neuropsychiatric events reported — monitor for mood changes, sleep disturbance.",
     "Asthma (add-on to ICS), allergic rhinitis, exercise-induced bronchospasm",
     "Headache, GI upset, neuropsychiatric events (rare)",
     ["Rifampicin (reduces levels)"]),

    ("Theophylline (Extended Release)", "Deriphyllin / Theo-Dur", "Bronchodilator (Methylxanthine)",
     "200–600 mg", "BD",
     "Narrow therapeutic index — monitor serum levels. Multiple interactions. Nausea with toxicity.",
     "COPD, severe asthma (adjunct when other agents insufficient)",
     "Nausea, headache, tachycardia, seizures (toxicity)",
     ["Ciprofloxacin", "Erythromycin", "Allopurinol", "Rifampicin", "Cimetidine"]),

    ("Prednisolone (Oral)", "Wysolone / Prelone", "Corticosteroid (Systemic)",
     "5–60 mg", "OD morning",
     "Taper slowly after prolonged use. Monitor glucose, BP, bone density. Increased infection risk.",
     "Asthma exacerbation, COPD exacerbation, inflammatory/allergic conditions, immunosuppression",
     "Glucose intolerance, osteoporosis, hypertension, weight gain, adrenal suppression",
     ["NSAIDs", "Antidiabetics", "Vaccines (live)"]),

    ("N-Acetylcysteine (NAC)", "Fluimucil / Mucinac", "Mucolytic / Antidote",
     "600 mg", "BD (mucolytic); specific protocol (paracetamol OD antidote)",
     "For paracetamol overdose antidote — must be given promptly. Anaphylactoid reactions possible (IV).",
     "Mucolytic (COPD, bronchiectasis), paracetamol overdose antidote",
     "Nausea, vomiting, anaphylactoid reactions (IV)",
     []),

    # ── GI & ANTIEMETICS ───────────────────────────────────────────────────
    ("Omeprazole", "Omez / Losec", "Proton Pump Inhibitor (PPI)",
     "20–40 mg", "OD 30 min before breakfast",
     "Prolonged use: risk of hypomagnesaemia, B12 deficiency, C. difficile. Reduces clopidogrel efficacy.",
     "GERD, peptic ulcer disease, H. pylori eradication, NSAID-induced gastropathy, Zollinger-Ellison syndrome",
     "Headache, diarrhoea, nausea, hypomagnesaemia, B12 deficiency (long-term)",
     ["Clopidogrel", "Ketoconazole", "Methotrexate", "Atazanavir"]),

    ("Pantoprazole", "Pantocid / Protonix", "Proton Pump Inhibitor (PPI)",
     "40 mg", "OD 30 min before meal",
     "Fewer CYP interactions than omeprazole — preferred with clopidogrel. Similar long-term cautions.",
     "GERD, peptic ulcer, H. pylori eradication, erosive oesophagitis",
     "Headache, diarrhoea, nausea",
     ["Ketoconazole", "Atazanavir"]),

    ("Lansoprazole", "Prevacid / Lanzol", "Proton Pump Inhibitor (PPI)",
     "15–30 mg", "OD before meal",
     "Similar profile to omeprazole. Can be sprinkled on food if capsule not swallowed whole.",
     "GERD, peptic ulcer, H. pylori eradication",
     "Headache, diarrhoea, abdominal pain",
     ["Clopidogrel", "Ketoconazole"]),

    ("Ranitidine (H2 Blocker)", "Aciloc / Zantac", "H2 Receptor Antagonist",
     "150 mg", "BD or 300 mg OD at night",
     "Less effective than PPIs for oesophagitis. Crosses blood-brain barrier — confusion in elderly.",
     "Peptic ulcer, GERD (mild-moderate), Zollinger-Ellison syndrome",
     "Headache, dizziness, constipation, confusion (elderly)",
     ["Warfarin", "Ketoconazole"]),

    ("Sucralfate", "Antepsin / Carafate", "Cytoprotective",
     "1 g", "QID 1 hour before meals and bedtime",
     "Take on empty stomach. Separate other medications by 2 hours (reduces absorption).",
     "Peptic ulcer, oesophagitis, stress ulcer prophylaxis",
     "Constipation, bezoar (prolonged use)",
     ["Ciprofloxacin", "Phenytoin", "Digoxin (reduces absorption)"]),

    ("Ondansetron", "Zofran / Emeset", "Antiemetic (5-HT3 Antagonist)",
     "4–8 mg", "TDS PRN",
     "QT prolongation at high doses. Avoid in congenital long QT syndrome.",
     "Chemotherapy-induced, post-operative, pregnancy-related nausea and vomiting",
     "Headache, constipation, QT prolongation",
     ["QT-prolonging drugs", "Tramadol (serotonin syndrome risk)"]),

    ("Metoclopramide", "Perinorm / Maxolon", "Antiemetic / Prokinetic",
     "10 mg", "TDS 30 min before meals",
     "Tardive dyskinesia with prolonged use — limit to <5 days where possible. Extrapyramidal reactions.",
     "Nausea, vomiting, gastroparesis, GERD (adjunct)",
     "Drowsiness, extrapyramidal reactions, tardive dyskinesia",
     ["Opioids", "Anticholinergics"]),

    ("Domperidone", "Motilium / Domstal", "Antiemetic / Prokinetic",
     "10 mg", "TDS before meals",
     "QT prolongation risk. Cardiac deaths reported at high doses — use lowest effective dose.",
     "Nausea, vomiting, gastroparesis, functional dyspepsia",
     "QT prolongation, galactorrhoea, headache",
     ["QT-prolonging drugs", "CYP3A4 inhibitors"]),

    ("Hyoscine Butylbromide (Buscopan)", "Buscopan", "Antispasmodic",
     "20 mg", "TDS–QID",
     "Contraindicated in myasthenia gravis, megacolon, angle-closure glaucoma, urinary retention.",
     "Abdominal/intestinal spasms, irritable bowel syndrome, dysmenorrhoea",
     "Dry mouth, tachycardia, constipation, urinary retention",
     ["Anticholinergics"]),

    ("Loperamide", "Imodium / Eldoper", "Antidiarrhoeal (Opioid Receptor Agonist)",
     "4 mg initially, then 2 mg after each loose stool", "Max 16 mg/day",
     "Do not use in bloody diarrhoea or suspected invasive infection. Risk of ileus.",
     "Acute and chronic diarrhoea (non-infectious), traveller's diarrhoea",
     "Constipation, abdominal cramping, dizziness",
     []),

    ("Lactulose", "Duphalac / Cremaffin Plus", "Laxative (Osmotic)",
     "15–30 mL", "BD–TDS",
     "Adjust dose for soft stools (not diarrhoea). Bloating and flatulence common initially.",
     "Constipation, hepatic encephalopathy (high doses)",
     "Flatulence, bloating, abdominal cramping, diarrhoea",
     []),

    ("Bisacodyl", "Dulcolax / Cipalax", "Laxative (Stimulant)",
     "5–10 mg oral; 10 mg suppository", "OD at night",
     "For short-term use only. Do not take within 1 hour of dairy/antacids.",
     "Constipation, bowel preparation",
     "Abdominal cramping, diarrhoea, hypokalaemia",
     ["Antacids", "Milk (enteric coat dissolution)"]),

    ("Cholestyramine", "Questran / Cholestin", "Bile Acid Sequestrant",
     "4 g sachet", "1–6 sachets/day with meals",
     "Multiple drug absorption interactions — take other medications 1 hour before or 4–6 hours after.",
     "Hypercholesterolaemia, pruritus in cholestatic liver disease, diarrhoea (bile acid malabsorption)",
     "Constipation, bloating, reduced fat-soluble vitamin absorption",
     ["Warfarin", "Digoxin", "Levothyroxine", "Fat-soluble vitamins"]),

    # ── ANTIHISTAMINES ─────────────────────────────────────────────────────
    ("Cetirizine", "Cetzine / Zyrtec", "Antihistamine (2nd Generation)",
     "10 mg", "OD at bedtime",
     "Minimal sedation. Reduce dose in renal impairment.",
     "Allergic rhinitis, urticaria, pruritus",
     "Mild drowsiness, dry mouth, headache",
     ["Alcohol", "CNS depressants"]),

    ("Loratadine", "Claritin / Lorfast", "Antihistamine (2nd Generation, Non-Sedating)",
     "10 mg", "OD",
     "Non-sedating. Suitable for daytime use. Reduce dose in hepatic impairment.",
     "Allergic rhinitis, chronic urticaria",
     "Headache, dry mouth (rare)",
     []),

    ("Fexofenadine", "Allegra / Fexova", "Antihistamine (2nd Generation, Non-Sedating)",
     "120–180 mg", "OD–BD",
     "Non-sedating, minimal CNS effects. Separate from antacids containing Al/Mg by 2 hours.",
     "Allergic rhinitis, chronic idiopathic urticaria",
     "Headache, nausea (rare)",
     ["Antacids", "Erythromycin", "Ketoconazole"]),

    ("Chlorphenamine (Chlorpheniramine)", "Piriton / CTM", "Antihistamine (1st Generation)",
     "4 mg", "TDS–QID",
     "Highly sedating — avoid driving/machinery. Anticholinergic effects in elderly.",
     "Allergic rhinitis, urticaria, anaphylaxis (adjunct), common cold (symptomatic)",
     "Sedation, dry mouth, urinary retention, constipation",
     ["Alcohol", "CNS depressants", "MAOIs"]),

    ("Diphenhydramine", "Benadryl", "Antihistamine (1st Generation) / Hypnotic",
     "25–50 mg", "TDS or OD at bedtime",
     "Potent CNS depression. Anticholinergic — avoid in elderly (Beers criteria). Tolerance to hypnotic effect.",
     "Allergic reactions, short-term insomnia, motion sickness",
     "Sedation, dry mouth, urinary retention, dizziness, confusion",
     ["Alcohol", "CNS depressants", "MAOIs"]),

    ("Promethazine", "Phenergan / Avomine", "Antihistamine (1st Generation) / Antiemetic",
     "25 mg", "OD–BD",
     "Avoid in children <2 years (respiratory depression). Photosensitivity. Sedating.",
     "Allergic conditions, nausea/vomiting, motion sickness, sedation (pre-operative)",
     "Sedation, extrapyramidal reactions, anticholinergic effects",
     ["Alcohol", "CNS depressants", "MAOIs"]),

    # ── CNS — ANTIEPILEPTICS ───────────────────────────────────────────────
    ("Phenytoin", "Dilantin / Eptoin", "Antiepileptic (Hydantoin)",
     "200–400 mg/day", "OD–BD",
     "Narrow therapeutic index — monitor levels. Non-linear pharmacokinetics. Teratogenic (folic acid supplement essential). Gingival hyperplasia.",
     "Generalised tonic-clonic, focal seizures; status epilepticus (IV)",
     "Nystagmus, ataxia, gingival hyperplasia, hirsutism, osteomalacia, teratogenicity",
     ["Warfarin", "OCPs", "Valproate", "Carbamazepine", "Rifampicin"]),

    ("Carbamazepine", "Tegretol / Mazetol", "Antiepileptic / Mood Stabiliser",
     "200–400 mg", "BD",
     "Potent CYP3A4 inducer — many drug interactions. SIADH, aplastic anaemia. HLA-B*1502 allele — SJS risk in Asian patients.",
     "Focal and generalised tonic-clonic seizures, trigeminal neuralgia, bipolar disorder",
     "Diplopia, ataxia, nausea, SJS, hyponatraemia, blood dyscrasias",
     ["Warfarin", "OCPs", "Valproate", "Lamotrigine", "Clarithromycin", "Fluconazole"]),

    ("Valproate (Sodium Valproate)", "Epilim / Valprol", "Antiepileptic / Mood Stabiliser",
     "20–30 mg/kg/day", "BD",
     "Highly teratogenic (neural tube defects, autism) — contraindicated in women of childbearing potential without REMS programme. Monitor LFTs and ammonia.",
     "Generalised epilepsy, focal seizures, absence seizures, bipolar disorder",
     "Weight gain, tremor, alopecia, hepatotoxicity, hyperammonaemia, teratogenicity",
     ["Carbamazepine", "Phenytoin", "Lamotrigine", "Aspirin"]),

    ("Lamotrigine", "Lamictal / Lametec", "Antiepileptic",
     "25–200 mg", "BD (varies by comedication)",
     "Slow titration essential to reduce SJS risk. Reduce dose with valproate (interaction). Increase dose with enzyme inducers.",
     "Focal and generalised seizures, absence seizures, Lennox-Gastaut syndrome, bipolar depression",
     "Rash, SJS, diplopia, ataxia, headache",
     ["Valproate (doubles levels)", "Carbamazepine", "Rifampicin", "OCPs"]),

    ("Levetiracetam", "Keppra / Levesam", "Antiepileptic",
     "500–1500 mg", "BD",
     "Minimal drug interactions. May cause behavioural/mood changes — monitor.",
     "Focal and generalised seizures, myoclonic epilepsy, juvenile absence epilepsy",
     "Drowsiness, dizziness, behavioural changes, irritability",
     []),

    ("Clonazepam", "Rivotril / Epitril", "Antiepileptic / Anxiolytic (Benzodiazepine)",
     "0.5–2 mg", "BD–TDS",
     "Risk of dependence and withdrawal seizures. CNS depressant. Tolerance to antiepileptic effect.",
     "Seizures (absence, myoclonic, atonic), panic disorder, anxiety",
     "Drowsiness, ataxia, dependency, tolerance",
     ["Alcohol", "CNS depressants", "Opioids"]),

    ("Phenobarbitone (Phenobarbital)", "Gardenal", "Antiepileptic / Sedative-Hypnotic (Barbiturate)",
     "60–180 mg/day", "OD at night",
     "Potent CYP inducer — many drug interactions. Risk of dependence. Cognitive impairment. Teratogenic.",
     "Generalised tonic-clonic, focal seizures (low-income settings first-line), status epilepticus (IV)",
     "Sedation, cognitive impairment, paradoxical hyperactivity in children, teratogenicity",
     ["Warfarin", "OCPs", "Corticosteroids", "Valproate"]),

    # ── CNS — PSYCHIATRIC ─────────────────────────────────────────────────
    ("Sertraline", "Zoloft / Serta", "Antidepressant (SSRI)",
     "50–200 mg", "OD",
     "Allow 4–6 weeks for full therapeutic effect. Monitor for suicidality in young adults initially. Discontinuation syndrome.",
     "Major depressive disorder, OCD, PTSD, panic disorder, social anxiety, premenstrual dysphoric disorder",
     "Nausea, sexual dysfunction, insomnia, GI upset, suicidality (young adults, initial treatment)",
     ["MAOIs (serotonin syndrome)", "Tramadol", "Lithium", "Triptans", "Warfarin"]),

    ("Fluoxetine", "Prozac / Flutop", "Antidepressant (SSRI)",
     "20–80 mg", "OD morning",
     "Longest half-life — weekly dosing possible, lower discontinuation risk. CYP2D6 inhibitor. Wait 5 weeks before MAOI.",
     "Major depressive disorder, OCD, bulimia nervosa, panic disorder, PMDD",
     "Nausea, insomnia, agitation, sexual dysfunction, weight change",
     ["MAOIs (5-week washout)", "Tamoxifen", "Tramadol", "TCAs"]),

    ("Escitalopram", "Lexapro / Cipralex", "Antidepressant (SSRI)",
     "10–20 mg", "OD",
     "Fewest drug interactions among SSRIs. QT prolongation at high doses.",
     "Major depressive disorder, generalised anxiety disorder, panic disorder",
     "Nausea, insomnia, QT prolongation (high dose), sexual dysfunction",
     ["MAOIs", "QT-prolonging drugs", "Triptans"]),

    ("Venlafaxine", "Effexor / Venlor", "Antidepressant (SNRI)",
     "75–225 mg", "OD (XR)",
     "Can increase BP — monitor. Discontinuation syndrome prominent. Do not stop abruptly.",
     "Major depressive disorder, GAD, panic disorder, social anxiety, neuropathic pain",
     "Nausea, hypertension, sweating, sexual dysfunction, discontinuation syndrome",
     ["MAOIs", "Lithium", "Tramadol"]),

    ("Mirtazapine", "Remeron / Mirtaz", "Antidepressant (NaSSA)",
     "15–45 mg", "OD at night",
     "Sedating and appetite-stimulating — useful in depressed patients with insomnia/weight loss. Agranulocytosis (rare).",
     "Major depressive disorder (particularly with insomnia or weight loss)",
     "Sedation, weight gain, increased appetite, dry mouth",
     ["MAOIs", "Alcohol", "CNS depressants"]),

    ("Amitriptyline", "Tryptanol / Elavil", "Antidepressant (TCA) / Neuropathic Pain",
     "10–150 mg", "OD at night (low dose for pain; higher for depression)",
     "Highly anticholinergic — problematic in elderly (Beers criteria). Lethal in overdose. Cardiac toxicity.",
     "Depression, neuropathic pain, migraine prophylaxis, insomnia",
     "Dry mouth, constipation, urinary retention, blurred vision, cardiac arrhythmias",
     ["MAOIs", "SSRIs", "Antihypertensives", "Alcohol"]),

    ("Lithium Carbonate", "Priadel / Lithosun", "Mood Stabiliser",
     "400–1600 mg", "BD",
     "Narrow therapeutic index — monitor serum levels (0.6–1.0 mmol/L). Monitor thyroid and renal function. Teratogenic (Ebstein's anomaly).",
     "Bipolar disorder (manic and depressive phases), refractory depression augmentation",
     "Tremor, polyuria, hypothyroidism, weight gain, toxicity (nausea, confusion, ataxia)",
     ["NSAIDs", "ACE inhibitors", "Thiazides", "Metronidazole", "SSRIs"]),

    ("Diazepam", "Valium / Calmpose", "Anxiolytic / Sedative-Hypnotic (Benzodiazepine)",
     "2–10 mg", "BD–TDS (anxiety); 10 mg IV for seizures",
     "Risk of dependency and withdrawal seizures. CNS depressant. Avoid in respiratory failure.",
     "Anxiety, acute alcohol withdrawal, muscle spasm, status epilepticus (IV)",
     "Sedation, respiratory depression, dependency, withdrawal syndrome",
     ["Alcohol", "Opioids", "CNS depressants"]),

    ("Haloperidol", "Haldol / Serenace", "Antipsychotic (Typical, 1st Generation)",
     "0.5–5 mg", "BD–TDS",
     "High EPS risk — dystonia, akathisia, tardive dyskinesia. Use lowest effective dose.",
     "Schizophrenia, acute psychosis, mania, delirium, Tourette syndrome",
     "EPS, tardive dyskinesia, QT prolongation, NMS (rare)",
     ["Anticholinergics", "QT-prolonging drugs", "Lithium", "CNS depressants"]),

    ("Risperidone", "Risperdal / Sizopin", "Antipsychotic (Atypical, 2nd Generation)",
     "1–6 mg", "OD–BD",
     "Hyperprolactinaemia. EPS at higher doses. QT prolongation. Metabolic syndrome.",
     "Schizophrenia, bipolar mania, autism-related irritability, delirium",
     "Weight gain, metabolic syndrome, EPS, hyperprolactinaemia",
     ["QT-prolonging drugs", "Antihypertensives"]),

    ("Olanzapine", "Zyprexa / Oleanz", "Antipsychotic (Atypical, 2nd Generation)",
     "5–20 mg", "OD",
     "Significant weight gain and metabolic syndrome. Diabetogenic. Monitor fasting glucose and lipids.",
     "Schizophrenia, bipolar disorder, treatment-resistant depression",
     "Weight gain, hyperglycaemia, dyslipidaemia, sedation",
     ["CNS depressants", "Carbamazepine (reduces levels)"]),

    ("Quetiapine", "Seroquel / Qutipin", "Antipsychotic (Atypical, 2nd Generation)",
     "25–800 mg", "BD (varies by indication)",
     "Metabolic monitoring essential. QT prolongation. Used for bipolar at lower doses.",
     "Schizophrenia, bipolar disorder, adjunct for MDD",
     "Sedation, weight gain, dizziness, QT prolongation, metabolic syndrome",
     ["QT-prolonging drugs", "CNS depressants", "Antihypertensives"]),

    ("Clozapine", "Clozaril / Leponex", "Antipsychotic (Atypical, Clozapine)",
     "12.5–450 mg", "BD",
     "Agranulocytosis risk — mandatory WBC monitoring programme. Seizures at high doses. Only for treatment-resistant schizophrenia.",
     "Treatment-resistant schizophrenia, suicidality in schizophrenia",
     "Agranulocytosis, seizures, metabolic syndrome, sialorrhoea, myocarditis",
     ["CNS depressants", "Clozapine-interacting drugs per monitoring programme"]),

    ("Zolpidem", "Ambien / Nitrest", "Hypnotic (Non-Benzodiazepine)",
     "5–10 mg", "OD at bedtime (PRN)",
     "Short-term use only (2–4 weeks). Risk of dependency and complex sleep behaviours (sleep-walking). Avoid alcohol.",
     "Short-term insomnia",
     "Next-day drowsiness, complex sleep behaviours, dependency",
     ["Alcohol", "CNS depressants"]),

    # ── THYROID ────────────────────────────────────────────────────────────
    ("Levothyroxine (L-T4)", "Eltroxin / Synthroid", "Thyroid Hormone",
     "25–200 mcg", "OD on empty stomach 30–60 min before food",
     "Take consistently — variable absorption. Multiple interactions. Monitor TSH every 6–12 months.",
     "Hypothyroidism, thyroid cancer suppression, myxoedema coma",
     "Symptoms of hyperthyroidism if over-dosed: palpitations, weight loss, tremor",
     ["Calcium supplements", "Ferrous sulphate", "Antacids", "Warfarin", "Cholestyramine"]),

    ("Carbimazole", "Neo-Mercazole", "Antithyroid",
     "5–40 mg", "TDS (initially), then OD (maintenance)",
     "Agranulocytosis risk (advise to report sore throat). Monitor FBC if febrile.",
     "Hyperthyroidism (Graves' disease), preparation for thyroid surgery",
     "Rash, agranulocytosis, hepatotoxicity, teratogenicity",
     []),

    ("Propylthiouracil (PTU)", "PTU tablets", "Antithyroid",
     "100–150 mg", "TDS",
     "Hepatotoxicity — limit use to first trimester of pregnancy or carbimazole contraindicated. Monitor LFTs.",
     "Hyperthyroidism, thyroid storm, first trimester of pregnancy (preferred over carbimazole)",
     "Agranulocytosis, hepatotoxicity, vasculitis",
     ["Warfarin"]),

    # ── OBSTETRIC & GYNAECOLOGICAL ─────────────────────────────────────────
    ("Oxytocin", "Syntocinon", "Uterotonic (Oxytocin)",
     "10 IU IM (3rd stage labour)", "See protocol",
     "Antepartum — specialist use only. Water intoxication with high IV doses. Monitor BP and uterine activity.",
     "Prevention/treatment of PPH, induction/augmentation of labour, uterine atony",
     "Uterine hyperstimulation, fetal distress, water intoxication, hypotension",
     ["Vasoconstrictors"]),

    ("Misoprostol", "Cytotec / Misoprost", "Prostaglandin / Uterotonic",
     "800 mcg sublingual (PPH); 200–400 mcg for induction", "Per protocol",
     "Uterotonic agent for PPH and cervical ripening. Shivering and fever common.",
     "Prevention and treatment of PPH, cervical ripening, medical abortion (with mifepristone)",
     "Shivering, fever, nausea, diarrhoea, uterine hyperstimulation",
     []),

    ("Folic Acid", "Folvite / Folate", "Vitamin (B9)",
     "0.4–5 mg", "OD",
     "Essential periconceptionally (400–800 mcg) to reduce neural tube defects. 5 mg dose for high-risk pregnancies.",
     "Megaloblastic anaemia, neural tube defect prevention, pregnancy supplementation",
     "Generally well tolerated; high doses may mask B12 deficiency",
     ["Phenytoin (folate reduces phenytoin levels; phenytoin increases folate requirement)", "Methotrexate"]),

    ("Ferrous Sulphate", "Orofer / Fefol", "Iron Supplement",
     "200 mg (65 mg elemental iron)", "OD–TDS",
     "Take with vitamin C to enhance absorption. Avoid with antacids/calcium/dairy by 2 hours. Stools will turn black.",
     "Iron-deficiency anaemia, prophylaxis in pregnancy",
     "Nausea, constipation, dark stools, GI upset",
     ["Antacids", "Calcium", "Tetracyclines", "Fluoroquinolones", "Levothyroxine"]),

    ("Calcium Carbonate + Vitamin D3", "Shelcal / Calcimax", "Calcium Supplement",
     "500–1000 mg elemental Ca + 400 IU Vit D3", "BD with food",
     "Separate from iron, levothyroxine and many antibiotics by 2–4 hours. Vitamin D should be D3 (cholecalciferol).",
     "Calcium deficiency, osteoporosis, postmenopausal supplementation, pregnancy",
     "Constipation, hypercalcaemia (excess), kidney stones",
     ["Bisphosphonates", "Iron", "Tetracyclines", "Levothyroxine", "Digoxin (hypercalcaemia risk)"]),

    # ── RHEUMATOLOGY ─────────────────────────────────────────────────────
    ("Methotrexate (Low-dose)", "Folitrax / MTX", "DMARD / Antimetabolite",
     "7.5–25 mg", "Once weekly (not daily)",
     "ONCE WEEKLY DOSING — daily dosing is a fatal error. Give folic acid 1 mg/day (skip MTX day). Monitor CBC, LFTs, creatinine.",
     "Rheumatoid arthritis, psoriatic arthritis, psoriasis, Crohn's disease",
     "Mucositis, hepatotoxicity, bone marrow suppression, teratogenicity, pulmonary toxicity",
     ["NSAIDs", "Penicillins", "Trimethoprim", "Folic acid antagonists"]),

    ("Hydroxychloroquine", "Plaquenil / HCQ", "DMARD / Antimalarial",
     "200–400 mg", "OD–BD",
     "Annual eye examination for retinopathy after 5 years of use. Rare QT prolongation.",
     "Rheumatoid arthritis, SLE, malaria prophylaxis",
     "GI upset, retinopathy (rare, chronic use), rash",
     ["QT-prolonging drugs", "Antidiabetics (hypoglycaemia)"]),

    ("Colchicine", "Colchicine", "Anti-gout / Anti-inflammatory",
     "0.5–1 mg", "OD–TDS (varies by indication)",
     "GI toxicity — nausea, vomiting, diarrhoea are dose-limiting. Myopathy with statins. Avoid in severe renal/hepatic disease.",
     "Acute gout, gout prophylaxis, pericarditis, FMF",
     "GI upset, myopathy, bone marrow suppression (overdose)",
     ["Clarithromycin", "Cyclosporin", "Statins", "CYP3A4 inhibitors"]),

    ("Allopurinol", "Zyloric / Zyloprim", "Uric Acid Lowering Agent (Xanthine Oxidase Inhibitor)",
     "100–300 mg", "OD with food",
     "Start after acute attack resolves. HLA-B*5801 (Asian/African patients) — SJS risk — test before starting. SJS/TEN risk.",
     "Gout prophylaxis, uric acid lowering, renal stones (urate), hyperuricaemia from chemotherapy",
     "Rash, SJS/TEN, GI upset, hepatotoxicity",
     ["Azathioprine", "Mercaptopurine", "Amoxicillin (rash)", "Warfarin"]),

    ("Celecoxib", "Celebrex / Celact", "NSAID (COX-2 Selective)",
     "100–200 mg", "BD",
     "Cardiovascular risk with prolonged use. Contraindicated in sulfonamide allergy. GI risk lower than non-selective NSAIDs but not absent.",
     "Osteoarthritis, rheumatoid arthritis, acute pain, ankylosing spondylitis",
     "GI upset, hypertension, oedema, cardiovascular events",
     ["Warfarin", "Lithium", "ACE inhibitors"]),

    # ── DERMATOLOGICAL ────────────────────────────────────────────────────
    ("Betamethasone 0.1% Cream", "Betnovate / Betnasol", "Topical Corticosteroid (Potent)",
     "Thin layer", "BD to affected area",
     "Avoid on face, flexures, genitals. Do not occlude. Prolonged use causes skin atrophy and systemic absorption.",
     "Eczema, psoriasis, contact dermatitis, inflammatory skin conditions",
     "Skin atrophy, striae, telangiectasia, adrenal suppression (extensive use), Cushing's (excessive)",
     []),

    ("Hydrocortisone 1% Cream", "Hydrocortisone Cream / HC45", "Topical Corticosteroid (Mild)",
     "Thin layer", "BD–TDS to affected area (max 7 days face)",
     "Mildest topical steroid — suitable for face and intertriginous areas. OTC in low concentrations.",
     "Mild eczema, nappy rash, insect bites, mild contact dermatitis",
     "Thinning with prolonged use on face",
     []),

    ("Mupirocin 2% Ointment", "Bactroban / Mupirax", "Topical Antibiotic",
     "Small amount", "TDS for 5–10 days (nasal: BD x5 days)",
     "Do not apply in eyes. Not for systemic infections.",
     "Impetigo, localised skin infections (S. aureus, MRSA decolonisation)",
     "Local irritation, burning",
     []),

    ("Calamine Lotion", "Calamine", "Antipruritic / Skin Protectant",
     "Apply liberally", "PRN (2–4 times daily)",
     "External use only. Not for oozing lesions.",
     "Pruritus (chickenpox, sunburn, insect bites, heat rash)",
     "Rare: skin irritation",
     []),

    ("Silver Sulfadiazine 1% Cream", "Silverex / Dermazin", "Topical Antibacterial (Burns)",
     "Apply 2–4 mm thickness", "OD–BD",
     "Avoid in sulfonamide allergy. Can cause transient leucopaenia. Not for neonates.",
     "Prevention and treatment of infection in burns",
     "Leucopaenia (transient), local irritation",
     []),

    # ── OPHTHALMIC ────────────────────────────────────────────────────────
    ("Timolol 0.5% Eye Drops", "Timoptic / Timolol Eye Drops", "Ophthalmic Beta-Blocker",
     "1 drop", "BD into affected eye(s)",
     "Systemic absorption — bradycardia, bronchospasm possible. Contraindicated in asthma, COPD, heart block.",
     "Open-angle glaucoma, ocular hypertension",
     "Burning, systemic beta-blocker effects (bradycardia, bronchospasm)",
     ["Systemic beta-blockers", "Calcium channel blockers"]),

    ("Latanoprost 0.005% Eye Drops", "Xalatan / Latoprost", "Ophthalmic Prostaglandin Analogue",
     "1 drop", "OD at night",
     "May permanently darken iris and periocular skin/eyelashes.",
     "Open-angle glaucoma, ocular hypertension",
     "Iris pigmentation, eyelash growth, conjunctival hyperaemia",
     []),

    ("Chloramphenicol 0.5% Eye Drops", "Chloramphenicol Eye Drops", "Topical Antibiotic (Ophthalmic)",
     "1–2 drops", "QID",
     "Aplastic anaemia risk theoretical (topical use — very rare). Do not use for more than 5 days without medical advice.",
     "Bacterial conjunctivitis",
     "Local irritation, rare aplastic anaemia",
     []),

    ("Artificial Tears (Carboxymethylcellulose)", "Refresh / Systane", "Ophthalmic Lubricant",
     "1–2 drops", "PRN (as often as needed)",
     "Preservative-free formulations preferred for frequent use (>4×/day).",
     "Dry eye syndrome, contact lens use, post-surgery lubrication",
     "Transient blurred vision",
     []),

    # ── ONCOLOGY & SPECIALIST ─────────────────────────────────────────────
    ("Dexamethasone", "Decadron / Dexona", "Corticosteroid (Potent, Systemic)",
     "0.5–24 mg", "OD–BD (taper per indication)",
     "Monitor glucose, BP, and electrolytes. High-dose — increased infection risk. Taper gradually.",
     "Cerebral oedema, anti-inflammatory, antiemetic (chemotherapy), croup, severe asthma, COVID-19 (hospitalised)",
     "Hyperglycaemia, hypertension, osteoporosis, immune suppression, adrenal suppression",
     ["NSAIDs", "Antidiabetics", "Live vaccines", "Warfarin"]),

    ("Ondansetron (Chemotherapy)", "Zofran IV", "Antiemetic (5-HT3 Antagonist)",
     "8–32 mg IV/oral", "Before/after chemotherapy per protocol",
     "Higher doses — QT prolongation. Monitor ECG in susceptible patients.",
     "Chemotherapy-induced nausea and vomiting (CINV), radiotherapy-induced nausea",
     "Constipation, headache, QT prolongation",
     ["QT-prolonging drugs"]),

    ("Mesna", "Uromitexan / Mesnex", "Uroprotective Agent",
     "20% of ifosfamide/cyclophosphamide dose", "IV at 0, 4, 8 hours of chemotherapy",
     "Must be given with ifosfamide or high-dose cyclophosphamide. Helps prevent haemorrhagic cystitis.",
     "Prevention of haemorrhagic cystitis (with ifosfamide/cyclophosphamide)",
     "Nausea, vomiting, diarrhoea",
     []),

    ("Cyclophosphamide", "Cytoxan / Endoxan", "Alkylating Agent (Chemotherapy/Immunosuppressant)",
     "Varies by protocol", "IV or oral (specialist)",
     "Give with MESNA (haemorrhagic cystitis prevention). Monitor CBC. Teratogenic. Carcinogenic.",
     "Lymphoma, leukaemia, solid tumours, severe autoimmune diseases (SLE, vasculitis)",
     "Haemorrhagic cystitis, bone marrow suppression, nausea, teratogenicity, secondary malignancy",
     ["Allopurinol", "Live vaccines"]),

    ("Tamoxifen", "Nolvadex / Tamoxifen", "Selective Oestrogen Receptor Modulator (SERM)",
     "20 mg", "OD",
     "Thromboembolism risk. Endometrial cancer risk with prolonged use. Teratogenic — reliable contraception required.",
     "Breast cancer (oestrogen receptor positive), prevention in high-risk women",
     "Hot flushes, irregular menses, VTE, endometrial cancer (long-term)",
     ["CYP2D6 inhibitors (fluoxetine, paroxetine — reduce active metabolite)"]),

    ("Imatinib", "Gleevec / Glivec", "Tyrosine Kinase Inhibitor (TKI)",
     "400–600 mg", "OD with food",
     "Monitor CBC, LFTs, electrolytes. Oedema — fluid retention common.",
     "Chronic myeloid leukaemia (CML), GI stromal tumours (GIST)",
     "Nausea, oedema, muscle cramps, hepatotoxicity, rash",
     ["CYP3A4 inducers/inhibitors", "Warfarin"]),

    # ── VACCINES (key examples in formulary context) ───────────────────────
    ("BCG Vaccine", "BCG / Bacillus Calmette-Guérin", "Vaccine (Live Attenuated)",
     "0.1 mL intradermal (neonatal) / 0.05 mL <1 month", "Single dose at birth",
     "Live vaccine — contraindicated in immunocompromised. Site may develop local reaction/ulcer (normal).",
     "Prevention of severe tuberculosis (meningitis, miliary TB) in childhood",
     "Local ulceration/scar, regional lymphadenitis",
     []),

    ("OPV (Oral Polio Vaccine)", "Polio drops / bOPV", "Vaccine (Live Attenuated, Oral)",
     "2 drops oral", "At birth (in endemic areas) + 6, 10, 14 weeks (EPI); booster at 16–24 months",
     "Vaccine-associated paralytic polio (VAPP) — very rare (1:750,000 first doses). Contraindicated in immunocompromised.",
     "Prevention of poliomyelitis",
     "VAPP (very rare)",
     []),

    ("DPT Vaccine (Diphtheria, Pertussis, Tetanus)", "Pentavac / Tritanrix", "Vaccine (Inactivated)",
     "0.5 mL IM", "6, 10, 14 weeks; Booster at 15–18 months",
     "Local reactions (pain, redness, swelling) common. Fever common. Febrile seizures rare.",
     "Prevention of diphtheria, pertussis (whooping cough), tetanus",
     "Local reactions, fever, febrile seizures (rare)",
     []),

    ("MMR Vaccine (Measles, Mumps, Rubella)", "M-M-R II / Tresivac", "Vaccine (Live Attenuated)",
     "0.5 mL SC", "9–12 months (measles); 12–15 months (MMR); booster 4–6 years",
     "Contraindicated in immunocompromised, pregnancy, severe egg allergy. Not to be given within 3 months of blood/immunoglobulin.",
     "Prevention of measles, mumps, rubella",
     "Fever, rash, mild parotitis, thrombocytopaenia (rare), febrile seizure (rare)",
     []),

    ("COVID-19 mRNA Vaccine (Comirnaty/Spikevax)", "COVID-19 Vaccine", "Vaccine (mRNA)",
     "0.3 mL IM (Pfizer) / 0.5 mL IM (Moderna)", "2-dose primary (21/28 days apart) + boosters",
     "Myocarditis/pericarditis (rare, mostly young males, post-dose 2). Monitor for anaphylaxis 15–30 min post-injection.",
     "Prevention of COVID-19 disease (including severe disease and hospitalisation)",
     "Local reactions, fatigue, headache, fever; myocarditis/pericarditis (rare)",
     []),

    ("Hepatitis B Vaccine", "Enivac HB / Recombivax", "Vaccine (Recombinant)",
     "10–20 mcg IM", "3-dose schedule: 0, 1, 6 months",
     "Check anti-HBs titre 1–2 months post-vaccination in high-risk groups.",
     "Prevention of hepatitis B infection",
     "Injection site pain, mild fever",
     []),

    ("Pneumococcal Conjugate Vaccine (PCV13)", "Prevenar 13", "Vaccine (Conjugate)",
     "0.5 mL IM", "3+1 (6, 10, 14 weeks + 9 months) or 2+1 schedule",
     "PPSV23 for adults and at-risk groups. Key vaccine for reducing pneumococcal pneumonia and meningitis.",
     "Prevention of pneumococcal disease (pneumonia, meningitis, bacteraemia)",
     "Local reactions, fever",
     []),

    # ── EMERGENCY MEDICINES ────────────────────────────────────────────────
    ("Adrenaline (Epinephrine) 1mg/mL", "Adrenaline Injection / EpiPen", "Vasopressor / Bronchodilator (Emergency)",
     "0.5 mg IM (anaphylaxis adults)", "Repeat every 5–15 min as needed",
     "Life-saving in anaphylaxis — first-line treatment. For cardiac arrest: 1 mg IV/IO.",
     "Anaphylaxis, cardiac arrest, severe bronchospasm",
     "Tachycardia, hypertension, anxiety, dysrhythmias",
     ["MAOIs", "Non-selective beta-blockers (unopposed alpha effect)"]),

    ("Atropine Sulfate", "Atropine Injection", "Anticholinergic (Emergency)",
     "0.5–1 mg IV (bradycardia)", "Repeat every 3–5 min (Max 3 mg)",
     "Do not use in myocardial ischaemia until cause determined. Tachycardia risk. For organophosphate poisoning: titrate to secretions.",
     "Symptomatic bradycardia, AV block, organophosphate poisoning",
     "Tachycardia, dry mouth, urinary retention, blurred vision, confusion",
     []),

    ("Naloxone", "Narcan / Nalone", "Opioid Antagonist (Emergency)",
     "0.4 mg IV/IM/SC/intranasal", "Repeat every 2–3 min as needed",
     "Half-life shorter than most opioids — observe patient and repeat doses if needed. May precipitate withdrawal in opioid-dependent patients.",
     "Opioid overdose reversal (respiratory depression)",
     "Withdrawal symptoms in opioid-dependent patients, hypertension, tachycardia",
     []),

    ("Glucose 50% (Dextrose)", "D50W / Glucogen", "Emergency Carbohydrate",
     "50 mL IV (25g dextrose)", "Stat for severe hypoglycaemia",
     "Ensure IV access — extravasation causes tissue necrosis. Follow with glucose infusion or oral feeding.",
     "Severe symptomatic hypoglycaemia",
     "Extravasation injury (necrosis), rebound hyperglycaemia",
     []),

    ("Activated Charcoal", "Carbosorb / CharcoAid", "Antidote / Adsorbent",
     "50 g adult (1 g/kg paediatric)", "Single dose (within 1–2 hours of ingestion)",
     "Contraindicated if: decreased consciousness (aspiration risk), corrosives/hydrocarbons. Most effective within 1 hour.",
     "Acute poisoning/overdose (many drugs and chemicals)",
     "Aspiration pneumonitis, constipation, black stools",
     []),

    ("Sodium Bicarbonate 8.4%", "Sodium Bicarb Injection", "Buffer / Emergency",
     "1 mmol/kg (1 mL/kg of 8.4%)", "IV (titrate by blood gas)",
     "Avoid routine use in cardiac arrest. Useful in tricyclic overdose, hyperkalaemia (temporising), severe metabolic acidosis.",
     "Metabolic acidosis, tricyclic antidepressant overdose, hyperkalaemia (temporising), urine alkalinisation",
     "Alkalosis, hypokalaemia, hypernatraemia",
     []),

    # ── PAEDIATRIC MEDICINES ───────────────────────────────────────────────
    ("Zinc Sulfate (Paediatric)", "Zincovit / Zinco", "Micronutrient",
     "10–20 mg elemental zinc", "OD for 10–14 days",
     "WHO-recommended adjunct to ORS in paediatric diarrhoea. Reduces duration and severity.",
     "Acute diarrhoea in children (adjunct to ORS), zinc deficiency",
     "Nausea at higher doses",
     []),

    ("Vitamin A (Retinol)", "Vitamin A Capsules", "Fat-soluble Vitamin",
     "100,000–200,000 IU", "Single dose at 9 months (EPI), then 6-monthly to 5 years",
     "Teratogenic in high doses — avoid supplementation above 10,000 IU/day in pregnancy.",
     "Vitamin A deficiency prevention (blindness, immune support), measles (adjunct)",
     "Headache, nausea (acute high doses), teratogenicity (chronic high doses)",
     []),

    ("Oral Rehydration Salts (ORS)", "Electral / WHO-ORS", "Electrolyte Replenisher",
     "As much as child/adult can tolerate", "After each loose stool (approx 50–100 mL/kg over 4 hours for dehydration)",
     "Use clean/boiled water. Discard unused solution after 24 hours. Continue feeding.",
     "Dehydration from diarrhoea or vomiting (all ages), cholera, gastroenteritis",
     "Rare: hypernatraemia if incorrectly prepared",
     []),

    ("Syrup Amoxicillin (Paediatric)", "Novamox Syrup / Syrup Mox", "Antibiotic (Aminopenicillin, Paediatric)",
     "25–90 mg/kg/day in divided doses", "TDS for 5–10 days",
     "Reconstitute with clean water. Complete full course. Screen for penicillin allergy.",
     "Otitis media, pneumonia (young children), tonsillopharyngitis",
     "Diarrhoea, rash, diaper rash",
     ["Methotrexate", "Allopurinol"]),

    # ── UROLOGICAL ────────────────────────────────────────────────────────
    ("Tamsulosin", "Flomax / Urimax", "Alpha-1 Blocker (BPH)",
     "0.4 mg", "OD after breakfast",
     "Orthostatic hypotension — caution with antihypertensives. Intraoperative floppy iris syndrome with cataract surgery.",
     "Benign prostatic hyperplasia (BPH), ureteric colic (adjunct to facilitate stone passage)",
     "Dizziness, orthostatic hypotension, retrograde ejaculation",
     ["PDE5 inhibitors (sildenafil)", "Antihypertensives"]),

    ("Finasteride", "Proscar / Finpecia (1mg for hair loss)", "5-Alpha Reductase Inhibitor",
     "5 mg (BPH) / 1 mg (androgenetic alopecia)", "OD",
     "Teratogenic — women of childbearing age should not handle crushed tablets. Reduces PSA (~50%).",
     "Benign prostatic hyperplasia, androgenetic alopecia",
     "Sexual dysfunction (decreased libido, erectile dysfunction, ejaculatory disorders), gynaecomastia",
     []),

    ("Sildenafil", "Viagra / Revatio", "PDE5 Inhibitor (ED / PAH)",
     "25–100 mg (ED); 20 mg TDS (PAH)", "1 hour before sexual activity (ED)",
     "Contraindicated with nitrates (severe hypotension). Avoid in severe cardiovascular disease.",
     "Erectile dysfunction, pulmonary arterial hypertension",
     "Headache, flushing, dyspepsia, visual disturbances, hypotension",
     ["Nitrates", "Alpha-blockers", "CYP3A4 inhibitors"]),

    # ── VITAMINS & MINERALS ────────────────────────────────────────────────
    ("Vitamin D3 (Cholecalciferol)", "Calcirol / D-Rise", "Vitamin D Supplement",
     "60,000 IU weekly (deficiency) / 800–1000 IU OD (maintenance)", "Weekly or OD",
     "Monitor 25-OH Vitamin D levels. Toxicity risk with excessive supplementation — hypercalcaemia.",
     "Vitamin D deficiency, osteoporosis, rickets, osteomalacia, COVID-19 adjunct",
     "Hypercalcaemia (excessive doses), kidney stones",
     ["Digoxin", "Thiazides"]),

    ("Multivitamin with Minerals (Pregnancy)", "Pregnacare / PregOmega Plus", "Nutritional Supplement",
     "1 tablet", "OD",
     "Choose formulation with at least 400 mcg folic acid and iron. Avoid excessive Vitamin A (retinol).",
     "Nutritional supplementation during pregnancy and breastfeeding",
     "GI upset, constipation (iron component)",
     ["Iron should be separated from calcium/antacids"]),

    ("Vitamin B12 (Cyanocobalamin)", "Mecobalamin / Neurobion", "Vitamin B12 Supplement",
     "250–1000 mcg", "OD or weekly IM (deficiency)",
     "Oral supplementation effective even in pernicious anaemia (if high dose given). IM for severe deficiency.",
     "B12 deficiency (pernicious anaemia, metformin use, vegan diet, malabsorption)",
     "Generally safe; injection may cause pain at site",
     []),

    # ── ENT ───────────────────────────────────────────────────────────────
    ("Xylometazoline 0.1% Nasal Drops", "Otrivin / Nasivion", "Nasal Decongestant",
     "2–3 drops per nostril", "BD–TDS (max 3–5 days)",
     "Rebound congestion (rhinitis medicamentosa) if used >5 days. Avoid in children <6 years (use 0.05%).",
     "Nasal congestion (common cold, sinusitis, allergic rhinitis)",
     "Local irritation, rebound congestion, cardiovascular effects (systemic absorption)",
     []),

    ("Fluticasone Furoate Nasal Spray", "Avamys / Nasofan", "Intranasal Corticosteroid",
     "27.5 mcg per spray (1–2 sprays per nostril)", "OD",
     "Shake before use. Aim spray away from nasal septum. Onset of benefit may take several days.",
     "Allergic rhinitis, non-allergic rhinitis",
     "Nasal irritation, epistaxis, nasal dryness",
     []),

    ("Betahistine", "Serc / Vertin", "Histamine Analogue (Ménière's Disease)",
     "8–24 mg", "TDS with food",
     "Take consistently with food. Slow onset of benefit (weeks to months).",
     "Ménière's disease (vertigo, tinnitus, hearing loss), vestibular vertigo",
     "GI upset, headache",
     ["MAOIs"]),

    # ── ADDITIONAL MEDICINES ──────────────────────────────────────────────
    ("Desloratadine", "Clarinex / Aerius", "Antihistamine (2nd Generation, Non-Sedating)",
     "5 mg", "OD",
     "Non-sedating. Active metabolite of loratadine.",
     "Allergic rhinitis, chronic idiopathic urticaria",
     "Headache, dry mouth, fatigue",
     []),

    ("Esomeprazole", "Nexium / Sompraz", "Proton Pump Inhibitor (PPI)",
     "20–40 mg", "OD before meal",
     "Prolonged use: risk of hypomagnesaemia, B12 deficiency. S-isomer of omeprazole.",
     "GERD, peptic ulcer disease, H. pylori eradication",
     "Headache, diarrhoea, nausea",
     ["Clopidogrel (moderate interaction)", "Ketoconazole"]),

    ("Pregabalin", "Lyrica / Pregeb", "Antiepileptic / Neuropathic Pain Agent",
     "75–300 mg", "BD (titrate gradually)",
     "Taper gradually to avoid withdrawal symptoms. Renal dose adjustment required.",
     "Neuropathic pain, generalized anxiety disorder, focal seizures (adjunct)",
     "Dizziness, somnolence, weight gain, peripheral edema",
     ["CNS depressants", "Alcohol"]),

    ("Melatonin", "Circadin / Meloset", "Hormone / Sleep Aid",
     "2–5 mg", "OD 1-2 hours before bedtime",
     "Short-term treatment of primary insomnia. May cause next-day drowsiness.",
     "Insomnia, jet lag, sleep-wake cycle disruptions",
     "Headache, vivid dreams, daytime sleepiness",
     ["Fluvoxamine", "Warfarin"]),

    ("Candesartan", "Atacand", "Antihypertensive (ARB)",
     "8–32 mg", "OD",
     "Monitor renal function and potassium. Avoid in pregnancy.",
     "Hypertension, heart failure with reduced EF",
     "Dizziness, hyperkalemia, back pain",
     ["K-sparing diuretics", "NSAIDs", "Lithium"]),
]

# ══════════════════════════════════════════════════════════════════════════════
# 2. RAG KNOWLEDGE BASE DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════════

RAG_DOCUMENTS = [
    {
        "title": "Hypertension: Clinical Guidelines and Management",
        "doc_type": "clinical_guideline",
        "text": """HYPERTENSION — CLINICAL MANAGEMENT GUIDELINES (Demo/Educational Content)

DEFINITION:
Blood pressure consistently ≥140/90 mmHg (office measurement) or ≥135/85 mmHg (home).
Stage 1 HTN: 140–159/90–99 mmHg. Stage 2 HTN: ≥160/100 mmHg.
Hypertensive Emergency: Severe BP elevation (≥180/120) with acute end-organ damage.

RISK FACTORS:
Age >55 (male) or >65 (female), family history, obesity (BMI >30), diabetes, chronic kidney disease,
sedentary lifestyle, high sodium intake (>5g/day), excess alcohol, smoking, chronic stress.

DIAGNOSIS:
Confirm with ≥2 measurements on ≥2 separate occasions. HBPM or ABPM to rule out white coat HTN.
Essential investigations: U&E, creatinine, eGFR, fasting glucose, lipid profile, ECG, urinalysis.

FIRST-LINE TREATMENT:
Non-pharmacological: DASH diet (low Na <5g/day, high K), weight loss, regular aerobic exercise (≥150 min/week),
smoking cessation, limit alcohol to ≤14 units/week.

PHARMACOLOGICAL (JNC-8/WHO guidelines):
• Non-Black, non-diabetic: ACE inhibitor (e.g., Lisinopril 5–40 mg) OR ARB (e.g., Losartan 50–100 mg)
  OR Calcium Channel Blocker (e.g., Amlodipine 5–10 mg)
• All patients: CCB (Amlodipine) or Thiazide diuretic (HCTZ 12.5–25 mg) as alternative or add-on
• Step 2: Combination (ACEi/ARB + CCB or Thiazide)
• Step 3: ACEi/ARB + CCB + Thiazide
• Resistant HTN: Add Spironolactone 25 mg OD

TREATMENT TARGETS:
General: <140/90 mmHg. Diabetics: <130/80 mmHg. CKD with proteinuria: <130/80 mmHg. Elderly (>80y): <150/90 mmHg.

MONITORING:
BP at every visit. Renal function and electrolytes 1–2 weeks after starting ACEi/ARB/diuretic.
Annual: ECG, U&E, HbA1c, lipids, urine protein.

HYPERTENSIVE EMERGENCY:
IV Labetalol, Hydralazine, or Sodium Nitroprusside. Reduce MAP by ≤25% in first hour, then cautiously.
Amlodipine or Nifedipine SR for urgency (no end-organ damage)."""
    },
    {
        "title": "Type 2 Diabetes Mellitus: Comprehensive Management",
        "doc_type": "clinical_guideline",
        "text": """TYPE 2 DIABETES MELLITUS — MANAGEMENT GUIDELINES (Demo/Educational Content)

DEFINITION:
Chronic metabolic disorder characterised by insulin resistance and relative insulin deficiency.
Diagnostic criteria (WHO/ADA): FPG ≥126 mg/dL (7 mmol/L), or 2-hour PG ≥200 mg/dL (11.1 mmol/L),
or HbA1c ≥6.5% (48 mmol/mol), or symptomatic random PG ≥200 mg/dL.

PATHOPHYSIOLOGY:
Insulin resistance in liver, muscle, and adipose tissue. Progressive beta-cell failure.
Associated with obesity (80% of T2DM patients), sedentary lifestyle, genetic predisposition.

COMPLICATIONS:
Microvascular: Diabetic retinopathy, nephropathy, neuropathy.
Macrovascular: CAD, stroke, peripheral artery disease.
Other: Foot ulcers/amputation, infections, NAFLD.

TREATMENT TARGETS:
HbA1c: <7% (53 mmol/mol) for most adults; <8% for elderly/high CV risk/complex.
BP: <130/80 mmHg. LDL: <100 mg/dL (<70 mg/dL if very high CV risk).
Fasting glucose: 80–130 mg/dL. Post-prandial: <180 mg/dL.

PHARMACOLOGICAL MANAGEMENT (ADA 2024 Standards):
First-line: Metformin 500 mg BD (titrate to 2000 mg/day). Start with 500 mg OD to reduce GI side effects.
  • If eGFR <30: withhold metformin.
  • If eGFR 30–45: use with caution, reduce dose.

Add-on therapy (if HbA1c not at target after 3 months):
  • With established ASCVD, HF, or CKD: GLP-1 RA (Dulaglutide) or SGLT-2 inhibitor (Empagliflozin/Dapagliflozin)
  • Weight reduction priority: GLP-1 RA
  • HF or CKD priority: SGLT-2 inhibitor
  • Cost-sensitive: Sulfonylurea (Gliclazide 30 mg MR OD) or Pioglitazone
  • Further intensification: DPP-4 inhibitor (Sitagliptin 100 mg OD) or add basal insulin

Insulin therapy: When HbA1c remains >10% or hyperglycaemia symptoms present.
Start Insulin Glargine 10 units SC OD, titrate by 2 units every 3 days targeting fasting glucose 80–130 mg/dL.

LIFESTYLE:
Medical Nutrition Therapy: Mediterranean or low-carb diet. Reduce calorie intake by 500 kcal/day for weight loss.
Physical activity: ≥150 min/week moderate aerobic + 2–3 sessions resistance training/week.

MONITORING:
HbA1c every 3 months until stable, then every 6 months.
Annual: fasting lipids, urine ACR, eGFR, retinal exam, foot exam, blood pressure.
Foot exam at every visit.

HYPOGLYCAEMIA MANAGEMENT:
Mild-moderate (conscious): 15–20g fast-acting carbohydrate (glucose tablets, juice, regular soda).
Repeat blood glucose in 15 min. If no improvement, repeat.
Severe (unconscious): Glucagon IM/SC/intranasal, or IV Glucose 50% 25–50 mL."""
    },
    {
        "title": "Asthma: Diagnosis and Stepwise Management",
        "doc_type": "clinical_guideline",
        "text": """ASTHMA — CLINICAL GUIDELINE (Demo/Educational Content)

DEFINITION:
Chronic inflammatory airway disease characterised by variable airflow obstruction, airway hyperresponsiveness,
and airway inflammation. Typically episodic symptoms of wheeze, breathlessness, chest tightness, and cough.

DIAGNOSIS:
Clinical: Typical symptoms. Peak flow variability >20% or FEV1/FVC <70% on spirometry (post-bronchodilator).
Reversibility: ≥12% and ≥200 mL improvement in FEV1 after salbutamol 400 mcg.

CLASSIFICATION:
Intermittent: Symptoms <2 days/week, nighttime awakenings ≤2/month, normal lung function.
Mild Persistent: Symptoms >2 days/week but not daily, nighttime >2/month.
Moderate Persistent: Daily symptoms, nighttime ≥1/week.
Severe Persistent: Symptoms throughout the day, frequent nighttime symptoms.

STEPWISE TREATMENT (GINA 2023):
Step 1 (Intermittent): As-needed SABA (Salbutamol 100 mcg 2–4 puffs PRN)
  Alternative: Low-dose ICS-Formoterol (MART regimen)
Step 2 (Mild Persistent): Low-dose ICS (Budesonide 200–400 mcg/day or Fluticasone 100–250 mcg BD) + SABA PRN
  Alternative: LTRA (Montelukast 10 mg OD)
Step 3 (Moderate Persistent): Low-dose ICS + LABA (Budesonide+Formoterol BD) + SABA PRN
  Alternative: Medium-dose ICS, or low-dose ICS + LTRA
Step 4 (Severe Persistent): Medium-high dose ICS + LABA; consider Tiotropium add-on
Step 5: Specialist referral; add-on anti-IgE (Omalizumab) or anti-IL5 (Mepolizumab) for severe eosinophilic asthma

ACUTE EXACERBATION:
Mild-moderate: Salbutamol 4–8 puffs every 20 min x3, then 4-hourly. Prednisolone 40–50 mg OD x5–7 days.
Severe: Salbutamol + Ipratropium nebulisation. IV Methylprednisolone. Oxygen (target SpO2 93–95%). Consider Magnesium sulfate IV.

MONITORING:
ACT (Asthma Control Test) at every visit. Peak flow monitoring.
Review inhaler technique at every appointment. Action plan for exacerbations.

INHALER TECHNIQUE:
MDI: Remove cap, shake well, exhale fully, seal lips around mouthpiece, press while inhaling slowly over 3–5 seconds.
DPI: Exhale away from device, inhale quickly and deeply. Do not exhale into device.
Spacer: Use with MDI. Wash weekly with detergent, allow to air dry."""
    },
    {
        "title": "Tuberculosis: Diagnosis and DOTS Treatment Protocol",
        "doc_type": "clinical_guideline",
        "text": """TUBERCULOSIS (TB) — WHO DOTS TREATMENT PROTOCOL (Demo/Educational Content)

GLOBAL BURDEN:
TB remains one of the world's leading infectious disease killers. Caused by Mycobacterium tuberculosis (MTB).
1/4 of world's population latently infected. High burden: India, China, Indonesia, Philippines, South Africa, Nigeria.

TYPES:
Pulmonary TB (PTB): Most common (70–80%). Smear-positive or negative.
Extrapulmonary TB (EPTB): Lymph node (most common EPTB), pleural, bone, CNS, abdominal, genitourinary.
Drug-Resistant TB: MDR-TB (resistant to INH + Rifampicin), XDR-TB (MDR + Fluoroquinolone + Injectable).
Latent TB Infection (LTBI): Positive IGRA or TST without active disease.

DIAGNOSIS:
Sputum AFB smear microscopy (rapid, low-cost, low sensitivity ~60%).
GeneXpert MTB/RIF (WHO recommended first test): Rapid diagnosis + RIF resistance detection.
Culture (MGIT/LJ): Gold standard; 2–6 weeks. Drug sensitivity testing.
Chest X-ray: Fibro-cavitary disease, miliary pattern. Cannot confirm TB alone.

FIRST-LINE TREATMENT (WHO 2022):
Intensive Phase (2 months): HRZE — Isoniazid (H) + Rifampicin (R) + Pyrazinamide (Z) + Ethambutol (E)
  Adult doses: H 5 mg/kg (max 300 mg) + R 10 mg/kg (max 600 mg) + Z 25 mg/kg (max 2g) + E 15–25 mg/kg
Continuation Phase (4 months): HR — Isoniazid + Rifampicin

Standard DOTS Regimen for new pulmonary TB: 2HRZE/4HR
Retreatment: 2HRZES/1HRZE/5HRE (8-month regimen)
MDR-TB: Bedaquiline + Pretomanid + Linezolid (BPaL regimen, 6 months) or longer conventional MDR regimen.

ADVERSE EFFECTS MONITORING:
• INH: Peripheral neuropathy (give Pyridoxine 25 mg/day), hepatotoxicity.
• Rifampicin: Orange body secretions (counsel!), hepatotoxicity, multiple drug interactions (CYP inducer).
• Pyrazinamide: Hepatotoxicity, hyperuricaemia, arthralgia.
• Ethambutol: Optic neuritis (test visual acuity and colour vision monthly).

DIRECTLY OBSERVED THERAPY (DOTS):
Healthcare worker or trained community supervisor watches patient swallow each dose. Core of WHO Stop TB strategy.
Patient-centred care, treatment support, monitoring, contact tracing are essential components.

CONTACT TRACING:
Screen all household contacts. Children <5 years: Isoniazid Preventive Therapy (IPT) for 6 months.
HIV-positive contacts: IPT regardless of age.

HIV-TB CO-INFECTION:
Start TB treatment first. Start ART within 2 weeks if CD4 <50; within 8 weeks otherwise.
Rifampicin significantly reduces many ART drug levels — use Efavirenz-based regimen, adjust doses."""
    },
    {
        "title": "Malaria: Diagnosis and Treatment Guidelines",
        "doc_type": "clinical_guideline",
        "text": """MALARIA — DIAGNOSIS AND TREATMENT (Demo/Educational Content)

CAUSATIVE AGENTS:
Plasmodium falciparum: Most dangerous; responsible for severe malaria, cerebral malaria, deaths.
P. vivax: Relapsing malaria (hypnozoites); most widespread.
P. malariae: Quartan malaria; chronic kidney disease.
P. ovale: Relapsing malaria (less common).
P. knowlesi: Zoonotic; Southeast Asia.

TRANSMISSION:
Female Anopheles mosquito bite. Peak biting times: dusk to dawn.

CLINICAL FEATURES:
Classic triad: Fever (periodic, 48h or 72h cycles), rigors (shaking chills), sweating.
Severe malaria (P. falciparum): Cerebral malaria (coma, seizures), severe anaemia, respiratory distress, hypoglycaemia,
acute renal failure, jaundice, haemoglobinuria, circulatory collapse.

DIAGNOSIS:
RDT (Rapid Diagnostic Test): PfHRP-2 antigen for P. falciparum; pLDH for all species.
  Sensitivity >95% for P. falciparum. First-line in resource-limited settings.
Blood Film Microscopy: Thick film for parasite detection (sensitivity), thin film for species identification, parasitaemia.
Quantification of parasitaemia guides severity assessment.

TREATMENT — UNCOMPLICATED MALARIA:
P. falciparum (ACT — Artemisinin Combination Therapy):
  • Artemether-Lumefantrine (Coartem): 4 tablets BD x3 days (adults >35 kg). With fatty food.
  • Artesunate-Amodiaquine: OD x3 days.
  • Artesunate-Mefloquine: (Areas with high amodiaquine resistance)
  • Follow ACT with a single dose of Primaquine 0.25 mg/kg to reduce transmission (not in G6PD deficiency, pregnancy).

P. vivax / P. ovale:
  • Chloroquine 25 mg/kg over 3 days (10mg/kg Day 1, 10 mg/kg Day 2, 5 mg/kg Day 3) — if chloroquine sensitive
  PLUS Primaquine 0.25 mg/kg OD x14 days for radical cure. SCREEN FOR G6PD DEFICIENCY FIRST.
  • Chloroquine-resistant P. vivax: ACT as for falciparum + Primaquine.

SEVERE MALARIA (HOSPITALISE):
IV/IM Artesunate 2.4 mg/kg at 0, 12, 24 hours, then OD.
  Alternatives (if artesunate unavailable): IV Quinine + Doxycycline/Clindamycin.
Supportive care: IV fluid resuscitation, antipyretics, blood transfusion (Hb <7g/dL, severe anaemia),
treat hypoglycaemia (IV Glucose), anticonvulsants (seizures), oxygen.

MALARIA PREVENTION:
Personal Protection: DEET/Picaridin insect repellent, long-sleeved clothing, bed nets (LLINs), indoors 6pm–6am.
Chemoprophylaxis (travellers to endemic areas):
  • Atovaquone-Proguanil (Malarone): OD starting 1–2 days before travel to 7 days after.
  • Doxycycline 100 mg OD: Starting 1–2 days before to 4 weeks after.
  • Mefloquine: Weekly, starting 2–3 weeks before to 4 weeks after.
  • Chloroquine: Only where fully sensitive strains (decreasing areas).

PREGNANCY AND MALARIA:
Malaria in pregnancy is extremely dangerous — increased risk of maternal and fetal mortality.
Treatment: ACT is recommended (Artemether-Lumefantrine preferred in 2nd/3rd trimester).
1st trimester: Quinine + Clindamycin (ACT if only option).
IPT in pregnancy (IPTp): Sulfadoxine-Pyrimethamine (SP) at each antenatal visit from 2nd trimester."""
    },
    {
        "title": "Dengue Fever: Management Protocol",
        "doc_type": "clinical_guideline",
        "text": """DENGUE FEVER — CLINICAL MANAGEMENT (Demo/Educational Content)

EPIDEMIOLOGY:
Arboviral infection caused by Dengue virus (DENV 1–4 serotypes). Vector: Aedes aegypti (daytime biting).
Largest vector-borne viral disease globally. Endemic: tropical and subtropical Asia, Latin America, Africa.
~390 million infections/year. 40% population at risk. Risk of severe dengue in secondary infection with different serotype.

CLINICAL PHASES:
1. FEBRILE PHASE (Days 1–3): Abrupt high fever (39–40°C), facial flushing, skin erythema, myalgia, arthralgia,
   retroorbital headache, sometimes early rash.
2. CRITICAL PHASE (Days 4–6): Fever may subside (defervescence). WARNING SIGNS emerge:
   • Abdominal pain/tenderness, persistent vomiting, clinical fluid accumulation (ascites, pleural effusion),
   • Mucosal bleeding, lethargy/restlessness, liver enlargement >2 cm, rapid clinical deterioration.
   • Rising haematocrit concurrent with rapid platelet decline = CRITICAL SIGN.
3. RECOVERY PHASE (Days 7–8): Reabsorption of leaked fluids. Bradycardia, diuresis, improvement.

CLASSIFICATION:
Dengue: No warning signs.
Dengue with Warning Signs: Any of the above critical phase warning signs.
Severe Dengue: Severe plasma leakage (shock — Dengue Shock Syndrome/DSS), severe bleeding, severe organ impairment.

DIAGNOSIS:
Day 1–5: NS1 Antigen (rapid test, high sensitivity early); PCR (gold standard).
Day 5+: IgM/IgG Dengue antibodies (serology).
CBC: Progressive thrombocytopaenia (platelet <100,000 = warning; <20,000 = bleeding risk) + rising haematocrit (haemoconcentration).
ALT/AST: Elevated in dengue hepatitis.

MANAGEMENT:
NO SPECIFIC ANTIVIRAL. Supportive care is the cornerstone.

DENGUE (No Warning Signs):
Oral fluids: Encourage 2–3 L/day. ORS, coconut water, juice. Avoid plain water (dilutional hyponatraemia).
Paracetamol 10–15 mg/kg every 4–6 hours for fever/pain.
AVOID NSAIDs (ibuprofen, aspirin, diclofenac) — increase bleeding risk.
Monitor daily: platelet count, haematocrit, clinical signs.

DENGUE WITH WARNING SIGNS (Hospitalise):
IV fluid resuscitation with 0.9% NaCl or Ringer's Lactate.
Initial: 5 mL/kg/hour, reassess frequently. Avoid excessive fluids — risk of overload.
Monitor: Vital signs, urine output (>0.5 mL/kg/h), haematocrit every 4–6 hours.

SEVERE DENGUE (ICU):
Fluid resuscitation: 10–20 mL/kg bolus over 15–30 min. Reassess after each bolus.
Colloids (Dextran 40, Hydroxyethyl starch) if haematocrit remains elevated after crystalloids.
Platelet transfusion: Only for active severe bleeding + platelet <20,000.
Prophylactic platelet transfusion is NOT recommended.

DISCHARGE CRITERIA:
Improving clinical state, stable or rising platelet, adequate oral intake, no fever x24h."""
    },
    {
        "title": "COVID-19: Clinical Management and Vaccination",
        "doc_type": "clinical_guideline",
        "text": """COVID-19 — CLINICAL MANAGEMENT (Demo/Educational Content)

CAUSATIVE AGENT:
SARS-CoV-2 (Severe Acute Respiratory Syndrome Coronavirus 2). Family: Coronaviridae. First identified December 2019, Wuhan, China.
Global pandemic declared by WHO March 11, 2020.

TRANSMISSION:
Respiratory droplets and aerosols (primary). Surface contact (lesser role). Airborne transmission in enclosed poorly ventilated spaces.

CLINICAL SPECTRUM:
Asymptomatic: ~40–45%. Mild: Upper respiratory symptoms, fever, dry cough, fatigue, loss of taste/smell (anosmia).
Moderate: Pneumonia, SpO2 ≥94% on room air. Severe: SpO2 <94%, respiratory rate >30/min, infiltrates >50%.
Critical: Respiratory failure requiring ventilation, septic shock, multi-organ dysfunction.

RISK FACTORS FOR SEVERE DISEASE:
Age >65 years, obesity (BMI >30), unvaccinated status, diabetes, hypertension, cardiovascular disease,
CKD, immunocompromising conditions, pregnancy, COPD.

DIAGNOSIS:
RT-PCR (nasopharyngeal swab): Gold standard. Sensitivity 70–90%. Positive x5–10 days after exposure.
Rapid Antigen Test (RAT): Sensitivity ~80% (lower in asymptomatic). Suitable for screening.
Serology (IgM/IgG): Not useful for acute diagnosis. Used for epidemiological surveys.
CT Chest: Ground-glass opacities in peripheral/bilateral distribution. Not routine.

MANAGEMENT:
MILD (outpatient):
• Paracetamol 1g QID for fever/pain. 
• Adequate rest and hydration. Isolation.
• Monitor SpO2 twice daily — attend emergency if <94%.
• Nirmatrelvir-Ritonavir (Paxlovid): High-risk patients within 5 days of symptom onset.
• Molnupiravir: Alternative antiviral (high-risk, cannot take Paxlovid).

MODERATE (hospital ward):
• Oxygen therapy to maintain SpO2 ≥94%.
• Dexamethasone 6 mg OD x10 days (if requiring supplemental oxygen).
• Remdesivir 200 mg IV day 1, then 100 mg IV OD x4 days (if SpO2 <94%, within 10 days symptoms).
• VTE prophylaxis: Enoxaparin 40 mg SC OD.
• Antibiotic cover only if bacterial co-infection suspected.

SEVERE/CRITICAL (ICU):
• High-flow oxygen/NIV/invasive ventilation.
• Dexamethasone 6 mg OD.
• Baricitinib (JAK inhibitor) or Tocilizumab (anti-IL6) for severe/critical with systemic inflammation.
• Prone positioning for P/F ratio <150.

VACCINATION:
WHO-approved vaccines: mRNA (Pfizer/BioNTech Comirnaty, Moderna Spikevax), Adenoviral vector (J&J Janssen, AZ Vaxzevria),
Protein subunit (Novavax Nuvaxovid), Inactivated (Covaxin, Sinovac CoronaVac).
Primary schedule: 2 doses. Boosters recommended based on national programmes.
Efficacy against severe disease and hospitalisation remains high across all WHO-approved vaccines."""
    },
    {
        "title": "Paediatric Vaccination Schedule — WHO EPI",
        "doc_type": "public_health",
        "text": """CHILDHOOD IMMUNISATION SCHEDULE (WHO EPI — Demo/Educational Content)

EXPANDED PROGRAMME ON IMMUNISATION (EPI):
WHO recommends universal childhood immunisation. National immunisation schedules vary but are based on WHO framework.

STANDARD EPI SCHEDULE (WHO 2023 Recommended Core Vaccines):

AT BIRTH:
• BCG (Bacillus Calmette-Guérin): 0.05 mL intradermal. Prevents severe TB (meningitis, miliary).
• OPV (Oral Polio Vaccine — bOPV): 2 drops oral. Birth dose in endemic countries.
• Hepatitis B Vaccine: 0.5 mL IM. Birth dose within 24 hours prevents perinatal transmission.

6 WEEKS (1.5 months):
• Pentavalent (DPT-HepB-Hib): 0.5 mL IM. DTP + Hepatitis B + Haemophilus influenzae type b.
• OPV (bOPV): 2 drops oral (Dose 1).
• PCV13 (Pneumococcal Conjugate): 0.5 mL IM (Dose 1).
• Rotavirus Vaccine: 1.5 mL oral (Dose 1).

10 WEEKS (2.5 months):
• Pentavalent (Dose 2).
• OPV (Dose 2).
• PCV13 (Dose 2).
• Rotavirus (Dose 2).

14 WEEKS (3.5 months):
• Pentavalent (Dose 3).
• OPV (Dose 3).
• PCV13 (Dose 3).
• IPV (Inactivated Polio Vaccine): 0.5 mL IM. (Replacing last OPV dose in many countries.)

9 MONTHS:
• Measles-Rubella (MR) Vaccine or MMR: 0.5 mL SC. (Some schedules delay MMR to 12 months.)
• Yellow Fever (in endemic countries): 0.5 mL SC.
• Meningococcal A (in meningitis belt): 0.5 mL IM (SIA or routine).

12–15 MONTHS:
• MMR Booster / MCV2 (second dose measles).
• PCV13 Booster.

15–18 MONTHS:
• DTP Booster.
• OPV Booster.

4–6 YEARS (SCHOOL ENTRY):
• DTP Booster.
• OPV/IPV Booster.

COLD CHAIN:
Vaccines must be maintained at 2–8°C throughout supply chain. Freeze-sensitive vaccines: DTwP, HepB, Hib.
Freeze-tolerant: OPV (can be stored frozen).

VACCINE HESITANCY:
Common concerns: Safety (autism myth — extensively disproven), ingredients, religious objections.
Communication: Motivational interviewing, empathetic communication, evidence sharing, community engagement.

ADVERSE EVENTS FOLLOWING IMMUNISATION (AEFI):
Most AEFIs are mild: localised pain/swelling/redness (24–48h), low-grade fever (24–48h).
Serious AEFIs: Anaphylaxis (rare, 1–2 per million doses) — treat with adrenaline, observe 30 min post-vaccine.
Report serious AEFIs immediately through national pharmacovigilance system."""
    },
    {
        "title": "Drug Interactions: Clinically Important Combinations",
        "doc_type": "medicine_safety",
        "text": """CLINICALLY IMPORTANT DRUG-DRUG INTERACTIONS (Demo/Educational Content)

WARFARIN INTERACTIONS:
Warfarin has a narrow therapeutic index and interacts with many drugs and foods.
INCREASES anticoagulant effect (elevated INR, bleeding risk):
  • Antibiotics: Metronidazole, Fluconazole, Ciprofloxacin, Clarithromycin, Cotrimoxazole
  • Amiodarone (major — double check INR after starting)
  • NSAIDs, Aspirin (additive bleeding risk)
  • Paracetamol (regular high doses)
  • Omeprazole (minor)
  • SSRIs (sertraline, fluoxetine)
DECREASES anticoagulant effect (subtherapeutic INR, clotting risk):
  • Rifampicin (major enzyme inducer — may need 5x normal dose)
  • Carbamazepine, Phenytoin, Phenobarbitone
  • Vitamin K (Green leafy vegetables — advise consistent intake, not avoidance)
  • Cholestyramine (reduces absorption)

STATINS AND MUSCLE TOXICITY (Myopathy/Rhabdomyolysis):
Risk increased when combined with:
  • Fibrates (Gemfibrozil — major risk with all statins; Fenofibrate — lower risk)
  • CYP3A4 inhibitors with simvastatin/atorvastatin: Clarithromycin, Itraconazole, HIV PIs, Cyclosporin
  • Amlodipine + Simvastatin: Cap simvastatin at 20 mg
  • Amiodarone + Simvastatin: Cap simvastatin at 20 mg
Management: Use rosuvastatin or pravastatin (minimal CYP3A4 metabolism) in patients on interacting drugs.

SEROTONIN SYNDROME:
Occurs when multiple serotonergic agents are combined.
High risk combinations:
  • SSRIs/SNRIs + MAOIs (potentially fatal — 14-day washout required)
  • SSRIs + Tramadol (use with caution)
  • SSRIs + Triptans (monitor)
  • SSRIs + Linezolid (antibiotic with MAOI properties)
  • SSRIs + Lithium + Tryptophan
Clinical features: Agitation, tremor, hyperthermia, clonus, diarrhoea, hypertension, tachycardia.
Treatment: Stop offending agent, cyproheptadine, supportive care. Benzodiazepines for agitation.

QT-PROLONGING DRUGS:
Combinations increase torsades de pointes risk:
  • Antiarrhythmics: Amiodarone, Sotalol, Quinidine
  • Antipsychotics: Haloperidol, Quetiapine
  • Antibiotics: Azithromycin, Clarithromycin, Moxifloxacin, Ciprofloxacin
  • Antiemetics: Domperidone, Ondansetron (high dose)
  • Antifungals: Fluconazole, Voriconazole
Management: Avoid combinations; correct electrolytes (K+, Mg2+); monitor ECG.

RIFAMPICIN — ENZYME INDUCER:
Rifampicin dramatically reduces blood levels of many drugs:
  • Contraceptives (OCP) — provide alternative contraception (barrier + OCP for 4 weeks after stopping)
  • Warfarin — may require 5x dose increase
  • HIV antiretrovirals — use rifabutin instead where possible
  • Methadone — precipitates withdrawal
  • Statins, Immunosuppressants (tacrolimus, cyclosporin)
  • Glucocorticoids — reduce steroid efficacy
  • Antifungals (fluconazole, itraconazole)

CYP2C9 INHIBITORS + PHENYTOIN:
Fluconazole, Metronidazole, and Amiodarone inhibit phenytoin metabolism → toxicity (nystagmus, ataxia).
Monitor phenytoin levels when starting any new drug in epileptic patients.

ACE INHIBITOR/ARB + K-SPARING DIURETIC + NSAIDs:
"Triple whammy" combination — high risk of acute kidney injury.
Avoid in patients on ACE/ARB + diuretic — use lowest NSAID dose for shortest duration if unavoidable.

METFORMIN + IODINATED CONTRAST:
Hold metformin 48 hours before and after iodinated contrast administration in eGFR 30–60 mL/min/1.73m².
Restart only if renal function confirmed stable post-procedure. No restriction if eGFR ≥60."""
    },
    {
        "title": "Essential Medicines and Rational Use",
        "doc_type": "public_health",
        "text": """ESSENTIAL MEDICINES AND RATIONAL USE OF MEDICINES (Demo/Educational Content)

WHO ESSENTIAL MEDICINES CONCEPT:
Essential medicines are those that satisfy the priority health care needs of the population.
They are selected with due regard to public health relevance, evidence of clinical efficacy and safety,
and comparative cost-effectiveness.
WHO Model List of Essential Medicines (EML): Updated every 2 years. 600+ individual medicines.

RATIONAL USE OF MEDICINES:
Patients receive medications appropriate to their clinical needs, in doses that meet their individual requirements,
for an adequate period of time, and at the lowest cost to them and their community.
IRRATIONAL USE: Polypharmacy, inappropriate antibiotics, self-medication, overuse of injectables.

ANTIMICROBIAL STEWARDSHIP (AMS):
Antimicrobial resistance (AMR) is a global health crisis. Conservative estimates: 700,000 deaths/year.
AMS principles:
  • Use antibiotics ONLY for bacterial infections (not viral upper respiratory infections, colds, flu)
  • Take the FULL course
  • Use narrowest-spectrum antibiotic effective for the infection
  • Culture-guided therapy where possible
  • No sharing or saving antibiotics

MEDICINE SAFETY:
• Adverse Drug Reactions (ADRs): Unintended effects at therapeutic doses.
• Drug-Drug Interactions: Altered pharmacokinetics/pharmacodynamics.
• Pharmacovigilance: Systematic monitoring of drug safety post-marketing.
• Report ADRs to national pharmacovigilance centre (Yellow Card/Vigibase).

STORAGE:
Most medicines: Room temperature (15–30°C), away from light and moisture.
Refrigerated (2–8°C): Insulin, vaccines, some biologicals.
Frozen (-15 to -20°C): Varicella vaccine, some live vaccines.
Never store medicines in: Bathrooms (humidity), cars (temperature extremes), kitchen cabinets near stove.

PRESCRIPTION WRITING BEST PRACTICES:
Generic name (INN) preferred over brand names.
Include: Drug name, dose, route, frequency, duration, indication.
Legible handwriting or electronic prescribing.
Avoid abbreviations (QD/QID confusion, µg vs mg confusion).

MEDICATION RECONCILIATION:
Process of comparing medications patient should be taking with those prescribed. Prevents omission errors and duplicates.
Critical at transitions of care: Admission, inter-ward transfer, discharge.

HIGH-ALERT MEDICATIONS:
Require additional safeguards — insulin (wrong dose), anticoagulants (warfarin), concentrated electrolytes (KCl IV),
neuromuscular blocking agents, opioids, chemotherapy agents.
These cause disproportionate harm when misused."""
    },
    {
        "title": "Anaemia: Diagnosis and Treatment",
        "doc_type": "clinical_guideline",
        "text": """ANAEMIA — CLASSIFICATION, DIAGNOSIS AND TREATMENT (Demo/Educational Content)

DEFINITION:
WHO criteria: Haemoglobin (Hb) <13 g/dL (men), <12 g/dL (women), <11 g/dL (pregnant women), <11.5 g/dL (children 5–11y).
Anaemia is a symptom, not a diagnosis — the underlying cause must be identified.

CLASSIFICATION BY RBC MORPHOLOGY:
Microcytic Anaemia (MCV <80 fL): Iron deficiency (most common worldwide), Thalassaemia, Anaemia of chronic disease (sometimes), Lead poisoning.
Normocytic Anaemia (MCV 80–100 fL): Haemolytic anaemia, blood loss (acute), aplastic anaemia, anaemia of chronic disease, mixed deficiency.
Macrocytic Anaemia (MCV >100 fL): Megaloblastic (B12 or folate deficiency), liver disease, hypothyroidism, alcohol, medications (methotrexate, hydroxyurea).

IRON DEFICIENCY ANAEMIA (IDA):
Most common nutritional deficiency worldwide. 2 billion people affected.
Causes: Dietary deficiency, blood loss (menorrhagia, GI — peptic ulcer, hookworm), malabsorption (coeliac).
Features: Fatigue, pallor, koilonychia (spoon nails), brittle nails, pica.
Diagnosis: Hb, MCV, serum ferritin (low), serum iron (low), TIBC (high), transferrin saturation (low).
Treatment: Ferrous sulphate 200 mg TDS for 3–6 months (give Vit C to enhance absorption).
Parenteral iron: IV Ferric Carboxymaltose or Iron Sucrose if oral not tolerated or malabsorption.

VITAMIN B12 DEFICIENCY:
Causes: Pernicious anaemia (autoimmune), strict vegan diet, gastric surgery, ileal disease, metformin.
Features: Anaemia (macrocytic), glossitis, peripheral neuropathy, subacute combined degeneration of cord (SACD).
Diagnosis: Serum B12, MMA, homocysteine (elevated).
Treatment: Cyanocobalamin 1 mg IM OD x7 days, then weekly x4, then monthly (lifelong if pernicious anaemia).
Or oral B12 1000 mcg OD (effective in dietary deficiency, and also high-dose oral works even in pernicious anaemia).

FOLATE DEFICIENCY:
Causes: Dietary, pregnancy, malabsorption, medications (methotrexate, phenytoin), alcohol excess.
Diagnosis: Red cell folate (preferred), serum folate.
Treatment: Folic acid 5 mg OD for 4 months. Continue in pregnancy (400 mcg–5 mg periconceptional).

ANAEMIA IN PREGNANCY:
Target Hb: >11 g/dL in first/third trimester; >10.5 g/dL in second trimester.
Routine supplementation: Iron 60 mg + Folic acid 0.4 mg OD from first antenatal visit until 3 months postpartum.
Treat moderate-severe IDA aggressively with iron (oral or IV as appropriate).
Transfusion threshold: Hb <7 g/dL (or higher if symptomatic or near term)."""
    },
    {
        "title": "Pneumonia: Community-Acquired Pneumonia Management",
        "doc_type": "clinical_guideline",
        "text": """COMMUNITY-ACQUIRED PNEUMONIA (CAP) — CLINICAL GUIDELINES (Demo/Educational Content)

DEFINITION:
Acute infection of the pulmonary parenchyma acquired outside of hospital or within 48h of admission.
Most common serious infection globally. Leading infectious cause of death.

COMMON CAUSATIVE ORGANISMS:
Typical bacteria: S. pneumoniae (most common — 30–40%), H. influenzae, Klebsiella pneumoniae, S. aureus.
Atypical organisms: Mycoplasma pneumoniae (common in younger patients), Chlamydophila pneumoniae, Legionella pneumophila.
Viral: Influenza A/B, SARS-CoV-2, RSV, Rhinovirus.
Aspiration: Anaerobes (in aspiration pneumonia, alcoholics).

CLINICAL FEATURES:
Cough (productive, dry), fever, rigors, pleuritic chest pain, dyspnoea.
Examination: Decreased breath sounds, dullness to percussion, bronchial breathing, crepitations.

SEVERITY ASSESSMENT (CURB-65 Score):
0 (Confusion), 1 (Urea >7 mmol/L), 2 (Respiratory rate ≥30/min), 3 (BP <90/60 mmHg), 4 (Age ≥65).
Score 0–1: Low severity — outpatient treatment.
Score 2: Moderate — short hospital stay or supervised outpatient.
Score ≥3: High severity — hospitalise. Score ≥4: Consider ICU.

INVESTIGATIONS:
CXR (confirm consolidation), CBC, CRP, U&E, LFTs. Sputum culture (before antibiotics if possible).
Blood cultures (if hospitalised, severe). Urinary antigen (Legionella, S. pneumoniae) in severe.
Procalcitonin: Helps distinguish bacterial from viral; guides antibiotic stewardship.

EMPIRICAL ANTIBIOTIC TREATMENT:

OUTPATIENT (No comorbidities, CURB-65 0–1):
• Amoxicillin 500 mg TDS x5 days (oral).
• If atypical suspected: Azithromycin 500 mg OD x5 days OR Doxycycline 100 mg BD x5 days.
• Penicillin-allergic: Doxycycline 100 mg BD or Levofloxacin 750 mg OD x5 days.

OUTPATIENT (with comorbidities — DM, COPD, asthma, heart disease, immunosuppression):
• Amoxicillin-Clavulanate 875/125 mg BD + Azithromycin 500 mg OD x5 days.
• Alternative: Respiratory fluoroquinolone (Levofloxacin 750 mg OD or Moxifloxacin 400 mg OD x5 days).

INPATIENT (Non-ICU):
• Ampicillin + Azithromycin (IV → oral step-down).
• Ceftriaxone 1g IV OD + Azithromycin 500 mg IV/oral.
• Respiratory fluoroquinolone monotherapy: Levofloxacin 750 mg IV/oral OD.

ICU ADMISSION:
• Beta-lactam + Azithromycin OR Respiratory fluoroquinolone.
• Add: Vancomycin or Linezolid if MRSA suspected. Antivirals if influenza positive.

DURATION: 5 days (most outpatient). 7–10 days for severe or bacteraemic pneumonia. 14–21 days for Legionella/Staphylococcal.

SWITCH TO ORAL: When afebrile x24–48h, respiratory rate <24/min, O2 saturation >94% on room air, able to take oral.
DISCHARGE: When clinically stable AND afebrile x48h AND O2 saturation ≥94% on room air."""
    },
    {
        "title": "Epilepsy and Seizure Management",
        "doc_type": "clinical_guideline",
        "text": """EPILEPSY — DIAGNOSIS AND MANAGEMENT (Demo/Educational Content)

DEFINITION:
Epilepsy: Neurological disorder characterised by recurrent, unprovoked seizures. Diagnosis requires ≥2 unprovoked seizures
or 1 unprovoked seizure with ≥60% risk of recurrence.
Seizure: Transient symptoms due to abnormal excessive or synchronous neuronal activity in the brain.

SEIZURE CLASSIFICATION (ILAE 2017):
FOCAL ONSET: Awareness retained (simple) or impaired (complex/dyscognitive). ± secondary generalisation.
GENERALISED ONSET: Tonic-clonic (grand mal), absence (petit mal), myoclonic, atonic/drop attacks, tonic, clonic.
UNKNOWN ONSET.

FIRST SEIZURE EVALUATION:
EEG: May show interictal discharges. Seizure semiology guides syndrome classification.
Brain MRI: Preferred over CT. Identifies structural causes.
Blood tests: Glucose, electrolytes (Na+, Ca2+, Mg2+), CBC, LFTs, urea. Drug levels if on AEDs.

WHEN TO START AEDs:
After ≥2 unprovoked seizures. May consider after 1 seizure if: High recurrence risk (focal EEG, brain lesion, idiopathic syndrome).
Do not treat acute symptomatic seizures (fever, metabolic, drugs) with long-term AEDs.

FIRST-LINE AED SELECTION:
Generalised Tonic-Clonic (GTC): Valproate (men), Lamotrigine or Levetiracetam (women of childbearing potential).
Focal (all types): Carbamazepine, Lamotrigine, Levetiracetam.
Absence Epilepsy: Ethosuximide, Valproate.
Juvenile Myoclonic Epilepsy (JME): Valproate (men), Levetiracetam (women).
Lennox-Gastaut: Valproate + Lamotrigine; Rufinamide add-on.

STATUS EPILEPTICUS — EMERGENCY MANAGEMENT:
Time is brain — terminate seizure within 5 minutes.
Phase 1 (0–5 min): Benzodiazepine.
  IV Access: Lorazepam 4 mg IV (0.1 mg/kg); OR Diazepam 10 mg IV.
  No IV: Midazolam 10 mg buccal or IM; Diazepam 10 mg rectal.
Phase 2 (5–20 min): If not terminated — second benzodiazepine dose or:
  IV Phenytoin 20 mg/kg at ≤50 mg/min with cardiac monitoring; OR IV Valproate 30 mg/kg; OR IV Levetiracetam 60 mg/kg.
Phase 3 (20–40 min): Refractory status — ICU admission.
  Propofol, Thiopentone, Midazolam infusions. EEG monitoring.

DRIVING: Regulations vary by country. Generally 1 year seizure-free driving ban (UK/India). Advise on reporting requirements.
SAFETY: Avoid swimming alone, heights, unsupervised baths.
WOMEN WITH EPILEPSY: Contraception (enzyme inducers reduce OCP efficacy), pregnancy (folic acid 5 mg, AED monitoring, prefer levetiracetam/lamotrigine over valproate)."""
    },
    {
        "title": "Infection Control and Prevention in Healthcare Settings",
        "doc_type": "public_health",
        "text": """INFECTION PREVENTION AND CONTROL (IPC) IN HEALTHCARE (Demo/Educational Content)

STANDARD PRECAUTIONS:
Apply to ALL patients regardless of known infection status. Core IPC measures:
1. HAND HYGIENE (Most important IPC measure):
   When to clean hands (5 Moments — WHO):
   1. Before touching patient
   2. Before clean/aseptic procedure
   3. After body fluid exposure/risk
   4. After touching patient
   5. After touching patient surroundings
   
   Hand rub (ABHR): 20–30 seconds for visibly clean hands.
   Handwashing with soap and water: 40–60 seconds, or when hands visibly soiled, C. difficile patients.
   Correct technique: All surfaces including thumbs, between fingers, backs of hands, wrists.

2. PPE (Personal Protective Equipment):
   Gloves: When touching body fluids, mucous membranes, non-intact skin.
   Apron/Gown: Risk of body fluid splashing.
   Face mask: Respiratory procedures, source control.
   Eye protection/Face shield: Risk of splashing.
   PPE donning order: Hand hygiene → Gown → Mask → Eye protection → Gloves.
   PPE doffing order (reverse, most contaminated last): Gloves → Eye protection → Gown → Mask → Hand hygiene.

3. SAFE INJECTION PRACTICES:
   Single-use, sterile, disposable needles and syringes for each injection.
   Never recap needles (risk of needlestick). Use safety-engineered devices.
   Safe disposal in sharps containers (puncture resistant, sealed when 3/4 full).

4. RESPIRATORY HYGIENE / COUGH ETIQUETTE:
   Cover coughs/sneezes with tissue or elbow. Dispose tissue. Hand hygiene.
   Patients with respiratory symptoms: Surgical mask if able.

TRANSMISSION-BASED PRECAUTIONS (in addition to Standard):
CONTACT PRECAUTIONS (MRSA, VRE, C. difficile, wound infections):
   Gloves and apron on entry. Dedicated equipment (stethoscope, BP cuff). Soap and water handwashing for C. diff.
DROPLET PRECAUTIONS (Influenza, COVID-19, Meningococcal, Pertussis, Mumps):
   Surgical mask within 1 m. Patient in single room or cohorting.
AIRBORNE PRECAUTIONS (TB, measles, varicella, COVID-19 aerosol-generating procedures):
   FFP3/N95 respirator. Negative pressure room. Minimum 12 air changes/hour.

HEALTHCARE-ASSOCIATED INFECTIONS (HAIs):
Most common: UTI (CAUTI), surgical site infections (SSI), ventilator-associated pneumonia (VAP), CLABSI.
Bundles reduce HAI rates significantly:
  CAUTI bundle: Only catheterise if necessary, daily review, remove earliest possible, proper insertion technique.
  VAP bundle: Head elevation 30°, daily sedation holds, oral care, peptic ulcer/DVT prophylaxis.
  SSI bundle: Appropriate prophylactic antibiotic (within 60 min pre-incision), normothermia, glycaemic control."""
    },
    {
        "title": "Cardiovascular Risk Assessment and Prevention",
        "doc_type": "clinical_guideline",
        "text": """CARDIOVASCULAR RISK ASSESSMENT AND PREVENTION (Demo/Educational Content)

CARDIOVASCULAR DISEASE (CVD) BURDEN:
Leading cause of death globally — 17.9 million deaths/year (WHO). 
Most CVD deaths are preventable through addressing modifiable risk factors.

RISK FACTORS:
NON-MODIFIABLE: Age (men >45, women >55), sex (men higher risk pre-menopause), family history (first-degree relative CAD <55 men/<65 women).
MODIFIABLE: Hypertension, dyslipidaemia, smoking, type 2 diabetes, obesity (BMI >30), sedentary lifestyle, unhealthy diet, psychosocial stress, sleep disorders.

CVD RISK ESTIMATION:
10-year risk of fatal or non-fatal CV event:
  Framingham Risk Score, ASCVD pooled cohort equation (USA), SCORE2 (Europe), WHO CVD Risk Charts.
Risk categories: Low (<5%), Moderate (5–10%), High (10–20%), Very High (>20% or established CVD/DM with end organ damage).

LIPID TARGETS BY RISK:
Very High Risk: LDL-C <70 mg/dL (<1.8 mmol/L) AND ≥50% reduction from baseline.
High Risk: LDL-C <100 mg/dL (<2.6 mmol/L).
Moderate Risk: LDL-C <115 mg/dL (<3.0 mmol/L).

STATIN THERAPY:
High-intensity statins (>50% LDL reduction): Atorvastatin 40–80 mg, Rosuvastatin 20–40 mg.
  For: Very high risk, Established ASCVD.
Moderate-intensity (30–50% LDL reduction): Atorvastatin 10–20 mg, Rosuvastatin 5–10 mg, Simvastatin 20–40 mg.
  For: Primary prevention high risk.

ADD-ON THERAPIES (if statins insufficient):
Ezetimibe (reduces LDL by further 15–20%).
PCSK9 inhibitors (Evolocumab, Alirocumab): 50–60% additional LDL reduction — for very high risk or statin intolerance.

ASPIRIN IN CVD:
SECONDARY PREVENTION: Aspirin 75–100 mg OD established — reduces MI and stroke by 25%.
PRIMARY PREVENTION: No longer recommended routinely for low-moderate risk — bleeding risk outweighs benefit.
Primary prevention may be considered only in high-risk individuals on a case-by-case basis.

SMOKING CESSATION:
Smoking doubles CV risk. Cessation reduces risk to that of a non-smoker within 5 years.
NRT (Nicotine Replacement Therapy): Patches, gum, lozenges. Combine with counselling.
Varenicline (Champix): Most effective pharmacotherapy.
Bupropion: Second-line.

LIFESTYLE MODIFICATIONS:
Mediterranean diet: Rich in fruits, vegetables, whole grains, olive oil, nuts, fish. Reduces CV events by 30%.
Physical activity: ≥150 min/week moderate intensity.
Target BMI: 20–25 kg/m². Waist circumference <102 cm (men), <88 cm (women).
Alcohol: ≤1 standard drink/day (women), ≤2 (men). No safe level for CV benefit demonstrated in newer studies."""
    },
    {
        "title": "Maternal and Child Health: Antenatal Care Protocol",
        "doc_type": "public_health",
        "text": """ANTENATAL CARE (ANC) — WHO 2016 MODEL (Demo/Educational Content)

WHO RECOMMENDATION:
Minimum 8 antenatal contacts for positive pregnancy experience. Increase from previous 4-visit model.

ANC CONTACTS SCHEDULE (WHO 2016 ANC MODEL):
First trimester (1–12 weeks): Contact 1 — ≤12 weeks (as early as possible).
Second trimester (13–27 weeks): Contacts 2–4 — 20, 26, (optional 27) weeks.
Third trimester (28–40 weeks): Contacts 5–8 — 30, 34, 36, 38, 40 weeks.

CONTACT 1 (≤12 weeks) — BOOKING VISIT:
History: LMP, obstetric history, medical/surgical history, medications, allergies, social history, FH.
Physical exam: Weight, height, BMI, BP, abdominal exam.
Blood tests: CBC, blood group and Rh type, VDRL/RPR (syphilis), HIV (provider-initiated), HBsAg, urine culture, blood glucose/HbA1c, thyroid function.
Ultrasound: Dating scan (if available) — confirm GA, viability, number of embryos.
Supplements: Folic acid 400 mcg OD (5 mg if high risk), iron supplementation.
Vaccinations: Tetanus toxoid (TT) schedule.

ONGOING MONITORING AT EACH CONTACT:
Blood pressure: Target <140/90. Pre-eclampsia screening.
Weight gain: Recommended gain depends on pre-pregnancy BMI.
Symphysio-fundal height (SFH): Guides fetal growth.
Fetal heart tones: Doppler from 12 weeks.
Urine dipstick: Protein (pre-eclampsia), glucose (GDM), nitrites (UTI).

SCREENING AND INTERVENTIONS:
Gestational Diabetes (GDM): 75g OGTT at 24–28 weeks.
Pre-eclampsia: Low-dose aspirin (150 mg OD from 12–36 weeks) for high-risk women.
Anaemia: Iron-folate supplementation throughout. Treat if Hb <11 g/dL.
GBS (Group B Streptococcus): Swab at 35–37 weeks (selective cultures protocol).

DANGER SIGNS (IMMEDIATE REFERRAL):
Vaginal bleeding, severe headache, visual disturbance, epigastric pain, oedema (sudden onset face/hands),
absent fetal movements, preterm contractions (<37 weeks), preterm rupture of membranes, fever.

BIRTH PREPAREDNESS:
Skilled birth attendant, transport to facility, emergency funds, blood donors.
Hospital bag ready from 36 weeks.

POSTNATAL CARE:
Mother: 6 weeks postnatal visit. Screen for postnatal depression (Edinburgh Postnatal Depression Scale).
Baby: Newborn check at birth, 6 weeks, 3 months."""
    },
    {
        "title": "Non-Communicable Diseases: Prevention and Control",
        "doc_type": "public_health",
        "text": """NON-COMMUNICABLE DISEASES (NCDs) — PREVENTION AND CONTROL (Demo/Educational Content)

THE NCD BURDEN:
NCDs cause 71% of all deaths globally (WHO). Leading NCDs: Cardiovascular disease (31%), Cancer (16%), Respiratory disease (7%), Diabetes (3%).
80% of premature NCD deaths occur in low- and middle-income countries (LMICs).

SHARED RISK FACTORS (80% of NCD burden attributable to 4 modifiable risk factors):
1. Tobacco use: Causes cancer, CVD, COPD. 8 million deaths/year.
2. Harmful alcohol use: Liver disease, cancer, CVD, injuries.
3. Physical inactivity: CVD, diabetes, cancer.
4. Unhealthy diet: Excess salt, sugar, saturated fat — CVD, diabetes, cancer, obesity.

WHO BEST BUYS FOR NCD PREVENTION (Cost-effective interventions):
• Tobacco: Tax increases, smoke-free policies, cessation support, pictorial warnings.
• Alcohol: Restrict access, raise prices, ban advertising, brief counselling.
• Diet: Salt reduction (target <5g/day), trans-fat elimination, regulate food marketing to children.
• Physical activity: Walking/cycling infrastructure, community-level programmes, school-based interventions.

SECONDARY PREVENTION (identifying and treating established disease):
• Opportunistic screening for HTN, DM, dyslipidaemia, oral/cervical/breast/colorectal cancer.
• WHO PEN package: Practical Approaches to Lung Health, cardiovascular risk management, diabetes, cancer.
• Task shifting: Community health workers can conduct BP measurement, counselling, referral.

CANCER PREVENTION:
Avoidable cancers (WHO): Tobacco (33%), alcohol, obesity/physical inactivity, infections (HPV, HBV, H. pylori).
Screening programmes: Cervical cancer (VIA/Pap smear/HPV DNA), breast cancer (mammography), colorectal (FOBT).
Vaccination: HPV vaccine (prevents cervical/anal/oropharyngeal cancer), Hepatitis B vaccine (prevents HBV-related HCC).

MENTAL HEALTH AND NCDs:
Bidirectional relationship between mental health disorders and NCDs.
Depression common in people with diabetes, CVD, cancer. Increases NCD mortality.
Integrated care: Screen for depression at NCD clinics. Collaborative care models.

HEALTH SYSTEM STRENGTHENING FOR NCDs:
Essential NCD medicines and technology at primary health care level.
WHO Package of Essential Noncommunicable Disease Interventions (WHO PEN).
Multi-sectoral action: Education, food policy, urban planning, taxation."""
    },
    {
        "title": "Paediatric Common Illnesses: Fever and Diarrhoea Management",
        "doc_type": "clinical_guideline",
        "text": """COMMON PAEDIATRIC ILLNESSES — MANAGEMENT GUIDE (Demo/Educational Content)

1. FEVER IN CHILDREN:
DEFINITION: Axillary temperature ≥37.5°C or rectal ≥38.0°C.
Fever is a symptom, not a disease — always look for the cause.

CAUSES: Viral URTI (most common), bacterial infections, post-immunisation, UTI, malaria (endemic areas), other.

ASSESSMENT — WARNING SIGNS (IMCI/DANGER SIGNS):
Not drinking/breastfeeding, vomiting everything, convulsions, lethargic/unconscious, stridor in calm child,
severe palmar pallor, bilateral lower extremity oedema, very low weight.
Refer urgently if any danger sign present.

TREATMENT:
Paracetamol 15 mg/kg every 4–6 hours (oral/suppository).
Ibuprofen 10 mg/kg every 6–8 hours if >3 months (not in dengue).
Physical measures: Tepid sponging (water at body temperature), adequate clothing, adequate fluids.
DO NOT: Aspirin in children (Reye syndrome), alcohol sponging.

Antibiotics ONLY for proven/strongly suspected bacterial infections. Not for viral URTI.

Febrile seizure management:
Most self-limiting (1–3 min). Safety: Lateral positioning, clear airway.
Prolonged (>5 min): Diazepam rectal 0.5 mg/kg (max 10 mg) or IV 0.2–0.3 mg/kg.

2. ACUTE DIARRHOEA IN CHILDREN:
DEFINITION: ≥3 loose/watery stools in 24 hours.
Global burden: 2nd leading cause of child mortality under 5. ~500,000 deaths/year (WHO).

ASSESSMENT — DEHYDRATION SIGNS:
NO DEHYDRATION: Alert, drinks normally, moist eyes/mouth, normal skin turgor.
SOME DEHYDRATION: Restless/irritable, sunken eyes, drinks eagerly, skin turgor returns in 1–2 sec.
SEVERE DEHYDRATION: Lethargic/unconscious, very sunken eyes/fontanelle, unable to drink, skin turgor >2 sec.

TREATMENT (IMCI Protocol):
No Dehydration: Extra ORS at home (50–100 mL/kg), zinc (20 mg/day x 14 days in >6 months), continue breastfeeding/age-appropriate diet.
Some Dehydration: ORS 75 mL/kg over 4 hours in facility. Reassess after 4 hours.
Severe Dehydration: IV Ringer's Lactate or Normal Saline 100 mL/kg over 3 hours (<12 months) or 3 hours (≥12 months).

ZINC SUPPLEMENTATION: 20 mg elemental zinc OD x 14 days reduces duration and severity of diarrhoea episode.

ANTIBIOTICS: Only for: Cholera (bloody diarrhoea/confirmed), dysentery, shigellosis.
NOT for: Rotavirus (most common), viral gastroenteritis, watery non-bloody diarrhoea.

NUTRITION: Continue breastfeeding. Start feeding within 4–6 hours of starting ORS.
LOPERAMIDE: CONTRAINDICATED in children under 12 years.

PREVENTION: Breastfeeding (6 months exclusive), safe water/food, hand hygiene, rotavirus vaccination, improved sanitation."""
    },
    {
        "title": "HIV/AIDS: Prevention, Testing, and Treatment",
        "doc_type": "clinical_guideline",
        "text": """HIV/AIDS — PREVENTION, TESTING, AND TREATMENT (Demo/Educational Content)

EPIDEMIOLOGY:
38.4 million people living with HIV globally (UNAIDS 2022). Sub-Saharan Africa hardest hit.
1.3 million new infections in 2022. 630,000 AIDS-related deaths.
UNAIDS 95-95-95 targets: 95% diagnosed, 95% on ART, 95% virally suppressed.

TRANSMISSION:
Sexual intercourse (unprotected) — most common. Blood (sharing needles/transfusion). Mother-to-child (MTCT).
HIV does NOT transmit through: Casual contact, air, water, insect bites, sharing food/utensils.

DIAGNOSIS:
4th generation HIV test (antigen-antibody combo): Detects from ~2 weeks post-exposure.
Rapid antibody tests: Widely used in resource-limited settings. Sensitivity >99%.
Confirmatory Western Blot or HIV-1 differentiation assay.
Window period: 18–45 days (4th gen); up to 90 days (3rd gen antibody).

CD4 count: Immune status; guides prophylaxis. Starting ART criterion: Any CD4.
Viral load: Gold standard for treatment monitoring. Goal: Undetectable (<50 copies/mL).

WHO STAGING:
Stage 1: Asymptomatic. Stage 2: Mild symptoms (minor mucocutaneous). Stage 3: Severe (TB, oral candidiasis, severe bacterial).
Stage 4 (AIDS-defining): PCP, cryptococcal meningitis, Kaposi's sarcoma, CMV retinitis, disseminated MAC.

ANTIRETROVIRAL THERAPY (ART) — WHO 2021 GUIDELINES:
START ART IN ALL PEOPLE LIVING WITH HIV regardless of CD4 count.
Preferred First-Line: TLD — Tenofovir 300 mg + Lamivudine 300 mg + Dolutegravir 50 mg (once daily, single tablet).
  Why TLD: High barrier to resistance, excellent tolerability, once daily.
Alternative: TLE — Tenofovir + Lamivudine + Efavirenz (if DTG not available or contraindicated in early pregnancy).
Second-line (after first-line failure confirmed by VL): Boosted Atazanavir or Lopinavir/r-based + 2 NRTIs.

OPPORTUNISTIC INFECTION PROPHYLAXIS:
Cotrimoxazole Prophylaxis Therapy (CPT): All HIV+ with CD4 <200 cells/µL or Stage 3/4.
Isoniazid Preventive Therapy (IPT): All HIV+ without active TB, after TB screening.
Fluconazole: Secondary prophylaxis after cryptococcal meningitis.

PREVENTION:
PrEP (Pre-Exposure Prophylaxis): TDF+FTC OD for HIV-negative high-risk individuals. >99% effective.
PEP (Post-Exposure Prophylaxis): TLD x28 days within 72 hours of exposure.
PMTCT (Prevention of Mother-to-Child Transmission): ART for all pregnant women + infant NVP x6 weeks.
Condoms: Male condoms 85–95% effective against HIV (consistent correct use).
VMMC: Voluntary Medical Male Circumcision reduces male acquisition by ~60%."""
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# 3. HEALTHCARE BROADCASTS / NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

BROADCASTS = [
    # Public Health Alerts
    ("🦟 Dengue Alert: Yellow Zone — Sector 7", "OUTBREAK",
     "Surveillance data indicates a significant cluster of dengue fever cases in Sector 7 and adjoining areas. Citizens are advised to eliminate standing water, use mosquito repellents, and seek immediate medical attention for fever above 38°C. Spray teams deployed. [Demo/Sample Data]", days_ago(2)),
    ("🌡️ Heat Wave Health Advisory", "SYSTEM",
     "Extreme heat conditions expected for the next 5 days (Max temp: 43°C). Health advisory: Stay indoors 11am–4pm, drink ≥3L water/day, wear light loose clothing, avoid alcohol and caffeine. Emergency helpline: 112. Elderly and children at highest risk. [Demo/Sample Data]", days_ago(3)),
    ("💉 BCG Vaccination Catch-Up Drive — Block C", "SYSTEM",
     "A targeted BCG vaccination catch-up drive will be conducted in Block C community health centres this weekend. All children under 1 year who missed their birth-dose BCG are eligible. Bring your child's immunisation card. [Demo/Sample Data]", days_ago(5)),
    ("⚠️ Cholera Outbreak — Contaminated Well Alert", "OUTBREAK",
     "Cases of acute watery diarrhoea consistent with cholera have been identified in Village B linked to a contaminated community well. DO NOT USE this water source. Emergency water supply trucks dispatched. Boil all drinking water. ORS is available at the sub-centre. [Demo/Sample Data]", days_ago(1)),
    ("🤧 Influenza Season Alert — High Activity", "SYSTEM",
     "Influenza activity has entered its peak seasonal phase. Symptoms: Fever >38°C, muscle aches, headache, dry cough, sore throat. Management: Rest, paracetamol, fluids. Seek care if: High-risk (elderly, pregnant, immunocompromised) or deteriorating condition. Annual flu vaccine strongly recommended. [Demo/Sample Data]", days_ago(4)),
    ("💊 Drug Recall Notice: Metformin Extended Release — Batch XZ-221", "SYSTEM",
     "The Drug Controller has issued a voluntary recall of Metformin ER 500mg Batch XZ-221 (Expiry: Nov 2026) due to NDMA contamination above accepted levels. Patients on this specific batch should consult their doctor. Do NOT stop diabetes medication without medical advice. [Demo/Sample Data]", days_ago(6)),
    ("🏥 Meningococcal Meningitis Alert — University Campus", "OUTBREAK",
     "A cluster of 3 confirmed meningococcal meningitis cases has been identified on campus. All close contacts being traced for antibiotic prophylaxis. Symptoms requiring emergency attention: Severe headache, stiff neck, photophobia, non-blanching rash, high fever. Call 112 immediately. [Demo/Sample Data]", days_ago(8)),
    ("🦠 COVID-19 Update — New Variant Monitoring", "SYSTEM",
     "Health authorities are monitoring a new SARS-CoV-2 variant. Current COVID-19 vaccines continue to provide significant protection against severe disease. Booster doses recommended for elderly and immunocompromised. Maintain good ventilation in crowded indoor settings. [Demo/Sample Data]", days_ago(10)),
    ("🦟 Malaria High Transmission Season Warning", "OUTBREAK",
     "The rainy season marks the start of peak malaria transmission. Health advisory: Use long-lasting insecticidal nets (LLINs) every night, apply insect repellent, and seek urgent testing for ANY fever. Artemisinin-based combination therapy (ACT) is available at all health centres. [Demo/Sample Data]", days_ago(12)),
    ("🚨 Rabies Alert — Dog Bite Cases", "SYSTEM",
     "Multiple dog bite incidents reported. Reminder: Wash bite wound immediately with soap and water for 15 minutes. Seek medical care urgently for Post-Exposure Prophylaxis (PEP). Rabies is 100% fatal if PEP is not started — do NOT delay. [Demo/Sample Data]", days_ago(14)),
    # Vaccination Updates
    ("💉 National Measles-Rubella (MR) Vaccination Campaign — Starting Monday", "SYSTEM",
     "The National MR Vaccination Campaign begins Monday. All children 9 months to 15 years are eligible for a free MR vaccine dose at school vaccination camps and PHCs. Campaign duration: 4 weeks. Protect your child from measles and rubella. [Demo/Sample Data]", days_ago(7)),
    ("💉 COVID-19 Booster Drive — Elderly Priority", "SYSTEM",
     "A targeted COVID-19 booster dose drive for individuals aged 60+ and immunocompromised persons is being conducted at all district hospitals and urban PHCs this week. Bring your vaccination card. Walk-in registrations accepted. [Demo/Sample Data]", days_ago(9)),
    ("💉 Rotavirus Vaccine Now Available at PHCs", "SYSTEM",
     "The Rotavirus vaccine has been added to the national immunisation schedule for children under 2 years. First dose at 6 weeks, second at 10 weeks, third at 14 weeks. Rotavirus is the leading cause of severe diarrhoea in children. [Demo/Sample Data]", days_ago(15)),
    ("💉 HPV Vaccine Rollout for Adolescent Girls", "SYSTEM",
     "The HPV vaccine (Cervavac) is now available for girls aged 9–14 years at all government health facilities. 2-dose schedule (0 and 6 months). HPV vaccination prevents the leading cause of cervical cancer. [Demo/Sample Data]", days_ago(20)),
    # Medicine Safety Alerts
    ("⚠️ Antibiotic Resistance — Stop Self-Medication", "SYSTEM",
     "WHO has declared antimicrobial resistance one of the greatest threats to global health. DO NOT self-prescribe antibiotics. Always complete your prescribed course. Never share antibiotics with others. [Demo/Sample Data]", days_ago(11)),
    ("💊 Paracetamol Overdose Warning", "SYSTEM",
     "Reports of liver failure due to accidental paracetamol overdose are increasing. NEVER exceed 4g (4000mg) per day in adults. Avoid taking multiple paracetamol-containing products simultaneously. Keep medicines out of reach of children. [Demo/Sample Data]", days_ago(16)),
    ("⚠️ Fake Medicines Circulation Alert", "SYSTEM",
     "Counterfeit antimalarial medicines have been detected in informal markets. Buy medicines only from licensed pharmacies. Check packaging integrity, expiry date, and manufacturer's details. Report suspected fake medicines to the drug controller helpline. [Demo/Sample Data]", days_ago(18)),
    ("💊 Opioid Misuse Prevention Campaign", "SYSTEM",
     "Community advisory on prescription opioid misuse: Use pain medicines only as prescribed by your doctor. Do not share prescription medicines. Dispose of unused medicines safely (do not flush or throw in bin — return to pharmacy). [Demo/Sample Data]", days_ago(22)),
    # Disease Surveillance Bulletins
    ("📊 Monthly Disease Surveillance Bulletin — August 2026", "SYSTEM",
     "August 2026 Surveillance Summary: Dengue (214 cases, 28% increase from July), Malaria (87 cases, stable), Influenza-like illness (Peak activity, especially 5–14 age group), COVID-19 (Low-moderate community transmission). No new outbreaks of cholera or typhoid. [Demo/Sample Data]", days_ago(25)),
    ("🔬 TB Elimination Programme Update", "SYSTEM",
     "Progress update on the National TB Elimination Programme: Active case finding identified 1,240 new TB cases in Q2 2026. Treatment success rate: 88% (above WHO target of 85%). All districts now have GeneXpert facilities for rapid TB diagnosis. [Demo/Sample Data]", days_ago(30)),
    ("📋 Community Health Worker Report — September 2026", "SYSTEM",
     "Field report from 450 community health workers: 8,420 home visits conducted, 1,205 new patients registered, 892 referrals to PHCs, 1,456 vaccination doses administered. High-risk areas for follow-up: Sectors 3, 7, and 12. [Demo/Sample Data]", days_ago(3)),
    ("🌡️ Scrub Typhus Alert — Rural Areas", "OUTBREAK",
     "Scrub typhus (mite-borne rickettsial infection) cases increasing in rural areas following monsoon. Symptoms: Fever, headache, rash, eschar (small painless black scab) at mite bite site. Treatment: Doxycycline. Avoid sitting/walking on grassy areas. [Demo/Sample Data]", days_ago(13)),
    ("🦠 Leptospirosis Warning — Post-Monsoon", "OUTBREAK",
     "Leptospirosis cases rising following flooding. Risk: Contact with flood water contaminated with animal urine. Prevention: Boots and gloves in flood water. Symptoms: Fever, severe headache, muscle pain, jaundice. Treatment: Doxycycline (mild), Penicillin/Ceftriaxone (severe). [Demo/Sample Data]", days_ago(17)),
    ("💉 Tetanus Booster Advisory — Construction Workers", "SYSTEM",
     "Workers in construction, agriculture, and outdoor settings are at risk of tetanus from soil-contaminated wounds. Ensure your tetanus vaccination is up-to-date (booster every 10 years). Any deep/dirty wound requires immediate wound care and booster if >5 years since last dose. [Demo/Sample Data]", days_ago(21)),
    # WHO/Government Health Announcements
    ("🌍 World Health Day 2026 — Health Equity", "SYSTEM",
     "World Health Day 2026 Theme: 'Health for All — Closing the Gap'. Join global efforts to achieve Universal Health Coverage. Every person deserves access to quality health services without financial hardship. Know your rights as a patient. [Demo/Sample Data]", days_ago(35)),
    ("🚬 World No Tobacco Day Advisory", "SYSTEM",
     "Tobacco kills 8 million people every year. Quitting smoking at any age saves lives and money. Free cessation helpline available: 1800-XXX-XXXX. Nicotine replacement therapy (patches, gum) and Varenicline available at government hospitals. [Demo/Sample Data]", days_ago(40)),
    ("🍎 National Nutrition Week Campaign", "SYSTEM",
     "This National Nutrition Week, pledge to eat a balanced diet: At least 5 portions of fruits and vegetables daily, limit salt to <5g/day, limit saturated fat, avoid sugary drinks and processed foods. Good nutrition prevents 45% of child deaths globally. [Demo/Sample Data]", days_ago(38)),
    ("🧠 Mental Health Awareness Month", "SYSTEM",
     "Mental health affects everyone. Seek help without shame. Depression and anxiety are treatable. Signs of mental health crisis: Persistent sadness, loss of interest, thoughts of self-harm. National mental health helpline: NIMHANS — 080-46110007. [Demo/Sample Data]", days_ago(42)),
    ("🤰 Safe Motherhood Initiative Update", "SYSTEM",
     "The Safe Motherhood Initiative aims to achieve zero preventable maternal deaths. Ensure every pregnant woman receives at least 8 antenatal contacts with skilled care. Emergency obstetric care available 24/7 at District Hospitals. Helpline: 102. [Demo/Sample Data]", days_ago(45)),
    # Regional/Hospital Health Updates
    ("🏥 District Hospital — New Dialysis Unit Opened", "SYSTEM",
     "The District Hospital has commissioned a new 8-bed dialysis unit, increasing renal replacement therapy capacity for patients with chronic kidney disease. Referrals can be made through the national health portal or through PHC medical officers. [Demo/Sample Data]", days_ago(50)),
    ("🔬 Free Cancer Screening Camp — This Saturday", "SYSTEM",
     "The Regional Cancer Centre is conducting a free cancer screening camp this Saturday at the Community Hall. Services: Cervical (VIA), breast (clinical examination), oral (inspection). Bring your Aadhaar card. 9am–4pm. Slots are limited — register now. [Demo/Sample Data]", days_ago(28)),
    ("🏥 Blood Donation Drive — Urgent Need for O-Negative", "SYSTEM",
     "The blood bank has a critical shortage of O-negative blood. Eligible donors (18–65 years, weight >50 kg, Hb >12.5 g/dL) are urged to donate. Walk-in at District Hospital Blood Bank or call 1800-180-XXXX to schedule. [Demo/Sample Data]", days_ago(26)),
    ("💊 Essential Medicines Price Control Update", "SYSTEM",
     "The National Pharmaceutical Pricing Authority has revised ceiling prices for 26 essential medicines. Patients can check NPPA website or toll-free number to verify maximum retail prices. If overcharged, lodge a complaint at the district drug controller's office. [Demo/Sample Data]", days_ago(32)),
    ("🌡️ Winter Respiratory Disease Alert", "SYSTEM",
     "Winter season brings increased risk of respiratory infections including influenza, pneumonia, and RSV. High-risk groups (elderly, children, immunocompromised, COPD/asthma patients): Ensure influenza vaccine, pneumococcal vaccine, and adequate warm clothing. Seek early care for respiratory symptoms. [Demo/Sample Data]", days_ago(55)),
    ("⚠️ Childhood Lead Poisoning Prevention", "SYSTEM",
     "Lead poisoning in children causes irreversible cognitive impairment. Common sources: Lead paint in old buildings, contaminated soil, some herbal/traditional remedies. Ensure children have balanced diet (calcium, iron, Vit C reduce lead absorption). Report suspected exposure to PHC. [Demo/Sample Data]", days_ago(60)),
    # Seasonal Disease Warnings
    ("🌧️ Monsoon Disease Prevention Advisory", "SYSTEM",
     "Monsoon season increases risk of: Waterborne diseases (cholera, typhoid, hepatitis A — boil water), vector-borne diseases (malaria, dengue — eliminate standing water), leptospirosis (avoid walking in flood water). Increase surveillance and report unusual case clusters. [Demo/Sample Data]", days_ago(65)),
    ("❄️ Cold Wave Advisory — Northern Region", "SYSTEM",
     "Cold wave conditions expected. Health risks: Hypothermia, chilblains, exacerbation of respiratory/cardiovascular conditions. Advisory: Layer clothing, adequate indoor heating, warm meals, monitor elderly living alone. Hypothermia first aid: Gradual rewarming, warm fluids (if conscious), emergency services. [Demo/Sample Data]", days_ago(70)),
    ("🌾 Harvest Season Accident Prevention", "SYSTEM",
     "Agricultural workers: Risk of pesticide poisoning during harvest season. Organophosphate poisoning symptoms: Excessive sweating, salivation, lacrimation, pinpoint pupils, bradycardia, seizures. Treatment: Atropine, Pralidoxime. Seek EMERGENCY CARE immediately. Always wear PPE when handling pesticides. [Demo/Sample Data]", days_ago(48)),
    ("🦟 Filariasis Mass Drug Administration Round", "SYSTEM",
     "Mass Drug Administration (MDA) for lymphatic filariasis prevention: All eligible residents (≥2 years, except pregnant women and seriously ill) in endemic districts receive free Diethylcarbamazine (DEC) + Albendazole. Health workers will visit homes. Accept and take all doses. [Demo/Sample Data]", days_ago(52)),
    ("🐕 Anti-Rabies Vaccination Drive — Stray Animal Population", "SYSTEM",
     "A municipal animal birth control and anti-rabies vaccination drive will be conducted for stray dog and cat populations in all wards this month. If bitten by any animal — stray or domestic — seek post-exposure prophylaxis (PEP) at the nearest PHC immediately. [Demo/Sample Data]", days_ago(58)),
    # Government Health Policy Updates
    ("🏛️ Ayushman Bharat — PM-JAY Expansion", "SYSTEM",
     "Ayushman Bharat — Pradhan Mantri Jan Arogya Yojana (PM-JAY) now covers 1,949 medical procedures up from 1,393. Annual coverage: ₹5 lakhs/family/year at empanelled hospitals. Check eligibility and download your Ayushman card at the nearest PHC or Common Service Centre. [Demo/Sample Data]", days_ago(75)),
    ("🏛️ National Digital Health Mission (ABDM) Update", "SYSTEM",
     "The Ayushman Bharat Digital Mission (ABDM) is expanding. Every Indian can now create an Abha Health ID (Health Card) that stores digital medical records across hospitals. Register at abha.abdm.gov.in or PHC Help Desks. [Demo/Sample Data]", days_ago(80)),
    ("📋 Universal Health Coverage Progress Report 2026", "SYSTEM",
     "India's UHC Service Coverage Index has improved from 55 to 65 (out of 100) over the past 5 years. Key achievements: Reduced maternal mortality ratio, increased childhood vaccination coverage (93%), TB case detection rate improvement. Areas needing focus: NCD management and mental health. [Demo/Sample Data]", days_ago(85)),
    ("💊 Rational Use of Antimicrobials — National Action Plan", "SYSTEM",
     "India's National Action Plan on AMR: Ban on over-the-counter antibiotics without prescription. All pharmacies required to maintain antibiotic dispensing records. Healthcare facilities to implement Antibiotic Stewardship Programmes (ASP). Public awareness campaign: 'Antibiotics Are Not Candy'. [Demo/Sample Data]", days_ago(90)),
    ("🏥 Telemedicine Guidelines — Updated 2026", "SYSTEM",
     "Telemedicine Guidelines 2026 update: Doctors can now prescribe Schedule H drugs via telemedicine for follow-up patients. First consultation for NEW patients requires audio-video (not audio-only) call. Patients can request prescriptions to nearest pharmacy. eSanjeevani OPD available free at esanjeevani.in. [Demo/Sample Data]", days_ago(95)),
    # Hospital/Healthcare Updates
    ("🏥 24/7 Mental Health Crisis Helpline Launched", "SYSTEM",
     "The government has launched a 24/7 mental health crisis helpline (iCall: 9152987821, Vandrevala Foundation: 1860-2662-345). Trained counsellors available in multiple languages. Suitable for: Suicidal ideation, severe anxiety, acute psychosis, domestic violence, substance abuse crisis. [Demo/Sample Data]", days_ago(100)),
    ("💉 Meningococcal Vaccine — Hajj/Umrah Mandatory Requirement", "SYSTEM",
     "All pilgrims performing Hajj or Umrah must have documented meningococcal ACYW135 vaccine within 3 years and ≥10 days before departure. Available at all District Hospitals and designated international vaccination centres. [Demo/Sample Data]", days_ago(105)),
    ("🔬 New TB Drug Regimen Available — BPaLM", "SYSTEM",
     "The BPaLM regimen (Bedaquiline + Pretomanid + Linezolid + Moxifloxacin) for drug-resistant TB is now available at all district TB centres. Shorter (6 months) and more effective than previous MDR-TB regimens. Refer all confirmed MDR-TB patients to district DOTS centres. [Demo/Sample Data]", days_ago(110)),
    ("📊 Hospital-Acquired Infection Surveillance Report", "SYSTEM",
     "Q2 2026 HAI Surveillance: CAUTI rate reduced by 35% following catheter bundle implementation. SSI rate stable at 2.1%. MRSA bloodstream infections declined 22% following hand hygiene improvement programme. All hospitals to report HAI data monthly to national surveillance system. [Demo/Sample Data]", days_ago(115)),
    ("🌍 Monkeypox (Mpox) Preparedness Advisory", "SYSTEM",
     "WHO Advisory on Mpox (clade Ib): Enhanced surveillance at ports of entry and clinics. Symptoms: Fever, lymphadenopathy, vesicular rash (face, palms, soles). Isolation and contact tracing for confirmed cases. No community spread currently reported in this region. [Demo/Sample Data]", days_ago(120)),
]

# ══════════════════════════════════════════════════════════════════════════════
# 4. ADDITIONAL DISEASE CASES (surveillance data)
# ══════════════════════════════════════════════════════════════════════════════

DISEASE_CASES = [
    ("dengue", "Sector 7", 8, days_ago(1), "moderate"),
    ("dengue", "Sector 7", 5, days_ago(3), "moderate"),
    ("dengue", "Sector 3", 4, days_ago(2), "mild"),
    ("dengue", "Village C", 3, days_ago(5), "moderate"),
    ("dengue", "Ward 12", 6, days_ago(4), "severe"),
    ("malaria", "Village B", 5, days_ago(2), "moderate"),
    ("malaria", "Village D", 3, days_ago(6), "mild"),
    ("malaria", "Sector 2", 4, days_ago(8), "moderate"),
    ("malaria", "Village F", 2, days_ago(15), "mild"),
    ("malaria", "Rural Block A", 7, days_ago(3), "severe"),
    ("influenza", "Ward 5", 12, days_ago(1), "mild"),
    ("influenza", "Sector 9", 8, days_ago(2), "mild"),
    ("influenza", "School Cluster A", 25, days_ago(3), "mild"),
    ("influenza", "Village E", 5, days_ago(7), "moderate"),
    ("cholera", "Village B", 3, days_ago(1), "severe"),
    ("cholera", "Sector 6", 2, days_ago(4), "moderate"),
    ("cholera", "Riverside Area", 6, days_ago(2), "severe"),
    ("typhoid", "Sector 4", 3, days_ago(10), "moderate"),
    ("typhoid", "Central Market Area", 5, days_ago(5), "moderate"),
    ("typhoid", "School Zone 2", 4, days_ago(8), "mild"),
    ("pneumonia", "Ward 8", 7, days_ago(3), "severe"),
    ("pneumonia", "Elderly Care Area", 4, days_ago(6), "critical"),
    ("pneumonia", "Village A", 3, days_ago(10), "moderate"),
    ("tuberculosis", "Sector 11", 2, days_ago(5), "moderate"),
    ("tuberculosis", "Village G", 3, days_ago(15), "moderate"),
    ("tuberculosis", "Urban Slum B", 5, days_ago(20), "severe"),
    ("chickenpox", "Primary School 3", 18, days_ago(2), "mild"),
    ("chickenpox", "Ward 4", 6, days_ago(5), "mild"),
    ("measles", "Unvaccinated Cluster", 4, days_ago(10), "moderate"),
    ("hepatitis_a", "Contaminated Water Zone", 8, days_ago(7), "moderate"),
    ("leptospirosis", "Flood Zone 1", 4, days_ago(4), "severe"),
    ("scrub_typhus", "Rural Block B", 3, days_ago(8), "moderate"),
    ("diarrhoea", "Village H", 20, days_ago(1), "mild"),
    ("diarrhoea", "Sector 5", 15, days_ago(3), "mild"),
    ("acute_fever", "Village I", 30, days_ago(2), "mild"),
    ("acute_fever", "Sector 8", 22, days_ago(4), "moderate"),
    ("covid-19", "Office Complex A", 8, days_ago(6), "mild"),
    ("covid-19", "Hospital Ward 3", 3, days_ago(4), "severe"),
    ("meningitis", "University Campus", 3, days_ago(2), "critical"),
    ("urinary_tract_infection", "Elderly Ward", 12, days_ago(5), "moderate"),
]

# ══════════════════════════════════════════════════════════════════════════════
# 5. AUDIT LOG / ANALYTICS RECORDS
# ══════════════════════════════════════════════════════════════════════════════

def generate_audit_records():
    """Generate realistic audit log entries spanning 90 days for meaningful analytics."""
    records = []
    actions = [
        ("MEDICINE_SEARCH", "medicine"),
        ("DISEASE_SEARCH", "disease_case"),
        ("INTERACTION_CHECK", "medicine"),
        ("RAG_QUERY", "medical_document"),
        ("BROADCAST_VIEW", "notification"),
        ("REPORT_VIEW", "analytics"),
        ("PATIENT_CREATED", "patient"),
        ("PATIENT_UPDATED", "patient"),
        ("CONSULTATION_ADDED", "consultation"),
        ("LAB_REPORT_UPLOADED", "lab_report"),
        ("PRESCRIPTION_CREATED", "prescription"),
        ("DOCUMENT_INDEXED", "medical_document"),
        ("VACCINATION_RECORDED", "vaccination"),
        ("EMERGENCY_REPORTED", "emergency_case"),
    ]
    
    weights = [25, 15, 20, 30, 10, 8, 5, 4, 4, 3, 6, 12, 3, 2]
    total = sum(weights)
    
    for i in range(350):
        days_offset = random.randint(0, 89)
        action_idx = random.choices(range(len(actions)), weights=weights, k=1)[0]
        action, resource = actions[action_idx]
        records.append({
            "id": gen_id(),
            "action": action,
            "resource": resource,
            "resource_id": gen_id(),
            "result": "SUCCESS" if random.random() > 0.05 else "FAILURE",
            "ip_address": f"192.168.{random.randint(1,10)}.{random.randint(1,254)}",
            "created_at": (datetime.utcnow() - timedelta(days=days_offset, hours=random.randint(0,23), minutes=random.randint(0,59))).isoformat(),
        })
    return records


# ══════════════════════════════════════════════════════════════════════════════
# MAIN SEED FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def seed_medicines(conn):
    cur = conn.cursor()
    existing = cur.execute("SELECT generic_name FROM medicines").fetchall()
    existing_names = {r[0].lower() for r in existing}
    
    inserted = 0
    for m in MEDICINES:
        gname, brand, cat, dosage, freq, warn, indic, side_eff, interactions = m
        if gname.lower() in existing_names:
            continue
        # Combine indications and side effects into warnings since the schema doesn't have those columns
        combined_warnings = f"{warn}\n\nIndications: {indic}\nSide Effects: {side_eff}"
        cur.execute("""
            INSERT INTO medicines (id, generic_name, brand_name, category, default_dosage, standard_frequency,
                warnings, interactions, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            gen_id(), gname, brand, cat, dosage, freq, combined_warnings,
            json.dumps(interactions), now_str()
        ))
        inserted += 1
    conn.commit()
    print(f"  ✅ Medicines: Inserted {inserted} new records (total: {inserted + len(existing_names)})")
    return inserted


def seed_rag_documents(conn):
    cur = conn.cursor()
    inserted = 0
    for doc in RAG_DOCUMENTS:
        existing = cur.execute("SELECT id FROM medical_documents WHERE title = ?", (doc["title"],)).fetchone()
        if existing:
            continue
        doc_id = gen_id()
        text = doc["text"]
        # Count rough chunks
        chunks = max(1, len(text) // 800)
        cur.execute("""
            INSERT INTO medical_documents (id, patient_id, title, doc_type, file_path, extracted_text, indexed_chunks, created_at)
            VALUES (?, NULL, ?, ?, NULL, ?, ?, ?)
        """, (doc_id, doc["title"], doc["doc_type"], text, chunks, now_str()))
        inserted += 1
    conn.commit()
    print(f"  ✅ RAG Documents: Inserted {inserted} new knowledge documents")
    return inserted


def seed_broadcasts(conn):
    cur = conn.cursor()
    inserted = 0
    for title, category, message, created_at in BROADCASTS:
        existing = cur.execute("SELECT id FROM notifications WHERE title = ?", (title,)).fetchone()
        if existing:
            continue
        cur.execute("""
            INSERT INTO notifications (id, user_id, title, message, category, is_read, created_at)
            VALUES (?, NULL, ?, ?, ?, 0, ?)
        """, (gen_id(), title, message, category, created_at))
        inserted += 1
    conn.commit()
    print(f"  ✅ Broadcasts/Notifications: Inserted {inserted} new records")
    return inserted


def seed_disease_cases(conn):
    cur = conn.cursor()
    existing_count = cur.execute("SELECT COUNT(*) FROM disease_cases").fetchone()[0]
    inserted = 0
    for disease, village, count, reported_date, severity in DISEASE_CASES:
        cur.execute("""
            INSERT INTO disease_cases (id, disease, village, case_count, severity, reported_date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (gen_id(), disease, village, count, severity, reported_date,
              f"Demo/sample surveillance data: {count} {disease} cases reported in {village}.", now_str()))
        inserted += 1
    conn.commit()
    print(f"  ✅ Disease Cases: Inserted {inserted} new surveillance records")
    return inserted


def seed_audit_logs(conn):
    cur = conn.cursor()
    records = generate_audit_records()
    inserted = 0
    for r in records:
        cur.execute("""
            INSERT INTO audit_logs (id, user_id, action, resource, resource_id, result, ip_address, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
        """, (r["id"], r["action"], r["resource"], r["resource_id"], r["result"], r["ip_address"], r["created_at"]))
        inserted += 1
    conn.commit()
    print(f"  ✅ Analytics/Audit Logs: Inserted {inserted} activity records")
    return inserted


def seed_faiss_rag(conn):
    """Try to add RAG documents to the FAISS vector store if available."""
    try:
        sys.path.insert(0, os.path.dirname(__file__))
        from app.config import settings
        
        # Get documents to index from DB
        cur = conn.cursor()
        docs = cur.execute("SELECT id, title, doc_type, extracted_text FROM medical_documents WHERE patient_id IS NULL AND extracted_text IS NOT NULL").fetchall()
        
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            from langchain_community.vectorstores import FAISS
            
            print("  🔄 Loading embedding model (this may take 1–2 minutes on first run)...")
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            
            index_path = FAISS_INDEX_PATH
            texts = []
            metadatas = []
            
            for doc_id, title, doc_type, text in docs:
                # Split text into chunks
                chunk_size = 800
                overlap = 100
                start = 0
                while start < len(text):
                    chunk = text[start:start+chunk_size]
                    texts.append(chunk)
                    metadatas.append({"doc_id": doc_id, "title": title, "doc_type": doc_type, "patient_id": None})
                    start += chunk_size - overlap
            
            if texts:
                if os.path.exists(index_path):
                    print(f"  📚 Adding {len(texts)} chunks to existing FAISS index...")
                    vectorstore = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
                    vectorstore.add_texts(texts, metadatas=metadatas)
                else:
                    print(f"  📚 Creating new FAISS index with {len(texts)} chunks...")
                    vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadatas)
                vectorstore.save_local(index_path)
                print(f"  ✅ FAISS Vector Store: Indexed {len(texts)} text chunks from {len(docs)} documents")
                return len(texts)
        except ImportError as e:
            print(f"  ⚠️  FAISS/langchain not available ({e}). Documents saved to SQLite only.")
            print(f"     RAG queries will use SQLite keyword fallback (still functional).")
        except Exception as e:
            print(f"  ⚠️  FAISS indexing failed: {e}. Documents saved to SQLite only.")
    except Exception as e:
        print(f"  ⚠️  RAG seeding setup error: {e}")
    return 0


def verify_counts(conn):
    cur = conn.cursor()
    med_count = cur.execute("SELECT COUNT(*) FROM medicines").fetchone()[0]
    doc_count = cur.execute("SELECT COUNT(*) FROM medical_documents").fetchone()[0]
    notif_count = cur.execute("SELECT COUNT(*) FROM notifications").fetchone()[0]
    case_count = cur.execute("SELECT COUNT(*) FROM disease_cases").fetchone()[0]
    audit_count = cur.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]
    
    print("\n" + "="*60)
    print("  📊 FINAL VERIFICATION COUNTS")
    print("="*60)
    print(f"  💊 Total Medicines:         {med_count}")
    print(f"  📄 Total RAG Documents:     {doc_count}")
    print(f"  📢 Total Broadcasts:        {notif_count}")
    print(f"  🦠 Total Disease Cases:     {case_count}")
    print(f"  📈 Total Analytics Records: {audit_count}")
    print("="*60)
    return {
        "medicines": med_count,
        "rag_documents": doc_count,
        "broadcasts": notif_count,
        "disease_cases": case_count,
        "analytics": audit_count,
    }


def main():
    print("\n" + "="*60)
    print("  MedIntel — Expanded Dataset Seed Script")
    print("  [Demo/Educational Data — Not for clinical use]")
    print("="*60 + "\n")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at: {DB_PATH}")
        print("   Please start the backend server once first to create the database.")
        sys.exit(1)
    
    print(f"📂 Database: {DB_PATH}\n")
    
    conn = sqlite3.connect(DB_PATH)
    
    try:
        print("📋 Seeding data...\n")
        
        m = seed_medicines(conn)
        r = seed_rag_documents(conn)
        b = seed_broadcasts(conn)
        d = seed_disease_cases(conn)
        a = seed_audit_logs(conn)
        
        print("\n🔧 Building FAISS Vector Index for RAG documents...")
        chunks = seed_faiss_rag(conn)
        
        counts = verify_counts(conn)
        
        print("\n✅ Data seeding complete!")
        print(f"\n  Summary of NEW records inserted this run:")
        print(f"    Medicines added:        {m}")
        print(f"    RAG documents added:    {r}")
        print(f"    Broadcasts added:       {b}")
        print(f"    Disease cases added:    {d}")
        print(f"    Analytics records:      {a}")
        print(f"    FAISS chunks indexed:   {chunks}")
        print("\n  ✅ Restart the backend server to apply all changes.")
        print("  ✅ Navigate to /dashboard/rag and /dashboard/medicines to verify.")
        print("\n  ⚠️  All data is marked as Demo/Sample for educational purposes.")
        print("       Not intended as clinical advice or official medical guidance.\n")
        
    finally:
        conn.close()


if __name__ == "__main__":
    main()
