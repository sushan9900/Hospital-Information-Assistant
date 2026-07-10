// ==============================================================================
// Hospital Information Assistance — Login Page Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the login interface. Users enter email and password.
//   On success, redirects them to their dashboard page.
//
// DESIGN & FEATURES:
//   - Email and password input elements with clean floating styles
//   - Password show/hide visibility toggle (eye icon)
//   - Dynamic loading spinner on the submit button
//   - Catches and displays API error messages (e.g., "Invalid credentials")
//   - Captures `?expired=true` URL query parameter to notify users of expired sessions
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(null);
    setInfoMsg(null);

    // Simple validation checks
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      // Success redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      // Extract clean error message from Axios response
      const apiError = error.response?.data?.detail || 'Login failed. Please check your network connection and try again.';
      setErrorMsg(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER LOGO DESCRIPTION */}
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm font-semibold text-slate-400">
          Sign in to access your portal, check bookings, or chat with AI.
        </p>
      </div>

      {/* SESSION NOTIFICATIONS (ERROR / WARNING) */}
      {errorMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-blue-100 bg-blue-50 text-blue-800 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{infoMsg}</span>
        </div>
      )}

      {/* LOGIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Email Field */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Password
            </label>
          </div>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
              required
            />
            {/* Toggle Eye Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-100 hover:shadow-lg transition-all duration-200 disabled:opacity-50 mt-6"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          <span>Sign In</span>
        </button>

      </form>

      {/* REDIRECT TO REGISTER */}
      <div className="text-center pt-2">
        <p className="text-sm font-semibold text-slate-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-emerald-500 hover:text-emerald-600 font-bold hover:underline transition-all"
          >
            Create account
          </Link>
        </p>
      </div>

    </div>
  );
};
export default LoginPage;
