// ==============================================================================
// Hospital Information Assistance — Pagination Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Provides navigation controls for paginated list/table views (e.g., listing all
//   doctors, browsing all appointments, or viewing user tables).
//
// DESIGN & FEATURES:
//   - Previous and Next arrow icons
//   - Numeric page button selectors (automatically handles high page count ranges)
//   - Elegant, compact layout with hover transition highlights
// ==============================================================================

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // If there's 1 or fewer pages, we don't need to show pagination controls
  if (totalPages <= 1) return null;

  // ----------------------------------------------------------------------------
  // PAGE RANGES GENERATION
  // WHY: If we have 100 pages, we shouldn't render 100 buttons.
  //      This helper renders up to 5 smart numeric buttons:
  //      e.g. Current, adjacent pages, and boundaries.
  // ----------------------------------------------------------------------------
  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // If total pages is small, show all of them
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Render smart ranges centered around the currentPage
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      // Adjust boundaries if we are near the start or end
      if (currentPage <= 3) {
        end = maxVisiblePages;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisiblePages + 1;
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6 mt-4 transition-colors duration-200">
      {/* MOBILE COMPACT BTNS */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* DESKTOP PAGINATION CONTROLS */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        
        {/* Count Label */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-bold text-slate-800 dark:text-slate-205">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-800 dark:text-slate-205">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{' '}
            of{' '}
            <span className="font-bold text-slate-800 dark:text-slate-205">{totalItems}</span> results
          </p>
        </div>

        {/* Numeric Button Strip */}
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-900 space-x-1"
            aria-label="Pagination"
          >
            {/* Previous Arrow */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft size={16} />
            </button>

            {/* Numeric Pages */}
            {pages.map((page) => {
              const isCurrent = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`relative inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold transition-all duration-200 ${
                    isCurrent
                      ? 'z-10 bg-emerald-500 text-white shadow-md shadow-emerald-100/10 scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            {/* Next Arrow */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="sr-only">Next</span>
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>

      </div>
    </div>
  );
};
