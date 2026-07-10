// ==============================================================================
// Hospital Information Assistance — Dashboard Page Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the core landing portal for authenticated users.
//   It dynamically branches based on the user's role (Patient vs. Admin):
//
//   PATIENT VIEW:
//     - Personal greeting and appointment count stats
//     - Interactive grid of their personal bookings with cancel triggers
//     - Quick actions to navigate to AI Chat or browse doctors
//
//   ADMIN VIEW:
//     - Hospital-wide statistics (counts of doctors, depts, total bookings, users)
//     - Quick dashboard links to doctors/departments management and RAG panel
//     - Interactive log of all hospital bookings with status update prompts
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { appointmentService } from '@/services/appointmentService';
import { doctorService } from '@/services/doctorService';
import { departmentService } from '@/services/departmentService';
import { userService } from '@/services/userService';
import { chatService } from '@/services/chatService';
import { Appointment, AppointmentStatus, UserRole } from '@/types';
import { 
  Calendar, Clock, User as UserIcon, Activity, MessageSquare, 
  Users, CheckCircle2, AlertCircle, XCircle, Plus, Shield, ShieldAlert
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // App data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    userAppointments: 0,
    activeChats: 0,
    totalDoctors: 0,
    totalDepartments: 0,
    totalBookings: 0,
    totalUsers: 0
  });

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [cancellingApptId, setCancellingApptId] = useState<number | null>(null);

  // Load dashboard elements on mount
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (user.role === UserRole.ADMIN) {
        // --- ADMIN INITIALIZATION ---
        // Fetch all hospital appointments (first 10)
        const apptsRes = await appointmentService.listAllAppointments(0, 10);
        setAppointments(apptsRes.appointments);

        // Fetch counts for statistics grid
        const docRes = await doctorService.listDoctors(0, 1);
        const deptRes = await departmentService.listDepartments(0, 1);
        const userRes = await userService.listAllUsers(0, 1);

        setStats({
          userAppointments: 0,
          activeChats: 0,
          totalDoctors: docRes.total,
          totalDepartments: deptRes.total,
          totalBookings: apptsRes.total,
          totalUsers: userRes.total
        });
      } else {
        // --- PATIENT INITIALIZATION ---
        // Fetch patient's own bookings
        const apptsRes = await appointmentService.getMyAppointments(0, 10);
        setAppointments(apptsRes.appointments);

        // Fetch user's active AI chat session count
        const chatsRes = await chatService.listSessions(0, 100);
        
        setStats({
          userAppointments: apptsRes.total,
          activeChats: chatsRes.total,
          totalDoctors: 0,
          totalDepartments: 0,
          totalBookings: 0,
          totalUsers: 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // PATIENT: CANCEL APPOINTMENT CALLBACK
  // ----------------------------------------------------------------------------
  const handleCancelAppointment = async () => {
    if (cancellingApptId === null) return;
    setIsActionLoading(true);
    try {
      await appointmentService.cancelAppointment(cancellingApptId);
      
      // Update local state instead of full reload
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === cancellingApptId
            ? { ...appt, status: AppointmentStatus.CANCELLED }
            : appt
        )
      );
      
      setStats((prev) => ({
        ...prev,
        userAppointments: Math.max(0, prev.userAppointments - 1)
      }));
    } catch (error) {
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setIsActionLoading(false);
      setCancellingApptId(null);
    }
  };

  // ----------------------------------------------------------------------------
  // ADMIN: CONFIRM / COMPLETE / CANCEL STATUS MODIFIERS
  // ----------------------------------------------------------------------------
  const handleUpdateStatus = async (apptId: number, nextStatus: AppointmentStatus) => {
    setIsActionLoading(true);
    try {
      const updated = await appointmentService.updateAppointmentStatus(
        apptId, 
        nextStatus, 
        `Updated status to ${nextStatus} via Admin Dashboard.`
      );

      setAppointments((prev) =>
        prev.map((appt) => (appt.id === apptId ? updated : appt))
      );
    } catch (error) {
      alert('Failed to update booking status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Helper to color code statuses
  const getStatusBadgeClass = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case AppointmentStatus.PENDING:
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case AppointmentStatus.COMPLETED:
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Assembling your dashboard portal..." />;
  }

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* WELCOME PORTAL HERO BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-slate-950/10">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/10">
            {isAdmin ? <Shield size={12} /> : <Activity size={12} />}
            <span>{isAdmin ? 'Administration Portal' : 'Patient Center'}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hello, {user?.full_name}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {isAdmin 
              ? 'Oversee schedules, manage doctor directory profiles, check database metrics, and synchronize vector search indexes.'
              : 'Browse specialized hospital units, schedule checkup timings with selected practitioners, and consult our AI medical assistant.'}
          </p>
        </div>
      </div>

      {/* PORTAL STATISTICS GRID */}
      {isAdmin ? (
        /* ADMIN METRICS */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-xl"><UserIcon size={24} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Doctors</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalDoctors}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-blue-50 text-blue-500 rounded-xl"><Activity size={24} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Departments</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalDepartments}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-purple-50 text-purple-500 rounded-xl"><Calendar size={24} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalBookings}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3.5 bg-amber-50 text-amber-500 rounded-xl"><Users size={24} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Users</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.totalUsers}</h3>
            </div>
          </div>
        </div>
      ) : (
        /* PATIENT METRICS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/appointments" className="bg-white hover:bg-slate-50/50 border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center space-x-5 group transition-all">
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:scale-105 transition-transform"><Calendar size={28} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Appointments</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.userAppointments}</h3>
            </div>
          </Link>
          <Link to="/chat" className="bg-white hover:bg-slate-50/50 border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center space-x-5 group transition-all">
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:scale-105 transition-transform"><MessageSquare size={28} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Chat Sessions</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.activeChats}</h3>
            </div>
          </Link>
        </div>
      )}

      {/* QUICK LINKS / CONTROLS */}
      {isAdmin && (
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800">Admin Command Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/doctors" className="flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 px-4 rounded-xl text-sm font-semibold transition-colors border border-slate-200">
              <UserIcon size={16} />
              <span>Manage Doctor Profiles</span>
            </Link>
            <Link to="/departments" className="flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 px-4 rounded-xl text-sm font-semibold transition-colors border border-slate-200">
              <Activity size={16} />
              <span>Manage Departments</span>
            </Link>
            <Link to="/rag" className="flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 px-4 rounded-xl text-sm font-semibold transition-colors border border-red-100">
              <ShieldAlert size={16} />
              <span>RAG Embed Ingester</span>
            </Link>
          </div>
        </div>
      )}

      {/* APPOINTMENT TIMELINE SECTION */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {isAdmin ? 'Hospital-Wide Scheduling Log' : 'My Upcoming Appointments'}
          </h2>
          {!isAdmin && (
            <Link
              to="/doctors"
              className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-3.5 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors"
            >
              <Plus size={14} />
              <span>Book Appointment</span>
            </Link>
          )}
        </div>

        {/* List Body */}
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full"><Clock size={36} /></div>
            <div className="max-w-xs space-y-1">
              <h4 className="text-sm font-bold text-slate-700">No scheduled visits</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAdmin 
                  ? 'There are currently no bookings logged in the system database.' 
                  : 'You have no upcoming medical visits. Book a new appointment to get started.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">{isAdmin ? 'Patient Detail' : 'Doctor Specialist'}</th>
                  <th className="px-6 py-3">Reason for Visit</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/30 transition-colors">
                    
                    {/* Date/Time */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Calendar size={16} /></div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{appt.appointment_date}</span>
                          <span className="text-[11px] text-slate-400 flex items-center mt-0.5 font-semibold">
                            <Clock size={12} className="mr-1" />
                            {appt.appointment_time}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Patient/Doctor details */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {isAdmin ? (
                          <>
                            <span className="font-bold text-slate-800">{appt.user?.full_name}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{appt.user?.email}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-800">{appt.doctor?.full_name}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{appt.doctor?.specialization}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Visit Reason */}
                    <td className="px-6 py-4 max-w-xs">
                      <p className="truncate font-medium text-slate-600" title={appt.reason || ''}>
                        {appt.reason || <span className="text-slate-300 italic">No reason provided</span>}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(appt.status)}`}>
                        {appt.status}
                      </span>
                    </td>

                    {/* Action Controls */}
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        /* Admin Status Toggles */
                        <div className="flex items-center justify-end space-x-1">
                          {appt.status === AppointmentStatus.PENDING && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.CONFIRMED)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-all"
                              title="Confirm booking"
                            >
                              Confirm
                            </button>
                          )}
                          {appt.status === AppointmentStatus.CONFIRMED && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.COMPLETED)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white text-xs font-bold transition-all"
                              title="Mark Completed"
                            >
                              Complete
                            </button>
                          )}
                          {appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.CANCELLED)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Cancel booking"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Patient Cancels */
                        appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED ? (
                          <button
                            onClick={() => setCancellingApptId(appt.id)}
                            className="inline-flex items-center space-x-1.5 border border-red-100 hover:bg-red-500 hover:text-white hover:shadow-md text-red-500 py-1.5 px-3 rounded-xl text-xs font-bold transition-all"
                          >
                            <XCircle size={14} />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 italic">No actions</span>
                        )
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* CONFIRMATION FOR APPOINTMENT CANCELLATION (PATIENT ONLY) */}
      <ConfirmDialog
        isOpen={cancellingApptId !== null}
        onClose={() => setCancellingApptId(null)}
        onConfirm={handleCancelAppointment}
        isLoading={isActionLoading}
        isDanger
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmLabel="Cancel Appointment"
      />

    </div>
  );
};
export default DashboardPage;
