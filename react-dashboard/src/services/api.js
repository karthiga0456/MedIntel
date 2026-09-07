const BASE_URL = '/api/v1';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('medintel_token');
  try {
    const isFullUrl = endpoint.startsWith('http') || endpoint.startsWith('/api/');
    const url = isFullUrl ? endpoint : `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errDetail = `${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.detail) errDetail = errJson.detail;
        if (errJson.error && errJson.error.message) errDetail = errJson.error.message;
      } catch (_) {}
      throw new Error(errDetail);
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch API Error (${endpoint}):`, error);
    throw error;
  }
}

export const api = {
  // ── Authentication & RBAC ──────────────────────────────────────────
  auth: {
    login: async (username, password) => {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      if (!response.ok) {
        let msg = 'Login failed';
        try {
          const err = await response.json();
          msg = err.detail || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      return await response.json();
    },
    register: async (email, password, role = 'worker') =>
      fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
    getMe: async () => fetchAPI('/auth/me'),
    getUsers: async (skip = 0, limit = 100) => fetchAPI(`/auth/users?skip=${skip}&limit=${limit}`),
    updateUserRole: async (userId, role) =>
      fetchAPI(`/auth/users/${userId}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  },

  // ── Patient Management ─────────────────────────────────────────────
  patients: {
    list: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchAPI(`/patients?${query}`);
    },
    get: async (id) => fetchAPI(`/patients/${id}`),
    create: async (data) => fetchAPI('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => fetchAPI(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    archive: async (id) => fetchAPI(`/patients/${id}`, { method: 'DELETE' }),
    getTimeline: async (id) => fetchAPI(`/patients/${id}/timeline`),
    addConsultation: async (id, data) => fetchAPI(`/patients/${id}/consultations`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── AI Medical Assistant ───────────────────────────────────────────
  assistant: {
    chat: async (message, language = 'en', userId = null, patientId = null, location = null) =>
      fetchAPI('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message, language, user_id: userId, patient_id: patientId, location }),
      }),
    getHistory: async (userId) => fetchAPI(`/assistant/history/${userId}`),
    clearHistory: async (userId) => fetchAPI(`/assistant/history/${userId}`, { method: 'DELETE' }),
  },

  // ── Healthcare RAG ─────────────────────────────────────────────────
  rag: {
    query: async (query, patientId = null, documentId = null) =>
      fetchAPI('/rag/query', {
        method: 'POST',
        body: JSON.stringify({ query, patient_id: patientId, document_id: documentId }),
      }),
    uploadDocument: async (file, patientId = null, docType = 'medical_report') => {
      const token = localStorage.getItem('medintel_token');
      const formData = new FormData();
      formData.append('file', file);
      if (patientId) formData.append('patient_id', patientId);
      formData.append('doc_type', docType);

      const response = await fetch(`${BASE_URL}/rag/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('File upload failed');
      }
      return await response.json();
    },
    getPatientDocuments: async (patientId) => fetchAPI(`/rag/patient/${patientId}`),
  },

  // ── Lab Analyzer ───────────────────────────────────────────────────
  labs: {
    uploadReport: async (file, patientId, testType = 'Complete Blood Count (CBC)') => {
      const token = localStorage.getItem('medintel_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', patientId);
      formData.append('test_type', testType);

      const response = await fetch(`${BASE_URL}/labs/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Lab report analysis failed');
      }
      return await response.json();
    },
    getPatientHistory: async (patientId) => fetchAPI(`/labs/patient/${patientId}`),
  },

  // ── Medicines & Prescriptions ──────────────────────────────────────
  medicines: {
    search: async (query) => fetchAPI(`/medicines/search?query=${encodeURIComponent(query)}`),
    checkSafety: async (patientId, medicineNames) =>
      fetchAPI('/medicines/check-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, medicine_names: medicineNames }),
      }),
    createPrescription: async (data) =>
      fetchAPI('/medicines/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
    getPatientPrescriptions: async (patientId) => fetchAPI(`/medicines/prescriptions/patient/${patientId}`),
    ocrPrescription: async (file) => {
      const token = localStorage.getItem('medintel_token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${BASE_URL}/medicines/prescriptions/ocr`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Prescription OCR failed');
      }
      return await response.json();
    },
  },

  // ── Outbreak Prediction Engine ─────────────────────────────────────
  outbreak: {
    predict: async (region, disease, recentCases = [10, 12, 15], weather = { temp: 30, humidity: 80, rainfall: 25 }) =>
      fetchAPI('/outbreak/predict', {
        method: 'POST',
        body: JSON.stringify({
          region,
          disease,
          recent_case_counts: recentCases,
          weather_features: weather,
        }),
      }),
  },

  // ── Disease Surveillance ───────────────────────────────────────────
  surveillance: {
    reportCase: async (data) => fetchAPI('/surveillance/cases', { method: 'POST', body: JSON.stringify(data) }),
    getSummary: async () => fetchAPI('/surveillance/summary'),
  },

  // ── GIS Health Map ─────────────────────────────────────────────────
  map: {
    getLayers: async () => fetchAPI('/map/layers'),
  },

  // ── Health Worker Portal & Visits ──────────────────────────────────
  worker: {
    submitRecord: async (data) => fetchAPI('/worker/records', { method: 'POST', body: JSON.stringify(data) }),
    getRecords: async (workerId = null) => fetchAPI(`/worker/records${workerId ? `?worker_id=${workerId}` : ''}`),
    getProfile: async () => fetchAPI('/worker/profile'),
    logVisit: async (data) => fetchAPI('/worker/visits', { method: 'POST', body: JSON.stringify(data) }),
    getVisits: async () => fetchAPI('/worker/visits'),
  },

  // ── Offline Sync API ───────────────────────────────────────────────
  sync: {
    batch: async (items, workerId = null) =>
      fetchAPI('/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ worker_id: workerId, items }),
      }),
  },

  // ── Insurance Claim Intelligence ───────────────────────────────────
  insurance: {
    calculateClaim: async (billFile, policyFile, patientId = null) => {
      const token = localStorage.getItem('medintel_token');
      const formData = new FormData();
      formData.append('bill_file', billFile);
      formData.append('policy_file', policyFile);
      if (patientId) formData.append('patient_id', patientId);

      const response = await fetch(`${BASE_URL}/insurance/calculate`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Insurance claim calculation failed');
      }
      return await response.json();
    },
    getPatientClaims: async (patientId) => fetchAPI(`/insurance/claims/patient/${patientId}`),
  },

  // ── Emergency Triage Queue ─────────────────────────────────────────
  emergency: {
    report: async (data) => fetchAPI('/emergency', { method: 'POST', body: JSON.stringify(data) }),
    getQueue: async (status = null, severity = null) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (severity) params.append('severity', severity);
      return fetchAPI(`/emergency?${params.toString()}`);
    },
    updateCase: async (caseId, data) => fetchAPI(`/emergency/${caseId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // ── Notification Center ────────────────────────────────────────────
  notifications: {
    list: async () => fetchAPI('/notifications'),
    markRead: async (notifId) => fetchAPI(`/notifications/${notifId}/read`, { method: 'POST' }),
    markAllRead: async () => fetchAPI('/notifications/read-all', { method: 'POST' }),
  },

  // ── Dashboard Reports & Analytics ──────────────────────────────────
  analytics: {
    getSummary: async () => fetchAPI('/analytics/summary'),
  },

  // ── Audit Logs ─────────────────────────────────────────────────────
  audit: {
    listLogs: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetchAPI(`/audit?${query}`);
    },
  },

  // ── System Health & Readiness ──────────────────────────────────────
  system: {
    getHealth: async () => fetchAPI('/api/health'),
    getReady: async () => fetchAPI('/api/ready'),
  },
};
