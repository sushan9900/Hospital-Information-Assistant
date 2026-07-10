// ==============================================================================
// Hospital Information Assistance — Registration Page Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the registration page. Patients enter full name, email, password,
//   and password confirmation.
//   On success, redirects them to the login page with a success query parameter.
//
// DESIGN & FEATURES (CONCIERGE CLINIC):
//   - Serif editorial greeting header (Playfair Display)
//   - Muted sage green borders for inputs, forest green focus outlines
//   - Warm terracotta accents for errors, alerts, and login links
//   - Clean uppercase humanist labels (Inter)
//   - Trust badge indicating secure gateway
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

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
      const apiError = error.response?.data?.detail || 'Registration failed. Please check your credentials and try again.';
      setErrorMsg(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER LOGO DESCRIPTION */}
      <div className="space-y-2 text-left">
        <h2 className="font-serif text-3xl text-clinic-forest-500 dark:text-slate-100 tracking-tight leading-tight">
          Create account
        </h2>
        <p className="text-[10px] font-sans font-bold text-clinic-sage-500 uppercase tracking-widest leading-relaxed">
          Get started with your medical scheduling and AI chat portal.
        </p>
      </div>

      {/* ERROR ALERT BOX */}
      {errorMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20 bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-600 dark:text-clinic-terracotta-400 text-xs font-semibold animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-clinic-terracotta-500 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* REGISTER FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name Field */}
        <div className="space-y-1">
          <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
            Full Name
          </label>
          <div className="relative flex items-center">
            <UserIcon size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-200 placeholder-clinic-sage-500/40 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
              required
            />
          </div>
        </div>

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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-200 placeholder-clinic-sage-500/40 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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

        {/* Confirm Password Field */}
        <div className="space-y-1">
          <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <Lock size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-200 placeholder-clinic-sage-500/40 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-clinic-forest-500 hover:bg-clinic-forest-600 active:bg-clinic-forest-700 text-white font-sans font-bold py-3.5 px-4 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-all duration-200 disabled:opacity-50 mt-6"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          <span>Create Account</span>
        </button>

      </form>

      {/* TRUST BADGE & HIPAA INDICATOR */}
      <div className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-clinic-sage-50 dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-wider">
        <ShieldCheck size={14} className="text-clinic-forest-500" />
        <span>Secure HIPAA-Compliant Gateway</span>
      </div>

      {/* REDIRECT TO LOGIN */}
      <div className="text-center pt-2">
        <p className="text-xs font-semibold text-clinic-text/70 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-clinic-terracotta-500 hover:text-clinic-terracotta-600 font-bold hover:underline transition-all"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* ADDITIONAL SPACING HELPER */}
      <div className="h-2" />

    </div>
  );
};
export default RegisterPage;
