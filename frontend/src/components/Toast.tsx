// ==============================================================================
// Hospital Information Assistance — Toast Notification Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Displays temporary, non-blocking notification banners (toasts) in the
//   corner of the screen. Used to confirm successful actions (e.g., "Appointment
//   booked successfully") or flag errors (e.g., "Login credentials invalid").
//
// KEY FEATURES:
//   - Auto-dismisses after a set duration (default: 4 seconds)
//   - Supports 4 styles: 'success', 'error', 'warning', 'info'
//   - Clean sliding and fading animations for exit/entry
// ==============================================================================

import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  // Notification body text
  message: string;
  
  // Style type
  type?: ToastType;
  
  // Triggered when close is clicked or when timer expires
  onClose: () => void;
  
  // Auto close timer in milliseconds (default: 4000)
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 4000,
}) => {
  
  // ----------------------------------------------------------------------------
  // AUTO-HIDE TIMEOUT
  // WHY: Banners should automatically disappear so they don't block the UI.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // Clean up timer if component unmounts before timeout
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  // Style configurations for each toast type
  const typeConfigs = {
    success: {
      bgColor: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      iconColor: 'text-emerald-500',
      Icon: CheckCircle,
    },
    error: {
      bgColor: 'bg-red-50 border-red-100 text-red-800',
      iconColor: 'text-red-500',
      Icon: AlertCircle,
    },
    warning: {
      bgColor: 'bg-amber-50 border-amber-100 text-amber-800',
      iconColor: 'text-amber-500',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-sky-50 border-sky-100 text-sky-800',
      iconColor: 'text-sky-500',
      Icon: Info,
    },
  };

  const { bgColor, iconColor, Icon } = typeConfigs[type];

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center space-x-3 rounded-2xl border px-4 py-3.5 shadow-xl max-w-sm w-full transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in-20`}
    >
      <div className={`flex items-center space-x-3 w-full p-1 rounded-xl ${bgColor}`}>
        {/* Type Icon */}
        <Icon size={20} className={`${iconColor} flex-shrink-0`} />
        
        {/* Message Content */}
        <p className="text-xs font-semibold flex-1 leading-snug">
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-colors"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
