// ==============================================================================
// Hospital Information Assistance — Loading Spinner & Skeleton Components
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Provides reusable visual cues for loading states:
//   - LoadingSpinner: A circular spinner for full-screen overlays or inline loads.
//   - Skeleton: An animated card/text shape placeholder for content-heavy loaders
//     (helps pages load smoothly instead of jarring spinner flashes).
//
// DESIGN & AESTHETICS (CONCIERGE CLINIC):
//   - Deep forest green spinners
//   - Warm ivory full-screen loading backdrops with smooth blur filters
//   - Soft sage-gray pulsing skeletons
//   - Clean uppercase sans font metrics for descriptions
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
      <Loader2
        size={size}
        className="animate-spin text-clinic-forest-500 transition-colors"
      />
      {message && (
        <span className="text-[10px] font-sans font-bold text-clinic-text/60 dark:text-slate-400 tracking-widest uppercase">
          {message}
        </span>
      )}
    </div>
  );

  // If full-screen, wrap in a centered flex layout that fills the screen
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-bg/90 dark:bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
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

// ------------------------------------------------------------------------------
// SKELETON COMPONENT
// WHY: Creates custom-shaped animated blocks that look like real text/cards
//      while data loads, providing a premium visual transition experience.
// ------------------------------------------------------------------------------
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rect' 
}) => {
  const shapeClass = 
    variant === 'circle' 
      ? 'rounded-full' 
      : variant === 'text' 
      ? 'rounded-md h-3.5 w-full' 
      : 'rounded-xl';

  return (
    <div 
      className={`animate-pulse bg-clinic-sage-100/50 dark:bg-slate-800/60 ${shapeClass} ${className}`}
    />
  );
};
export default LoadingSpinner;
