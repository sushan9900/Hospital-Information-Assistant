// ==============================================================================
// Hospital Information Assistance — Main Layout Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This layout acts as the standard shell wrapper for all pages in the app
//   (Dashboard, Doctors, Departments, Profile, etc.).
//   It ensures the `Navbar` is always displayed at the top, the page content is
//   correctly positioned in the middle, and the `Footer` sits at the bottom.
//
// WHAT IT DOES:
//   Uses `<Outlet />` from `react-router-dom` to render nested child components.
//   It also handles basic page height layouts so the footer stays pinned to the bottom.
// ==============================================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-200">
      
      {/* GLOBAL NAVBAR HEADER */}
      <Navbar />

      {/* VIEWPORT CONTENT BODY
          flex-grow pushes the footer to the bottom of the viewport
          on pages with minimal content. */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* GLOBAL FOOTER */}
      <Footer />
      
    </div>
  );
};
export default MainLayout;
