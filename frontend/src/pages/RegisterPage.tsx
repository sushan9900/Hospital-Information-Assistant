// ==============================================================================
// Hospital Information Assistance — Registration Page Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the registration page. Patients enter full name, email, password,
//   and password confirmation.
//   On success, redirects them to the login page with a success query parameter.
//
// DESIGN & FEATURES:
//   - Name, Email, Password, and Confirm Password fields
//   - Client-side validation: checks password length and matching fields
//   - Dynamic spinner on the submit button
//   - Catch and display server-side duplicate email conflict messages (409)
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validate password length
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    // 2. Validate password match
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsLoading(true);
    try {
      // Call Context registration function
      await register(fullName, email, password, confirmPassword);
      // Redirect to login page upon success
      navigate('/login?registered=true');
    } catch (error: any) {
      // Extract clean error message from Axios response
      const apiError = error.response?.data?.detail || 'Registration failed. Please check your credentials and try again.';
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
          Create account
        </h2>
        <p className="text-sm font-semibold text-slate-400">
          Get started with your medical scheduling and AI chat portal.
        </p>
      </div>

      {/* ERROR ALERT BOX */}
      {errorMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* REGISTER FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name Field */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Full Name
          </label>
          <div className="relative flex items-center">
            <UserIcon size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
              required
            />
          </div>
        </div>

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
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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

        {/* Confirm Password Field */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-100 hover:shadow-lg transition-all duration-200 disabled:opacity-50 mt-6"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          <span>Create Account</span>
        </button>

      </form>

      {/* REDIRECT TO LOGIN */}
      <div className="text-center pt-2">
        <p className="text-sm font-semibold text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-500 hover:text-emerald-600 font-bold hover:underline transition-all"
          >
            Sign in
          </Link>
        </p>
      </div>

    </div>
  );
};
export default RegisterPage;
