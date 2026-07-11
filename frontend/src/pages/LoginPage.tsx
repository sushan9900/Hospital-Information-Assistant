// ==============================================================================
// Hospital Information Assistance — Login Page Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the login interface. Users enter email and password.
//   On success, redirects them to their dashboard page.
//
// DESIGN & FEATURES (CONCIERGE CLINIC):
//   - Serif editorial greeting header (Playfair Display)
//   - Muted sage green borders for inputs, forest green focus outlines
//   - Warm terracotta accents for errors, alerts, and create links
//   - Clean uppercase humanist labels (Inter)
//   - Trust badge indicating secure gateway
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Check if redirect was due to expired token session or registration success
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setInfoMsg('Your session has expired. Please log in again to continue.');
    } else if (searchParams.get('registered') === 'true') {
      setInfoMsg('Account created successfully. Please log in.');
    }
  }, [searchParams]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg(null);

    // Simple validation checks
    if (!email || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      // Success redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response) {
        const apiError = err.response.data?.detail || '';

        // Map backend error messages to clear, user-friendly copy.
        // We intentionally use one generic message for both "user not found"
        // and "wrong password" so we don't reveal which part was incorrect -
        // this is a standard security practice that avoids helping an
        // attacker enumerate valid account emails.
        if (
          apiError === 'User does not exist.' ||
          apiError === 'Incorrect password.'
        ) {
          setError('The email or password you entered is incorrect. Please try again.');
        } else if (err.response.status === 401) {
          setError('The email or password you entered is incorrect. Please try again.');
        } else if (err.response.status >= 500) {
          setError('Something went wrong on our end. Please try again in a moment.');
        } else {
          setError(apiError || 'Unable to sign in. Please try again.');
        }
      } else {
        // Backend not reachable / network error
        setError('Unable to reach the server. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER LOGO DESCRIPTION */}
      <div className="space-y-2 text-left">
        <h2 className="font-serif text-3xl text-clinic-forest-500 dark:text-slate-100 tracking-tight leading-tight">
          Welcome back
        </h2>
        <p className="text-[10px] font-sans font-bold text-clinic-sage-500 uppercase tracking-widest leading-relaxed">
          Sign in to access your portal, check bookings, or chat with AI.
        </p>
      </div>

      {infoMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-sage-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 text-clinic-forest-500 dark:text-slate-300 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle size={16} className="text-clinic-sage-500 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{infoMsg}</span>
        </div>
      )}

      {/* LOGIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Email Field */}
        <div className="space-y-1">
          <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="name@email.com"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-sm text-clinic-text dark:text-slate-200 placeholder-clinic-sage-500/40 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-200 placeholder-clinic-sage-500/40 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
              required
            />
            {/* Toggle Eye Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 rounded-lg text-clinic-sage-550 hover:text-clinic-forest-500 dark:hover:text-slate-300 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* ERROR MESSAGE — matches clinic's terracotta accent theme */}
        {error && (
          <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-terracotta-200 dark:border-clinic-terracotta-900/50 bg-clinic-terracotta-50 dark:bg-clinic-terracotta-950/20 text-clinic-terracotta-600 dark:text-clinic-terracotta-400 text-xs font-semibold animate-in fade-in duration-200">
            <AlertCircle size={16} className="text-clinic-terracotta-500 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-clinic-forest-500 hover:bg-clinic-forest-600 active:bg-clinic-forest-700 text-white font-sans font-bold py-3.5 px-4 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-all duration-200 disabled:opacity-50 mt-6"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          <span>Sign In</span>
        </button>

      </form>

      {/* TRUST BADGE & HIPAA INDICATOR */}
      <div className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-clinic-sage-50 dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-wider">
        <ShieldCheck size={14} className="text-clinic-forest-500" />
        <span>Secure HIPAA-Compliant Gateway</span>
      </div>

      {/* REDIRECT TO REGISTER */}
      <div className="text-center pt-2">
        <p className="text-xs font-semibold text-clinic-text/70 dark:text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-clinic-terracotta-500 hover:text-clinic-terracotta-600 font-bold hover:underline transition-all"
          >
            Create account
          </Link>
        </p>
      </div>

      {/* ADDITIONAL SPACING HELPER */}
      <div className="h-2" />

    </div>
  );
};
export default LoginPage;

