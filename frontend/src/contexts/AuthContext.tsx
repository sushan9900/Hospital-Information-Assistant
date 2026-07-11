// ==============================================================================
// Hospital Information Assistance — Authentication Context
// ==============================================================================
// WHY THIS FILE EXISTS:
//   React Context provides global state management.
//   The AuthContext maintains the authentication state of the user (whether they
//   are logged in, who they are, their role, and the active token) and shares it
//   with all components in the application.
//
// FIX NOTE (IMPORTANT):
//   `isLoading` used to be shared between (a) the initial app bootstrap check
//   ("is there a valid token already?") and (b) the login/register button
//   spinner. AuthLayout was gating its full-screen spinner AND conditionally
//   unmounting <Outlet/> based on that same `isLoading` flag. This meant every
//   login attempt caused AuthLayout to unmount LoginPage (wiping its local
//   error state) and then remount a brand new LoginPage once loading finished
//   - so any error message set right before submission finished was destroyed
//   a moment later by the remount. We now use a SEPARATE `isInitializing` flag
//   for the one-time bootstrap check, and keep `isLoading` scoped to login/
//   register button loading state only. AuthLayout should gate on
//   `isInitializing`, not `isLoading`.
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
  isInitializing: boolean;
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

  // isInitializing: true ONLY during the one-time app bootstrap token check.
  // AuthLayout should use THIS flag to decide whether to show the full-screen
  // "Verifying credentials..." spinner, NOT isLoading.
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // isLoading: scoped to login/register button-level loading state only.
  // Do NOT gate layout mounting/unmounting on this flag.
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

      // Bootstrap check is done - stop showing the full-screen verifying spinner
      setIsInitializing(false);
    };

    initializeAuth();
  }, []);

  // ----------------------------------------------------------------------------
  // LOGIN ACTION
  // WHY: Calls authService login, updates local state.
  // NOTE: Uses `isLoading` (button-scoped) only - does NOT touch
  //       `isInitializing`, so AuthLayout will NOT unmount LoginPage while
  //       a login attempt is in flight or has just failed.
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
        isInitializing,
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