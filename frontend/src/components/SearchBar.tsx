// ==============================================================================
// Hospital Information Assistance — Search Bar Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   A reusable text search inputs. It is used on lists/directories (Doctors and
//   Departments) to allow users to search names or specializations.
//
// DESIGN & FEATURES:
//   - Magnifying glass search icon
//   - Close/X icon that clears the input instantly
//   - Styled container borders (`hover:border-slate-300`, `focus-within:border-emerald-500`)
// ==============================================================================

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  // Input binding value
  value: string;
  
  // Callback fired when input changes
  onChange: (value: string) => void;
  
  // Optional callback fired when hitting Enter or clicking search
  onSubmit?: () => void;
  
  // Custom placeholder text
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit();
    }
  };

  const handleClear = () => {
    onChange('');
    if (onSubmit) {
      // Small timeout allows state to sync before triggering query refresh
      setTimeout(() => onSubmit(), 0);
    }
  };

  return (
    <div className="relative flex items-center w-full max-w-md">
      {/* Search Icon */}
      <Search
        size={18}
        className="absolute left-4 text-slate-400 pointer-events-none"
      />
      
      {/* Text Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all duration-200"
      />

      {/* Clear Button (Visible only when text is typed) */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          title="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
