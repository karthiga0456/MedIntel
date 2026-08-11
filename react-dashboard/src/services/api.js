const BASE_URL = '/api/v1';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('medintel_token');
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch API Error:', error);
    throw error;
  }
}

export const api = {
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
        body: formData
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      return await response.json();
    },
    register: async (email, password) => 
      fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getMe: async () => fetchAPI('/auth/me')
  },
  assistant: {
    chat: async (message, language = 'en', userId = null) =>
      fetchAPI('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message, language, user_id: userId }),
      }),
    getHistory: async (userId) =>
      fetchAPI(`/assistant/history/${userId}`),
    clearHistory: async (userId) =>
      fetchAPI(`/assistant/history/${userId}`, { method: 'DELETE' }),
  },
  rag: {
    query: async (query) => 
      fetchAPI('/rag/query', { method: 'POST', body: JSON.stringify({ query }) }),
    uploadDocument: async (file) => {
      const token = localStorage.getItem('medintel_token');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${BASE_URL}/rag/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData
      });
      if (!response.ok) {
        throw new Error('File upload failed');
      }
      return await response.json();
    }
  },
  outbreak: {
    predict: async (region, disease) => 
      fetchAPI('/outbreak/predict', { 
        method: 'POST', 
        body: JSON.stringify({ 
          region, 
          disease, 
          recent_case_counts: [10, 12, 15], 
          weather_features: { temp: 30, humidity: 80 } 
        }) 
      })
  },
  worker: {
    submitRecord: async (data) => 
      fetchAPI('/worker/records', { method: 'POST', body: JSON.stringify(data) })
  },
  insurance: {
    calculateClaim: async (billFile, policyFile) => {
      const token = localStorage.getItem('medintel_token');
      const formData = new FormData();
      formData.append('bill_file', billFile);
      formData.append('policy_file', policyFile);
      
      const response = await fetch(`${BASE_URL}/insurance/calculate`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData
      });
      if (!response.ok) {
        throw new Error('Claim calculation failed');
      }
      return await response.json();
    }
  },
  analytics: {
    getSummary: async () => fetchAPI('/analytics/summary')
  }
};
