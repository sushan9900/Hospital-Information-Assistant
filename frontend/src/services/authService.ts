// ==============================================================================
// Hospital Information Assistance — Authentication API Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This service encapsulates all authentication HTTP requests to the backend.
//   Instead of writing Axios requests inside UI components, we organize them in
//   service modules. This follows the separation of concerns principle.
//
// WHAT THIS SERVICE HANDLES:
//   - login()    → Authenticates credentials, returns JWT token and user info
//   - register() → Creates a new account
//   - getMe()    → Retrieves the current logged-in user profile
//   - logout()   → Clears local session storage
// ==============================================================================

import api from '@/utils/api';
import { User, LoginResponse, RegisterResponse, UserRole } from '@/types';

export const authService = {
  // ----------------------------------------------------------------------------
  // USER REGISTRATION
  // WHY: Registers a new user account. Defaults to "patient" role.
  // ----------------------------------------------------------------------------
  async register(
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
    role: UserRole = UserRole.PATIENT
  ): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', {
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
      role,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // USER LOGIN
  // WHY: Verifies credentials, retrieves JWT, and saves to localStorage.
  // ----------------------------------------------------------------------------
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const { access_token, user } = response.data;

    // Save token and user details to localStorage so they persist on page refresh
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET CURRENT PROFILE
  // WHY: Fetches the profile of the current logged-in user to ensure the local
  //      profile matches the database status (e.g. checks if active).
  // ----------------------------------------------------------------------------
  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // LOCAL LOGOUT
  // WHY: Safely clear session data from browser storage when the user logs out.
  // ----------------------------------------------------------------------------
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // ----------------------------------------------------------------------------
  // HELPER: GET LOCAL STORAGE VALUES
  // ----------------------------------------------------------------------------
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },
};
