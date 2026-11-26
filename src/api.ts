// src/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://yarn-skied-frequent.ngrok-free.dev';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

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
    throw new ApiError(errorMessage, response.status);
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

export type ResourceDispatchDestinationType = 'Shelter' | 'CitizenRequest';
export type ResourceDispatchStatus = 'Dispatched' | 'InTransit' | 'Delivered';

export interface CreateResourceDispatchRequest {
  resourceId: string;
  quantity: number;
  destinationType: ResourceDispatchDestinationType;
  destinationId: string;
  volunteerId?: string;
  campaignId?: string;
}

export interface ResourceDispatchResponse {
  id?: string;
  dispatchId?: string;
  resourceId?: string;
  resourceName?: string;
  itemName?: string;
  unit?: string;
  quantity?: number;
  destinationType?: ResourceDispatchDestinationType;
  destinationId?: string;
  destinationName?: string;
  destination?: string;
  shelterName?: string;
  requestName?: string;
  citizenName?: string;
  volunteerId?: string | null;
  volunteerUserId?: string | null;
  volunteerName?: string | null;
  campaignId?: string | null;
  status?: ResourceDispatchStatus;
  resource?: { itemName?: string; name?: string; unit?: string };
  volunteer?: { id?: string; userId?: string; fullName?: string; name?: string };
  createdAtUtc?: string;
  dispatchedAtUtc?: string;
  updatedAtUtc?: string;
}

export type ResourceDispatchListResponse =
  | ResourceDispatchResponse[]
  | { data?: ResourceDispatchResponse[]; items?: ResourceDispatchResponse[] }
  | null;

export const createResourceDispatch = async (
  dispatch: CreateResourceDispatchRequest
): Promise<ResourceDispatchResponse | null> => {
  return await apiClient('/api/v1/resources/dispatches', {
    method: 'POST',
    body: JSON.stringify(dispatch),
  }) as ResourceDispatchResponse | null;
};

export const getResourceDispatches = async (): Promise<ResourceDispatchListResponse> => {
  return await apiClient('/api/v1/resources/dispatches', { method: 'GET' }) as ResourceDispatchListResponse;
};

export const updateResourceDispatchStatus = async (
  dispatchId: string,
  status: ResourceDispatchStatus
): Promise<ResourceDispatchResponse | null> => {
  return await apiClient(`/api/v1/resources/dispatches/${encodeURIComponent(dispatchId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }) as ResourceDispatchResponse | null;
};