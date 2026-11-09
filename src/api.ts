// src/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  // 1. Retrieve the token from localStorage
  const token = localStorage.getItem('sevana_jwt');

  // 2. Build the headers as a strict string record
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string>),
  };

  // 3. Attach the token if it exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    // Attempt to extract the error message from the backend JSON response
    let errorMessage = `API call failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch (e) {
      // Fallback if the error isn't JSON
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
};