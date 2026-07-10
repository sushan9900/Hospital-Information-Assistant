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
// SECURITY / AUTO-REDIRECT:
//   If a user is ALREADY authenticated and tries to visit `/login` or `/register`,
//   this layout automatically catches them and redirects them to the `/dashboard`.
// ==============================================================================

import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Activity, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show a full-screen loading spinner while the auth state is being verified
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Verifying session credentials..." />;
  }

  // If authenticated, render nothing while redirecting
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-white">
      
      {/* LEFT COLUMN: AUTHENTICATION FORM VIEWPORT */}
      <div className="flex flex-col flex-1 justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Outlet />
        </div>
      </div>

      {/* RIGHT COLUMN: WELCOME BRANDING PANEL (DESKTOP ONLY) */}
      <div className="hidden lg:relative lg:flex lg:flex-1 bg-slate-950 items-center justify-center overflow-hidden">
        
        {/* Decorative Background Glows */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 max-w-md px-8 text-center space-y-8">
          {/* Logo Branding */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
              <Activity size={32} />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Hospital Information Assistant
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your comprehensive portal for doctor matching, online scheduling, and instant AI-assisted medical answers.
            </p>
          </div>

          {/* Core Feature bullet points */}
          <div className="text-left space-y-4 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-start space-x-3">
              <Sparkles className="text-emerald-400 mt-1 flex-shrink-0" size={18} />
              <div>
                <h4 className="text-sm font-bold text-white">Interactive AI Chat</h4>
                <p className="text-xs text-slate-400 mt-0.5">Context-aware conversational assistance that remembers your queries.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <ShieldCheck className="text-emerald-400 mt-1 flex-shrink-0" size={18} />
              <div>
                <h4 className="text-sm font-bold text-white">Grounded Q&A (RAG)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Accurate replies based directly on validated hospital records.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Heart className="text-emerald-400 mt-1 flex-shrink-0" size={18} />
              <div>
                <h4 className="text-sm font-bold text-white">Smooth Scheduling</h4>
                <p className="text-xs text-slate-400 mt-0.5">Quickly book and manage appointments with preferred doctors.</p>
              </div>
            </div>
          </div>

          {/* Footer Label */}
          <div className="text-xs text-slate-600 font-medium">
            Protected by secure JWT authorization & encryption
          </div>

        </div>
      </div>

    </div>
  );
};
export default AuthLayout;
