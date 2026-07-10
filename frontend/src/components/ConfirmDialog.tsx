// ==============================================================================
// Hospital Information Assistance — Confirmation Dialog Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   A specialized dialog for actions requiring user confirmation (e.g., cancelling
//   appointments, deleting doctor profiles, or deactivating user accounts).
//
// DESIGN & FEATURES:
//   - Wraps the reusable `Modal` component
//   - Support danger styling (red confirm button for destructive actions)
//   - Supports custom confirm and cancel labels
// ==============================================================================

import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  
  // If true, highlights the action as destructive/danger (uses red buttons)
  // If false, uses standard brand buttons (emerald/green)
  isDanger?: boolean;
  
  // Displays a loading state spinner inside the confirm button during async ops
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose(); // Automatically close dialog on success
    } catch (error) {
      console.error('Confirmation action failed:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center space-y-4 pt-2">
        {/* Warning Alert Icon */}
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
          isDanger ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
        }`}>
          <AlertTriangle size={28} />
        </div>

        {/* Message body text */}
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          {message}
        </p>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full pt-4 border-t border-slate-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-sm border border-slate-200 transition-all duration-200"
          >
            {cancelLabel}
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center space-x-2 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all duration-200 ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 shadow-red-100 hover:shadow-red-200'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100 hover:shadow-emerald-200'
            }`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
