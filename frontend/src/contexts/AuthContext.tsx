// ==============================================================================
// Hospital Information Assistance — Authentication Context
// ==============================================================================
// WHY THIS FILE EXISTS:
//   React Context provides global state management.
//   The AuthContext maintains the authentication state of the user (whether they
//   are logged in, who they are, their role, and the active token) and shares it
//   with all components in the application.
//
// HOW STATE PERSISTENCE WORKS:
//   1. When the app loads, `useEffect` checks if a token exists in `localStorage`.
//   2. If a token exists, it calls the `/auth/me` endpoint to verify it.
//   3. If valid, the user's profile is loaded into the state, and the app mounts.
//   4. If invalid (expired), the session is cleared, and they are redirected to login.
//   5. On login, credentials are saved to `localStorage` and this context state.
// ==============================================================================

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { authService } from '@/services/authService';

// Define the shape of our AuthContext state
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

// Create the Context with an undefined default (enforces using provider check)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Derived state for convenience
  const isAuthenticated = !!token && !!user;

  // ----------------------------------------------------------------------------
  // INITIAL LOAD VERIFICATION
  // WHY: Verifies if a stored token is still valid when a user opens the app.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = authService.getToken();
      const storedUser = authService.getUser();

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(storedUser);
        }
        
        try {
          // Verify token against backend `/auth/me` endpoint
          const freshUserProfile = await authService.getMe();
          setUser(freshUserProfile);
          localStorage.setItem('user', JSON.stringify(freshUserProfile));
        } catch (error) {
          // If token verification fails (expired or invalid), log out immediately
          console.warn('Persisted session verification failed. Logging out...', error);
          handleLogout();
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // ----------------------------------------------------------------------------
  // LOGIN ACTION
  // WHY: Calls authService login, updates local state.
  // ----------------------------------------------------------------------------
  const handleLogin = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      setToken(data.access_token);
      setUser(data.user);
    } catch (error) {
      handleLogout();
      throw error; // Re-throw so components can display login error messages
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // REGISTER ACTION
  // WHY: Delegates registration to authService.
  // ----------------------------------------------------------------------------
  const handleRegister = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<void> => {
    setIsLoading(true);
    try {
      // By default, registration sets role: "patient"
      await authService.register(fullName, email, password, confirmPassword, UserRole.PATIENT);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // LOGOUT ACTION
  // WHY: Wipes tokens, clears context, resets loading.
  // ----------------------------------------------------------------------------
  const handleLogout = (): void => {
    authService.logout();
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  // ----------------------------------------------------------------------------
  // PROFILE STATE SYNC
  // WHY: When a user edits their name or email, this updates the context state
  //      so all pages (like navigation headers) instantly show the new data.
  // ----------------------------------------------------------------------------
  const handleUpdateUser = (updatedUser: User): void => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        updateUser: handleUpdateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
