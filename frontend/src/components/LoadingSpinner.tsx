// ==============================================================================
// Hospital Information Assistance — Loading Spinner Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   A reusable loading indicator. It displays during slow API operations,
//   token authorizations on start, or route transitions.
//
// DUAL MODE FEATURE:
//   - Full-Screen Overlay: Blurs background and centers spinner (for page loads)
//   - Inline: Compact layout for embeds within buttons or card panels
// ==============================================================================

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  // If true, takes up the full screen height/width and centers itself
  fullScreen?: boolean;
  
  // Optional status message text shown below the spinner
  message?: string;
  
  // Controls the pixel size of the spinner icon (defaults to 32)
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullScreen = false,
  message = 'Loading...',
  size = 32,
}) => {
  const spinnerElement = (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Lucide icon with Tailwind animate-spin class */}
      <Loader2
        size={size}
        className="animate-spin text-emerald-500 transition-colors"
      />
      {message && (
        <span className="text-sm font-semibold text-slate-500 tracking-wide">
          {message}
        </span>
      )}
    </div>
  );

  // If full-screen, wrap in a centered flex layout that fills the screen
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
        {spinnerElement}
      </div>
    );
  }

  // Otherwise, return inline centering (useful for embedding in cards)
  return (
    <div className="flex w-full items-center justify-center p-8">
      {spinnerElement}
    </div>
  );
};
