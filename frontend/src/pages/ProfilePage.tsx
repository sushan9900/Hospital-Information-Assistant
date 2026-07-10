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
      
      // Update global React state
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

    // Front-end validations
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
      
      // Clear password input fields on success
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
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Account Settings</h1>
        <p className="text-sm font-semibold text-slate-400 mt-1">
          Manage your personal details, email configurations, and security passwords.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: AVATAR & OVERVIEW CARD */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            
            {/* Avatar Circle */}
            <div className="h-20 w-20 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black text-2xl shadow-inner">
              {getInitials(fullName)}
            </div>

            {/* Display Name / Email */}
            <div className="mt-4 space-y-1">
              <h3 className="font-bold text-slate-800 text-base">{fullName}</h3>
              <p className="text-xs text-slate-400 font-semibold">{email}</p>
            </div>

            {/* Meta Data tags */}
            <div className="w-full border-t border-slate-100 mt-6 pt-6 space-y-3.5 text-left text-xs">
              
              {/* Role badge */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Access Level</span>
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                  <Shield size={12} />
                  <span className="capitalize">{user?.role}</span>
                </span>
              </div>

              {/* Created Date */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Member Since</span>
                <span className="text-slate-600 font-bold flex items-center">
                  <Calendar size={13} className="mr-1 text-slate-400" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: CONFIGURATION FORMS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* 1. PERSONAL INFORMATION FORM */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-800 text-sm">Personal Information</h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              {/* Form Status Messages */}
              {profileError && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{profileSuccess}</span>
                </div>
              )}

              {/* Full Name input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isProfileLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isProfileLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Submit Profile */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isProfileLoading}
                  className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
                >
                  {isProfileLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>

          {/* 2. PASSWORD UPDATE FORM */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-800 text-sm">Security & Password</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              {/* Form Status Messages */}
              {passwordError && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordSuccess}</span>
                </div>
              )}

              {/* Current Password input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isPasswordLoading}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* New Password input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isPasswordLoading}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Confirm New Password input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={isPasswordLoading}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Submit Password */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
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
