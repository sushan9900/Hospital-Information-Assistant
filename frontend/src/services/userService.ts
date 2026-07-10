// ==============================================================================
// Hospital Information Assistance — User Profile Management Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Handles all HTTP queries related to user profile modifications, password
//   updates, and administrator-specific user directory management.
//
// OPERATIONS:
//   - updateProfile()  → Updates the logged-in user's own name/email
//   - changePassword() → Updates the logged-in user's password
//   - listAllUsers()   → Admin-only paginated list of users
//   - getUserById()    → Admin-only detail view of a user
//   - deactivateUser() → Admin-only soft-delete
//   - reactivateUser() → Admin-only reactivate
// ==============================================================================

import api from '@/utils/api';
import { User, UserRole } from '@/types';

export interface UserListResponse {
  total: number;
  users: User[];
}

export const userService = {
  // ----------------------------------------------------------------------------
  // UPDATE PROFILE (PATIENT / ADMIN)
  // WHY: Updates display name or email. If successful, updates localStorage.
  // ----------------------------------------------------------------------------
  async updateProfile(fullName?: string, email?: string): Promise<User> {
    const response = await api.put<User>('/users/me', {
      full_name: fullName,
      email,
    });
    
    // Sync the updated user profile with localStorage
    localStorage.setItem('user', JSON.stringify(response.data));
    
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // CHANGE PASSWORD (PATIENT / ADMIN)
  // WHY: Changes password. Requires verification of the current password.
  // ----------------------------------------------------------------------------
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ): Promise<{ message: string }> {
    const response = await api.put<{ message: string }>('/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_new_password: confirmNewPassword,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // LIST USERS (ADMIN ONLY)
  // WHY: Allows administrators to search, filter, and paginate through users.
  // ----------------------------------------------------------------------------
  async listAllUsers(
    skip = 0,
    limit = 10,
    role?: UserRole
  ): Promise<UserListResponse> {
    const params: Record<string, any> = { skip, limit };
    if (role) {
      params.role = role;
    }
    
    const response = await api.get<UserListResponse>('/users/', { params });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET USER PROFILE (ADMIN ONLY)
  // WHY: Allows administrators to fetch detail views of a specific user.
  // ----------------------------------------------------------------------------
  async getUserById(userId: number): Promise<User> {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // DEACTIVATE USER (ADMIN ONLY — SOFT DELETE)
  // WHY: Deactivates an active user account.
  // ----------------------------------------------------------------------------
  async deactivateUser(userId: number): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>(`/users/${userId}/deactivate`);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // REACTIVATE USER (ADMIN ONLY)
  // WHY: Re-enables a deactivated user account.
  // ----------------------------------------------------------------------------
  async reactivateUser(userId: number): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>(`/users/${userId}/reactivate`);
    return response.data;
  }
};
