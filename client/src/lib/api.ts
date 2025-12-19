/**
 * API Simple Helper - Semplificato al massimo
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Unica funzione per tutte le chiamate API
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  // Aggiungi timeout di 30 secondi
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      let errorMessage;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || 'API Error';
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    const responseData = await response.json();

    return responseData;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Timeout: Il server non risponde');
    }

    throw error;
  }
}

// Helper specifici per comodità
export const api = {
  get: (endpoint: string) => apiCall(endpoint),
  post: (endpoint: string, data?: any) => apiCall(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }),
  put: (endpoint: string, data?: any) => apiCall(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  }),
  patch: (endpoint: string, data?: any) => apiCall(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined
  }),
  delete: (endpoint: string) => apiCall(endpoint, { method: 'DELETE' })
};

export default api;