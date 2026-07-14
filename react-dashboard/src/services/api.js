const BASE_URL = '/api/v1';

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
  assistant: {
    chat: async (message, language = 'en') => 
      fetchAPI('/assistant/chat', { method: 'POST', body: JSON.stringify({ message, language }) })
  },
  rag: {
    query: async (query) => 
      fetchAPI('/rag/query', { method: 'POST', body: JSON.stringify({ query }) })
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
    calculateClaim: async (billData, policyData) => {
      // Simulate Backend LLM + OCR parsing delay
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: "success",
            totalBilled: 5000,
            coveredAmount: 4000,
            outOfPocket: 1000,
            deductibleApplied: 200,
            coPayApplied: 0,
            notes: "Policy covers 80% after a $200 deductible is met. Dental procedures are excluded."
          });
        }, 2500);
      });
    }
  }
};
