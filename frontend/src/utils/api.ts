// ==============================================================================
// Hospital Information Assistance — Frontend API Utility
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This file configures Axios, our HTTP client, for communication with the
//   FastAPI backend.
//
// WHAT IT DOES:
//   1. Sets up the base URL dynamically from environment variables.
//   2. Configures default headers (Content-Type: application/json).
//   3. Adds a Request Interceptor:
//      Automatically reads the JWT token from localStorage and appends it to the
//      headers of every outgoing request: `Authorization: Bearer <token>`
//      This saves us from manually passing the token on every single API call.
//   4. Adds a Response Interceptor:
//      Handles network or API errors globally. Specifically, if the backend returns
//      a `401 Unauthorized` error (token expired or modified), it clears the token
//      and user session to force a safe re-login.
// ==============================================================================

import axios from 'axios';

// Get the backend API URL from the Vite environment config (.env)
// Fall back to localhost:8000 if not specified
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create a custom Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30-second timeout limit
});

// ------------------------------------------------------------------------------
// REQUEST INTERCEPTOR (ATTACH JWT TOKEN)
// WHY: Authenticated endpoints require the token to identify the user.
//      This interceptor runs automatically BEFORE each request is sent.
// ------------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // Read the token stored in localStorage (saved on login/register)
    const token = localStorage.getItem('token');
    
    // If a token exists, attach it to the Authorization header
    // OAuth2 standard format: Bearer <token>
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    // Handle request configuration errors
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------------------------
// RESPONSE INTERCEPTOR (GLOBAL ERROR HANDLING)
// WHY: Catch authentication errors (like expired tokens) or server offline
//      conditions globally and react appropriately.
// ------------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    // Return response directly if successful
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to an invalid/expired token (401 Unauthorized)
    // Check originalRequest._retry to avoid infinite loop if the endpoint itself is failing
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear token and profile from localStorage to log out the user safely
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Force reload or redirect to login page (excluding public routes like login/register)
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login?expired=true';
      }
    }
    
    // If the server is completely offline (Network Error)
    if (error.message === 'Network Error' && !error.response) {
      console.error('Backend API server is offline or unreachable.');
    }

    // Pass the error along to the service/component that made the call
    // This allows components to catch error and show custom error messages (e.g. "Email already taken")
    return Promise.reject(error);
  }
);

export default api;
