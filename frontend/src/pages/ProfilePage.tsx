// ==============================================================================
// Hospital Information Assistance — Profile Settings Page
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the profile page where patients and admins can:
//   1. Modify their display name and email address
//   2. Change their login password securely
//
// HOW IT INTERACTS WITH STATE:
//   - Profiling changes call `userService.updateProfile`, which returns the updated
//     user object and registers it inside `localStorage`.
//   - It then updates the global AuthContext state (`updateUser()`) so the top
//     Navbar displays the corrected name instantly.
//   - Password resets require verifying the current password.
// ==============================================================================

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { 
  User as UserIcon, Mail, Lock, Shield, Calendar, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile fields state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI Status states
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Helper to extract initials for avatar placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'US';
  };

  // ----------------------------------------------------------------------------
  // UPDATE PROFILE INFO
  // ----------------------------------------------------------------------------
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (!fullName || !email) {
      setProfileError('Please enter both name and email.');
      return;
    }

    setIsProfileLoading(true);
    try {
      const updatedUser = await userService.updateProfile(fullName, email);
      updateUser(updatedUser);
      setProfileSuccess('Profile information updated successfully.');
    } catch (error: any) {
      const apiError = error.response?.data?.detail || 'Failed to update profile. Email might already be taken.';
      setProfileError(apiError);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // UPDATE PASSWORD
  // ----------------------------------------------------------------------------
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match. Please verify your entries.');
      return;
    }

    setIsPasswordLoading(true);
    try {
      await userService.changePassword(currentPassword, newPassword, confirmNewPassword);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      const apiError = error.response?.data?.detail || 'Failed to change password. Double check current password.';
      setPasswordError(apiError);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div>
        <h1 className="font-serif text-2xl text-clinic-forest-500 dark:text-slate-100 font-semibold tracking-tight">Account Settings</h1>
        <p className="text-[10px] font-sans font-bold text-clinic-sage-500 uppercase tracking-widest mt-1">
          Manage your personal details, email configurations, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: AVATAR & OVERVIEW CARD */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl p-6 shadow-premium flex flex-col items-center text-center">
            
            {/* Avatar Circle */}
            <div className="h-20 w-20 rounded-xl bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 border border-clinic-sage-200/40 dark:border-slate-800 flex items-center justify-center font-serif font-bold text-2xl shadow-inner animate-in zoom-in-95 duration-200">
              {getInitials(fullName)}
            </div>

            {/* Display Name / Email */}
            <div className="mt-4 space-y-1">
              <h3 className="font-serif text-base font-semibold text-clinic-text dark:text-slate-100">{fullName}</h3>
              <p className="text-xs text-clinic-text/65 dark:text-slate-500 font-semibold">{email}</p>
            </div>

            {/* Meta Data tags */}
            <div className="w-full border-t border-clinic-sage-200/20 dark:border-slate-850 mt-6 pt-6 space-y-3.5 text-left text-xs">
              
              {/* Role badge */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-sans font-bold text-clinic-text/55 dark:text-slate-500 uppercase tracking-widest">Access Level</span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-700 dark:text-clinic-400 font-sans font-bold border border-clinic-sage-200/40 dark:border-slate-800">
                  <Shield size={11} />
                  <span className="capitalize text-[9px] tracking-wider font-extrabold">{user?.role}</span>
                </span>
              </div>

              {/* Created Date */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-sans font-bold text-clinic-text/55 dark:text-slate-500 uppercase tracking-widest">Member Since</span>
                <span className="text-clinic-text/80 dark:text-slate-300 font-bold flex items-center font-sans text-xs">
                  <Calendar size={13} className="mr-1 text-clinic-sage-500" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: CONFIGURATION FORMS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* 1. PERSONAL INFORMATION FORM */}
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl shadow-premium overflow-hidden">
            <div className="border-b border-clinic-sage-200/40 dark:border-slate-800 px-6 py-4 bg-white/40 dark:bg-slate-900/40">
              <h3 className="font-serif text-sm text-clinic-forest-500 dark:text-slate-155 font-semibold">Personal Information</h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              {/* Form Status Messages */}
              {profileError && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20 bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-600 dark:text-clinic-terracotta-400 text-xs font-semibold animate-in fade-in duration-200">
                  <AlertCircle size={16} className="text-clinic-terracotta-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-sage-200/60 dark:border-slate-850 bg-clinic-bg/40 dark:bg-slate-950/40 text-clinic-forest-500 dark:text-slate-300 text-xs font-semibold animate-in fade-in duration-200">
                  <CheckCircle2 size={16} className="text-clinic-sage-550 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{profileSuccess}</span>
                </div>
              )}

              {/* Full Name input */}
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isProfileLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-205 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isProfileLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-205 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Submit Profile */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isProfileLoading}
                  className="flex items-center justify-center space-x-2 bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white font-sans font-bold py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-colors disabled:opacity-50"
                >
                  {isProfileLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>

          {/* 2. PASSWORD UPDATE FORM */}
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl shadow-premium overflow-hidden">
            <div className="border-b border-clinic-sage-200/40 dark:border-slate-800 px-6 py-4 bg-white/40 dark:bg-slate-900/40">
              <h3 className="font-serif text-sm text-clinic-forest-500 dark:text-slate-155 font-semibold">Security & Password</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              {/* Form Status Messages */}
              {passwordError && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20 bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-600 dark:text-clinic-terracotta-400 text-xs font-semibold animate-in fade-in duration-200">
                  <AlertCircle size={16} className="text-clinic-terracotta-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-sage-200/60 dark:border-slate-855 bg-clinic-bg/40 dark:bg-slate-950/40 text-clinic-forest-500 dark:text-slate-300 text-xs font-semibold animate-in fade-in duration-200">
                  <CheckCircle2 size={16} className="text-clinic-sage-550 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordSuccess}</span>
                </div>
              )}

              {/* Current Password input */}
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isPasswordLoading}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-205 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* New Password input */}
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isPasswordLoading}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-205 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Confirm New Password input */}
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={isPasswordLoading}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-205 outline-none hover:border-clinic-sage-500 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/25 transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Submit Password */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className="flex items-center justify-center space-x-2 bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white font-sans font-bold py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-colors disabled:opacity-50"
                >
                  {isPasswordLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Change Password</span>
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
export default ProfilePage;
