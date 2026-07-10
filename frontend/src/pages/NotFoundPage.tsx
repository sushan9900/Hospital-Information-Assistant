// ==============================================================================
// Hospital Information Assistance — 404 Not Found Page
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Displays a friendly, clear, and professional error landing page when
//   users navigate to an invalid path or typed an incorrect URL address.
//
// DESIGN & AESTHETICS (CONCIERGE CLINIC):
//   - Centered card panel structure
//   - Elegant Playfair Display serif headings
//   - Deep forest green buttons and active states
//   - Muted sage green borders and background decoration accents
// ==============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoHome = () => {
    // If logged in, go to dashboard. Otherwise, go to login.
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in duration-300">
      
      {/* 404 Visual Icon */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-24 w-24 rounded-full bg-clinic-sage-50 dark:bg-clinic-forest-500/10 animate-ping opacity-75" />
        <div className="relative h-20 w-20 rounded-xl bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 border border-clinic-sage-200/40 dark:border-slate-800 flex items-center justify-center shadow-inner">
          <HelpCircle size={40} className="animate-bounce" />
        </div>
      </div>

      {/* Heading details */}
      <div className="mt-8 space-y-2 max-w-sm">
        <h1 className="font-serif text-4xl text-clinic-forest-500 dark:text-slate-100 font-semibold tracking-tight">404 Error</h1>
        <h3 className="text-sm font-sans font-bold text-clinic-text/80 dark:text-slate-350 uppercase tracking-widest">Page Not Found</h3>
        <p className="text-xs text-clinic-text/60 dark:text-slate-500 leading-relaxed font-semibold">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
      </div>

      {/* Redirect buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full sm:w-auto">
        <button
          onClick={() => navigate(-1)} // History back
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-white dark:bg-slate-900 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 text-clinic-text/85 dark:text-slate-300 font-sans font-bold py-3 px-5 rounded-xl text-[10px] uppercase tracking-wider border border-clinic-sage-200 dark:border-slate-800 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Go Back</span>
        </button>

        <button
          onClick={handleGoHome}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white font-sans font-bold py-3 px-6 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-colors"
        >
          <Home size={13} />
          <span>{isAuthenticated ? 'Portal Dashboard' : 'Login Portal'}</span>
        </button>
      </div>

    </div>
  );
};
export default NotFoundPage;
