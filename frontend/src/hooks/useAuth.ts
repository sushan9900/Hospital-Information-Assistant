// ==============================================================================
// Hospital Information Assistance — useAuth Custom Hook
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Instead of writing `useContext(AuthContext)` in every page or component,
//   this hook provides a clean shorthand: `const { user, login } = useAuth()`.
//
// DESIGN PATTERNS:
//   Enforces that the hook is only used inside components wrapped by the
//   `<AuthProvider>` provider. If used outside, it raises a clear error.
// ==============================================================================

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Custom hook to easily consume the global AuthContext.
 * Provides user profile states, login status, and auth actions.
 *
 * @returns AuthContextType containing auth states and triggers.
 * @throws Error if used outside of AuthProvider.
 *
 * @example
 * const { user, isAuthenticated, logout } = useAuth();
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  // If the hook is called outside an AuthProvider, context will be undefined.
  // Throwing a clear error helps catch implementation bugs early during dev.
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Wrap your root component tree in <AuthProvider>.');
  }

  return context;
};
