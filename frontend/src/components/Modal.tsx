// ==============================================================================
// Hospital Information Assistance — Reusable Modal Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   A reusable modal window overlay. It serves multiple purposes across the
//   app: scheduling appointments, editing doctor profiles, deactivating accounts,
//   or displaying RAG search configurations.
//
// KEY FEATURES:
//   - Click-outside-to-close behavior
//   - Escape key listener to close modal
//   - Responsive widths ('sm', 'md', 'lg', 'xl')
//   - Backdrop fading and modal slide-up animations
// ==============================================================================

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  // Controls visibility of the modal
  isOpen: boolean;
  
  // Callback fired when the user requests to close the modal
  onClose: () => void;
  
  // Optional title shown in the modal header
  title?: string;
  
  // Renders inside the modal viewport body
  children: React.ReactNode;
  
  // Size preset: sm (400px), md (600px), lg (800px), xl (1000px)
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------------------------
  // KEYBOARD ACCESSIBILITY (ESCAPE KEY)
  // WHY: Standard accessibility practice — pressing Esc should close modals.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // If closed, render nothing
  if (!isOpen) return null;

  // Map size prop to Tailwind max-width classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  // Close modal when user clicks on the backdrop (outside modalRef container)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className={`w-full ${sizeClasses[size]} rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300`}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate">
            {title || 'Dialog'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-slate-600 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};
