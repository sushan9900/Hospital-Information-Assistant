// ==============================================================================
// Hospital Information Assistance — 404 Not Found Page
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Displays a friendly, clear, and professional error landing page when
//   users navigate to an invalid path or typed an incorrect URL address.
//
// DESIGN & AESTHETICS:
//   - Centered card panel structure
//   - Bouncing question mark icon to represent lost state
//   - Action button to redirect user back home or to their dashboard
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
        <div className="absolute h-24 w-24 rounded-full bg-slate-100 animate-ping opacity-75" />
        <div className="relative h-20 w-20 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center shadow-inner">
          <HelpCircle size={40} className="animate-bounce" />
        </div>
      </div>

      {/* Heading details */}
      <div className="mt-8 space-y-2 max-w-sm">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">404 Error</h1>
        <h3 className="text-base font-bold text-slate-700">Page Not Found</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
      </div>

      {/* Redirect buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
        <button
          onClick={() => navigate(-1)} // History back
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-5 rounded-xl text-xs border border-slate-200 shadow-sm transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Go Back</span>
        </button>

        <button
          onClick={handleGoHome}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors"
        >
          <Home size={14} />
          <span>{isAuthenticated ? 'Portal Dashboard' : 'Login Portal'}</span>
        </button>
      </div>

    </div>
  );
};
export default NotFoundPage;
