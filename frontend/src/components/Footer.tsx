// ==============================================================================
// Hospital Information Assistance — Footer Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Displays copyright notices, contact details, social links, and quick links
//   at the bottom of public pages.
//
// DESIGN & AESTHETICS:
//   - Slate background (`bg-slate-900`) for clear page structure separation
//   - Grid layout with responsive columns (brand summary, links, contact info)
//   - Hover transitions for navigation items
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Phone, Mail, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* BRAND COLUMN */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Activity size={18} />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                HIA Portal
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Providing modern AI-assisted medical information, scheduling, and portal tools to simplify your hospital visit experience.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/departments" className="hover:text-emerald-400 transition-colors">
                  Departments
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-emerald-400 transition-colors">
                  Doctors Directory
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Login Portal
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Register Account
                </Link>
              </li>
            </ul>
          </div>

          {/* AI CAPABILITIES */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              AI Services
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/chat" className="hover:text-emerald-400 transition-colors">
                  Interactive AI Chat
                </Link>
              </li>
              <li>
                <span className="text-slate-500 cursor-default">
                  Semantic Doctor Match
                </span>
              </li>
              <li>
                <span className="text-slate-500 cursor-default">
                  Instant Q&A Grounding
                </span>
              </li>
            </ul>
          </div>

          {/* CONTACT INFO */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Contact Information
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2.5">
                <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                <span>123 Medical Center Blvd, Floor 1</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone size={16} className="text-emerald-500 flex-shrink-0" />
                <a href="tel:+15550100" className="hover:text-emerald-400 transition-colors">
                  +1 (555) 0100
                </a>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail size={16} className="text-emerald-500 flex-shrink-0" />
                <a href="mailto:info@hospital.com" className="hover:text-emerald-400 transition-colors">
                  support@hia-hospital.com
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>&copy; {currentYear} Hospital Information Assistant. All rights reserved.</p>
          <p className="flex items-center mt-2 md:mt-0">
            Made with <Heart size={12} className="text-red-500 mx-1 animate-pulse" /> for health assistance
          </p>
        </div>
      </div>
    </footer>
  );
};
