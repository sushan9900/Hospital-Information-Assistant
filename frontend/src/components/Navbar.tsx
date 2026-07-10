// ==============================================================================
// Hospital Information Assistance — Navigation Bar Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Provides the global header navigation. It links to core pages (Doctors,
//   Departments, Dashboard, AI Chat) and displays current user profiles and
//   authentication actions (Login, Logout, Register).
//
// DESIGN & AESTHETICS (CONCIERGE CLINIC):
//   - Elegant serif title (Playfair Display)
//   - Clean humanist sans-serif nav links (Inter)
//   - Muted sage green borders (hairline 1px border)
//   - Deep forest green buttons and active states
//   - Toggleable dark mode controller (local storage sync)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Menu, X, Activity, User as UserIcon, LogOut, 
  Calendar, MessageSquare, ShieldAlert, Sun, Moon 
} from 'lucide-react';
import { UserRole } from '@/types';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  });

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { name: 'Departments', path: '/departments', icon: Activity },
    { name: 'Doctors', path: '/doctors', icon: UserIcon },
  ];

  const authLinks = isAuthenticated ? [
    { name: 'Dashboard', path: '/dashboard', icon: Calendar },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-clinic-sage-200/50 dark:border-slate-800 bg-clinic-bg/95 dark:bg-slate-950/95 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          
          {/* BRAND LOGO & TITLE */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinic-forest-500 text-white shadow-premium transition-all duration-300 group-hover:scale-105">
                <Activity size={18} />
              </div>
              <span className="font-serif italic text-lg tracking-tight text-clinic-forest-500 dark:text-slate-105 group-hover:text-clinic-forest-700 dark:group-hover:text-white transition-colors duration-200 hidden sm:block">
                Hospital AI Assistant
              </span>
              <span className="font-serif italic text-lg tracking-tight text-clinic-forest-500 dark:text-slate-105 sm:hidden">
                HIA
              </span>
            </Link>
          </div>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {[...navLinks, ...authLinks].map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-200 border ${
                    active
                      ? 'bg-clinic-forest-500 text-white border-transparent'
                      : 'text-clinic-text/75 dark:text-slate-400 hover:text-clinic-forest-500 dark:hover:text-clinic-forest-500 hover:bg-clinic-sage-100/50 dark:hover:bg-slate-900 border-transparent'
                  }`}
                >
                  <Icon size={12} />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Admin RAG Index Link */}
            {isAuthenticated && user?.role === UserRole.ADMIN && (
              <Link
                to="/rag"
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-200 border ${
                  isActive('/rag')
                    ? 'bg-clinic-terracotta-500 text-white border-transparent'
                    : 'text-clinic-terracotta-500 hover:bg-clinic-terracotta-50 dark:hover:bg-clinic-terracotta-500/10 border-transparent'
                }`}
              >
                <ShieldAlert size={12} />
                <span>RAG Admin</span>
              </Link>
            )}
          </div>

          {/* USER ACTIONS & THEME TOGGLE (DESKTOP) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-clinic-sage-200/50 dark:border-slate-800 text-clinic-forest-500 dark:text-slate-400 hover:bg-clinic-sage-50 dark:hover:bg-slate-900 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 border-l border-clinic-sage-200/50 dark:border-slate-800 pl-4">
                {/* User Detail Badge */}
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-clinic-text dark:text-slate-200 truncate max-w-[150px]">
                    {user.full_name}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-md self-end ${
                    user.role === UserRole.ADMIN 
                      ? 'bg-clinic-terracotta-50 dark:bg-clinic-terracotta-500/20 text-clinic-terracotta-500' 
                      : 'bg-clinic-forest-50 dark:bg-clinic-forest-500/20 text-clinic-forest-500'
                  }`}>
                    {user.role}
                  </span>
                </div>
                
                {/* Profile Settings */}
                <Link
                  to="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinic-bg dark:bg-slate-900 border border-clinic-sage-200/50 dark:border-slate-800 text-clinic-forest-500 dark:text-slate-350 hover:bg-clinic-forest-500 hover:text-white dark:hover:bg-clinic-forest-500 dark:hover:text-white transition-all duration-300"
                  title="Profile Settings"
                >
                  <UserIcon size={14} />
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogoutClick}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinic-bg dark:bg-slate-900 border border-clinic-sage-200/50 dark:border-slate-800 text-clinic-terracotta-500 dark:text-clinic-terracotta-600 hover:bg-clinic-terracotta-500 hover:text-white dark:hover:bg-clinic-terracotta-500 dark:hover:text-white transition-all duration-300"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 border-l border-clinic-sage-200/50 dark:border-slate-800 pl-4">
                <Link
                  to="/login"
                  className="text-xs font-bold text-clinic-forest-500 hover:text-clinic-forest-700 px-4 py-2 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white px-4.5 py-2.5 rounded-xl shadow-premium transition-all duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE CONTROLS */}
          <div className="flex items-center md:hidden space-x-2">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-clinic-sage-200/50 dark:border-slate-800 text-clinic-forest-500 dark:text-slate-400 hover:bg-clinic-sage-50 dark:hover:bg-slate-900 transition-colors"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-clinic-forest-500 dark:text-slate-400 hover:bg-clinic-sage-50 dark:hover:bg-slate-900 focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-clinic-sage-200/50 dark:border-slate-800 bg-clinic-bg dark:bg-slate-950 px-4 pt-2 pb-4 space-y-1 shadow-inner animate-in slide-in-from-top duration-200">
          {[...navLinks, ...authLinks].map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
                  active
                    ? 'bg-clinic-forest-500 text-white'
                    : 'text-clinic-text/75 dark:text-slate-400 hover:bg-clinic-sage-50 dark:hover:bg-slate-900 hover:text-clinic-forest-500 dark:hover:text-slate-205'
                }`}
              >
                <Icon size={16} />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {/* RAG Controls (Admin Mobile) */}
          {isAuthenticated && user?.role === UserRole.ADMIN && (
            <Link
              to="/rag"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
                isActive('/rag')
                  ? 'bg-clinic-terracotta-500 text-white'
                  : 'text-clinic-terracotta-500 hover:bg-clinic-terracotta-50 dark:hover:bg-clinic-terracotta-500/10'
              }`}
            >
              <ShieldAlert size={16} />
              <span>RAG Admin Controls</span>
            </Link>
          )}

          {/* User Session Details (Mobile) */}
          {isAuthenticated && user ? (
            <div className="pt-4 border-t border-clinic-sage-200/50 dark:border-slate-800 mt-4 space-y-2">
              <div className="flex items-center px-4 py-2 space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clinic-sage-50 dark:bg-slate-900 text-clinic-forest-500 dark:text-slate-350">
                  <UserIcon size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-clinic-text dark:text-slate-200 leading-none">{user.full_name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">{user.email}</span>
                </div>
              </div>
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-clinic-text/75 dark:text-slate-450 hover:bg-clinic-sage-50 dark:hover:bg-slate-900"
              >
                <UserIcon size={16} />
                <span>My Profile Settings</span>
              </Link>
              <button
                onClick={handleLogoutClick}
                className="flex w-full items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-clinic-terracotta-500 hover:bg-clinic-terracotta-50 dark:hover:bg-clinic-terracotta-500/10"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-clinic-sage-200/50 dark:border-slate-800 mt-4 flex flex-col space-y-2 px-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-bold text-clinic-forest-500 hover:bg-clinic-sage-50 dark:hover:bg-slate-900 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl font-bold bg-clinic-forest-500 text-white shadow-premium hover:bg-clinic-forest-600 transition-colors"
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
export default Navbar;
