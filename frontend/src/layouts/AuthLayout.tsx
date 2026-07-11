// ==============================================================================
// Hospital Information Assistance — Authentication Layout
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This layout wraps the authentication pages (Login and Register).
//   It implements a professional split-screen aesthetic:
//     - Left Side  : The login/register input form.
//     - Right Side : A modern welcome banner highlighting the platform's AI RAG
//                    and scheduling capabilities.
//
// FIX NOTE (IMPORTANT):
//   Previously this used `isLoading` from AuthContext to decide whether to
//   show a full-screen spinner instead of <Outlet/>. That `isLoading` flag is
//   ALSO toggled during every login/register attempt, so submitting the login
//   form caused this layout to unmount LoginPage (full-screen spinner shown)
//   and then remount a brand new LoginPage once the request finished - which
//   silently wiped out any error message LoginPage had just set. We now use
//   `isInitializing`, which is true ONLY during the one-time app bootstrap
//   token check, so LoginPage stays mounted throughout a login attempt and
//   its error state survives to be displayed.
//
// DESIGN & AESTHETICS (CONCIERGE CLINIC):
//   - Left viewport rests on global warm ivory paper background
//   - Right welcome banner in rich, deep forest green (editorial brand contrast)
//   - Playfair Display serif fonts for title headings
//   - Subtle rounded boxes with thin sage hairline dividers
// ==============================================================================

import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Activity, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  // Show a full-screen loading spinner ONLY during the one-time app bootstrap
  // token verification - NOT during login/register button submissions.
  if (isInitializing) {
    return <LoadingSpinner fullScreen message="Verifying credentials..." />;
  }

  // If authenticated, render nothing while redirecting
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-clinic-bg dark:bg-slate-950 transition-all duration-300">

      {/* LEFT COLUMN: AUTHENTICATION FORM VIEWPORT */}
      <div className="flex flex-col flex-1 justify-center px-6 py-12 sm:px-12 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Outlet />
        </div>
      </div>

      {/* RIGHT COLUMN: WELCOME BRANDING PANEL (DESKTOP ONLY) */}
      <div className="hidden lg:relative lg:flex lg:flex-1 bg-clinic-forest-500 dark:bg-slate-900 items-center justify-center overflow-hidden border-l border-clinic-sage-200/20 dark:border-slate-800">

        {/* Soft elegant glows (sage-forest tones) */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-clinic-sage-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-clinic-sage-500/5 blur-3xl" />

        <div className="relative z-10 max-w-md px-10 text-center space-y-8">

          {/* Logo Branding */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-white border border-white/15 shadow-premium">
              <Activity size={24} />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3.5">
            <h1 className="font-serif italic text-4xl text-white tracking-tight leading-tight">
              Hospital AI Assistant
            </h1>
            <p className="text-xs text-clinic-sage-100/80 leading-relaxed font-sans font-medium">
              Your secure portal for doctor profiles, online scheduling, and instant AI-assisted medical consultations.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="text-left space-y-4 bg-white/5 dark:bg-slate-950/40 border border-white/10 dark:border-slate-800 p-6 rounded-xl backdrop-blur-md">

            <div className="flex items-start space-x-3.5">
              <Sparkles className="text-clinic-sage-200 mt-0.5 flex-shrink-0" size={16} />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Interactive Chatbot</h4>
                <p className="text-[11px] text-clinic-sage-100/70 mt-0.5 font-medium leading-relaxed">Context-aware conversational assistance that remembers your inquiry threads.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <ShieldCheck className="text-clinic-sage-200 mt-0.5 flex-shrink-0" size={16} />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Grounded Answers (RAG)</h4>
                <p className="text-[11px] text-clinic-sage-100/70 mt-0.5 font-medium leading-relaxed">Accurate replies based directly on validated hospital department documents.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <Heart className="text-clinic-sage-200 mt-0.5 flex-shrink-0" size={16} />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Premium Scheduling</h4>
                <p className="text-[11px] text-clinic-sage-100/70 mt-0.5 font-medium leading-relaxed">Instantly book and manage consultations with certified physicians.</p>
              </div>
            </div>

          </div>

          {/* Footer Label */}
          <div className="text-[9px] text-clinic-sage-100/50 font-bold uppercase tracking-widest">
            Protected by secure JWT authorization & encryption
          </div>

        </div>
      </div>

    </div>
  );
};
export default AuthLayout;