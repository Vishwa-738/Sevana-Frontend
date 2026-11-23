// src/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://yarn-skied-frequent.ngrok-free.dev';

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
    let errorMessage = `API call failed: ${response.statusText}`;
    try {
      // First try to parse as JSON
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.title) errorMessage = errorData.title; // Catch .NET ProblemDetails
    } catch (e) {
      // If it's not JSON, try to grab the raw text
      try {
        const textError = await response.text();
        if (textError) errorMessage = textError;
      } catch (e2) {}
    }
    throw new Error(errorMessage);
  }
if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

// --- Campaign API Endpoints ---
export const createCampaign = async (campaignData: any) => {
  return apiClient('/api/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignData),
  });
};

export const updateCampaign = async (id: string, campaignData: any) => {
  return apiClient(`/api/v1/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(campaignData),
  });
};

export const deleteCampaign = async (id: string) => {
  return apiClient(`/api/v1/campaigns/${id}`, {
    method: 'DELETE',
  });
};

// --- Notification API Endpoints ---
export const markNotificationAsRead = async (id: string) => {
  return apiClient(`/api/v1/notifications/${id}/read`, {
    method: 'PUT', 
  });
};

export const getNotifications = async () => {
  return apiClient('/api/v1/notifications');
};

// --- Communication & Messaging API Endpoints ---

// Volunteer Side: Get citizens assigned to a specific volunteer
export const getActiveCitizensForVolunteer = async (volunteerId: string) => {
  return apiClient(`/api/v1/volunteers/${volunteerId}/active-citizens`);
};

// Citizen Side: Get the volunteer assigned to a specific request
export const getAssignedVolunteerForRequest = async (requestId: string) => {
  return apiClient(`/api/v1/citizen/requests/${requestId}/volunteer`);
};

// Get chat history (you can pass query params like ?citizenId=... or ?volunteerId=... depending on backend setup)
export const getMessages = async (queryParams = '') => {
  return apiClient(`/api/v1/messages${queryParams}`);
};

// Send a new message
export const sendMessage = async (messageData: { receiverId: string; content: string; requestId?: string }) => {
  return apiClient('/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify(messageData),
  });
};
export const getMyRequests = async () => {
  return apiClient('/api/v1/citizen/requests'); // Adjust endpoint path if your backend uses something like /requests/me
};