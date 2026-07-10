// ==============================================================================
// Hospital Information Assistance — Navigation Bar Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Provides the global header navigation. It links to core pages (Doctors,
//   Departments, Dashboard, AI Chat) and displays current user profiles and
//   authentication actions (Login, Logout, Register).
//
// DESIGN & AESTHETICS:
//   - Glassmorphism effect (`backdrop-blur`, `bg-white/90`, `shadow-glass`)
//   - Dynamic active routing styles
//   - Fully responsive layout with mobile drawer toggle menu
//   - Clean badges for admin vs patient roles
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, Activity, User as UserIcon, LogOut, Calendar, MessageSquare, ShieldAlert } from 'lucide-react';
import { UserRole } from '@/types';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  // Helper to determine if a route is active
  const isActive = (path: string) => location.pathname === path;

  // Render navigation links dynamically
  const navLinks = [
    { name: 'Departments', path: '/departments', icon: Activity },
    { name: 'Doctors', path: '/doctors', icon: UserIcon },
  ];

  const authLinks = isAuthenticated ? [
    { name: 'Dashboard', path: '/dashboard', icon: Calendar },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          {/* BRAND LOGO & TITLE */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-200 transition-all duration-300 group-hover:scale-105">
                <Activity size={22} className="animate-pulse" />
              </div>
              <span className="font-semibold text-lg text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors duration-200 hidden sm:block">
                Hospital Information Assistant
              </span>
              <span className="font-semibold text-lg text-slate-800 tracking-tight sm:hidden">
                HIA
              </span>
            </Link>
          </div>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {/* Standard Public & Auth Links */}
            {[...navLinks, ...authLinks].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-emerald-50 text-emerald-600 shadow-sm'
                      : 'text-slate-600 hover:text-emerald-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Admin RAG Index Controls Link */}
            {isAuthenticated && user?.role === UserRole.ADMIN && (
              <Link
                to="/rag"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive('/rag')
                    ? 'bg-red-50 text-red-600 shadow-sm'
                    : 'text-red-500 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <ShieldAlert size={16} />
                <span>RAG Admin</span>
              </Link>
            )}
          </div>

          {/* USER ACTIONS (DESKTOP) */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-4 border-l border-slate-100 pl-4">
                {/* User Detail Badge */}
                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">
                    {user.full_name}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold self-end mt-0.5 px-1.5 py-0.5 rounded-full ${
                    user.role === UserRole.ADMIN 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role}
                  </span>
                </div>
                
                {/* Profile Circle Icon Link */}
                <Link
                  to="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white transition-all duration-300"
                  title="Profile Settings"
                >
                  <UserIcon size={18} />
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogoutClick}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all duration-300"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 border-l border-slate-100 pl-4">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-emerald-500 px-4 py-2 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md shadow-emerald-100 hover:shadow-lg transition-all duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE BUTTON */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE DRAWER DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-2 pb-4 space-y-1 shadow-inner animate-in slide-in-from-top duration-200">
          {[...navLinks, ...authLinks].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold ${
                  isActive(link.path)
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={20} />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {/* RAG Controls (Admin Mobile) */}
          {isAuthenticated && user?.role === UserRole.ADMIN && (
            <Link
              to="/rag"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold ${
                isActive('/rag')
                  ? 'bg-red-50 text-red-600'
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <ShieldAlert size={20} />
              <span>RAG Admin Controls</span>
            </Link>
          )}

          {/* User Session Details (Mobile) */}
          {isAuthenticated && user ? (
            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
              <div className="flex items-center px-4 py-2 space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <UserIcon size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 leading-none">{user.full_name}</span>
                  <span className="text-xs text-slate-400 mt-1">{user.email}</span>
                </div>
              </div>
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold text-slate-600 hover:bg-slate-50"
              >
                <UserIcon size={20} />
                <span>My Profile Settings</span>
              </Link>
              <button
                onClick={handleLogoutClick}
                className="flex w-full items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold text-red-500 hover:bg-red-50"
              >
                <LogOut size={20} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col space-y-2 px-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-semibold bg-emerald-500 text-white shadow-md shadow-emerald-100 hover:bg-emerald-600 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
