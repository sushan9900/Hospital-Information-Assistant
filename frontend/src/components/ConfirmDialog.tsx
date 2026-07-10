// ==============================================================================
// Hospital Information Assistance — Confirmation Dialog Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   A specialized dialog for actions requiring user confirmation (e.g., cancelling
//   appointments, deleting doctor profiles, or deactivating user accounts).
//
// DESIGN & FEATURES (CONCIERGE CLINIC):
//   - Elegant serif titles (Playfair Display)
//   - Custom clinical-themed layout using brand colors
//   - Support danger styling (terracotta button for destructive actions)
//   - Replaces heavy shadows with 1px muted sage hairline boundaries
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
  
  // If true, highlights the action as destructive/danger (uses terracotta accent buttons)
  // If false, uses standard brand buttons (forest green)
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
      <div className="flex flex-col items-center text-center space-y-4 pt-1">
        {/* Warning Alert Icon */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
          isDanger 
            ? 'bg-clinic-terracotta-50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-500 border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20' 
            : 'bg-clinic-sage-50 dark:bg-clinic-sage-500/10 text-clinic-forest-500 border-clinic-sage-200/50 dark:border-slate-800'
        }`}>
          <AlertTriangle size={20} />
        </div>

        {/* Message body text */}
        <p className="text-sm text-clinic-text/80 dark:text-slate-300 font-medium leading-relaxed max-w-xs">
          {message}
        </p>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full pt-4 border-t border-clinic-sage-200/30 dark:border-slate-800/80 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-white dark:bg-slate-900 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 text-clinic-text/85 dark:text-slate-300 font-sans font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider border border-clinic-sage-200 dark:border-slate-800 transition-all duration-200"
          >
            {cancelLabel}
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center space-x-2 text-white font-sans font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-all duration-200 ${
              isDanger
                ? 'bg-clinic-terracotta-500 hover:bg-clinic-terracotta-600'
                : 'bg-clinic-forest-500 hover:bg-clinic-forest-600'
            }`}
          >
            {isLoading && <Loader2 size={12} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
