// ==============================================================================
// Hospital Information Assistance — Dashboard Page Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the core landing portal for authenticated users.
//   It dynamically branches based on the user's role (Patient vs. Admin):
//
//   PATIENT VIEW:
//     - Welcome banner and clinical stat summaries
//     - Interactive upcoming appointment cards
//     - Recent AI Chat history preview (resume chat links)
//     - Health Tips Widget (clinical wellness cards)
//
//   ADMIN VIEW:
//     - Hospital-wide statistics (counts of doctors, depts, bookings, users)
//     - Quick admin shortcuts (doctor, department, and RAG index management)
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
import { Appointment, AppointmentStatus, UserRole, ChatSession } from '@/types';
import { 
  Calendar, Clock, User as UserIcon, Activity, MessageSquare, 
  Users, CheckCircle2, AlertCircle, XCircle, Plus, Shield, 
  ShieldAlert, Heart, ArrowRight, BookOpen, UserCheck
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner, Skeleton } from '@/components/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // App data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Static Health Tips list
  const healthTips = [
    { id: 1, title: "Stay Hydrated", text: "Drinking enough water supports digestion, circulation, and body temperature regulation.", category: "Wellness" },
    { id: 2, title: "Prioritize Sleep", text: "Aim for 7-9 hours of quality sleep nightly to restore immune and cognitive functions.", category: "Recovery" },
    { id: 3, title: "Daily Movement", text: "A 30-minute brisk walk daily significantly reduces the risk of chronic cardiovascular issues.", category: "Cardio" },
    { id: 4, title: "Screen Breaks", text: "Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.", category: "Habits" }
  ];

  const [activeTipIndex, setActiveTipIndex] = useState(0);

  // Load dashboard elements on mount
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Rotate health tips every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % healthTips.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (user.role === UserRole.ADMIN) {
        // --- ADMIN INITIALIZATION ---
        const [apptsRes, docRes, deptRes, userRes] = await Promise.all([
          appointmentService.listAllAppointments(0, 10),
          doctorService.listDoctors(0, 1),
          departmentService.listDepartments(0, 1),
          userService.listAllUsers(0, 1)
        ]);

        setAppointments(apptsRes.appointments);
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
        const [apptsRes, chatsRes] = await Promise.all([
          appointmentService.getMyAppointments(0, 10),
          chatService.listSessions(0, 100)
        ]);

        setAppointments(apptsRes.appointments);
        setRecentChats(chatsRes.sessions.slice(0, 3));
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
      setErrorMsg('Could not synchronize dashboard logs. Please check your connection.');
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
      setErrorMsg('Failed to cancel appointment. Please try again.');
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
      setErrorMsg('Failed to update booking status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return 'bg-clinic-forest-50 dark:bg-clinic-forest-500/20 text-clinic-forest-500 border-clinic-forest-100 dark:border-clinic-forest-500/30';
      case AppointmentStatus.PENDING:
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/25';
      case AppointmentStatus.COMPLETED:
        return 'bg-clinic-sage-50 dark:bg-slate-800 text-clinic-sage-600 dark:text-slate-450 border-clinic-sage-100 dark:border-slate-700';
      case AppointmentStatus.CANCELLED:
        return 'bg-clinic-terracotta-50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-500 border-clinic-terracotta-100 dark:border-clinic-terracotta-500/25';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-4">
        {/* Banner skeleton */}
        <Skeleton className="h-40 w-full rounded-xl" />
        
        {/* Grid cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        
        {/* Large container skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === UserRole.ADMIN;
  const currentTip = healthTips[activeTipIndex];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* ERROR ANNOUNCEMENT HEADER */}
      {errorMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20 bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-600 dark:text-clinic-terracotta-400 text-xs font-semibold animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-clinic-terracotta-500 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* WELCOME PORTAL HERO BANNER */}
      <div className="bg-clinic-forest-500 dark:bg-slate-900 text-white rounded-xl p-8 relative overflow-hidden shadow-premium border border-clinic-forest-600/30 dark:border-slate-800">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-clinic-sage-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[9px] font-sans font-bold border border-white/10 tracking-widest uppercase">
            {isAdmin ? <Shield size={11} /> : <Activity size={11} />}
            <span>{isAdmin ? 'Administration System' : 'Patient Portal'}</span>
          </div>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-white tracking-tight leading-none">
            Hello, {user?.full_name}
          </h1>
          <p className="text-xs text-clinic-sage-100/80 leading-relaxed font-sans font-medium">
            {isAdmin 
              ? 'Oversee clinical schedules, update doctor directory profiles, check database metrics, and manage AI RAG document synchronization.'
              : 'Browse specialized hospital units, schedule checkup timings with practitioners, and consult our HIPAA-compliant AI medical assistant.'}
          </p>
        </div>
      </div>

      {isAdmin ? (
        /* ======================================================================
           ADMIN VIEWPORT
           ====================================================================== */
        <>
          {/* ADMIN METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-5 rounded-xl shadow-premium flex items-center space-x-4">
              <div className="p-3 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg"><UserIcon size={20} /></div>
              <div>
                <p className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest leading-none">Total Doctors</p>
                <h3 className="text-2xl font-serif font-semibold text-clinic-text dark:text-slate-100 mt-2">{stats.totalDoctors}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-5 rounded-xl shadow-premium flex items-center space-x-4">
              <div className="p-3 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg"><Activity size={20} /></div>
              <div>
                <p className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest leading-none">Departments</p>
                <h3 className="text-2xl font-serif font-semibold text-clinic-text dark:text-slate-100 mt-2">{stats.totalDepartments}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-5 rounded-xl shadow-premium flex items-center space-x-4">
              <div className="p-3 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg"><Calendar size={20} /></div>
              <div>
                <p className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest leading-none">Total Bookings</p>
                <h3 className="text-2xl font-serif font-semibold text-clinic-text dark:text-slate-100 mt-2">{stats.totalBookings}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-5 rounded-xl shadow-premium flex items-center space-x-4">
              <div className="p-3 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg"><Users size={20} /></div>
              <div>
                <p className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest leading-none">Registered Users</p>
                <h3 className="text-2xl font-serif font-semibold text-clinic-text dark:text-slate-100 mt-2">{stats.totalUsers}</h3>
              </div>
            </div>
          </div>

          {/* ADMIN COMMAND SHORTS */}
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-6 rounded-xl shadow-premium space-y-4">
            <h3 className="text-[10px] font-sans font-bold text-clinic-text/60 dark:text-slate-450 uppercase tracking-widest">Admin System Shortcuts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/doctors" className="flex items-center justify-between p-4 bg-clinic-bg dark:bg-slate-950 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 text-clinic-text dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-clinic-sage-200/40 dark:border-slate-800">
                <span className="flex items-center space-x-2.5">
                  <UserCheck size={15} className="text-clinic-forest-500" />
                  <span>Doctor Directories</span>
                </span>
                <ArrowRight size={14} className="text-clinic-sage-500" />
              </Link>
              <Link to="/departments" className="flex items-center justify-between p-4 bg-clinic-bg dark:bg-slate-950 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 text-clinic-text dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-clinic-sage-200/40 dark:border-slate-800">
                <span className="flex items-center space-x-2.5">
                  <Activity size={15} className="text-clinic-forest-500" />
                  <span>Manage Units</span>
                </span>
                <ArrowRight size={14} className="text-clinic-sage-500" />
              </Link>
              <Link to="/rag" className="flex items-center justify-between p-4 bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 hover:bg-clinic-terracotta-50 dark:hover:bg-clinic-terracotta-500/20 text-clinic-terracotta-500 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20">
                <span className="flex items-center space-x-2.5">
                  <ShieldAlert size={15} />
                  <span>RAG Synchronizer</span>
                </span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      ) : (
        /* ======================================================================
           PATIENT VIEWPORT (SPLIT LAYOUT)
           ====================================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SECTION (2/3 WIDTH): APPOINTMENTS & CHATS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* APPOINTMENT BOOKINGS PORTLET */}
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl shadow-premium overflow-hidden">
              <div className="flex items-center justify-between border-b border-clinic-sage-200/40 dark:border-slate-800 px-6 py-4 bg-white/40 dark:bg-slate-900/40">
                <h2 className="font-serif text-lg text-clinic-forest-500 dark:text-slate-100 font-semibold tracking-tight">
                  Upcoming Consultations
                </h2>
                <Link
                  to="/doctors"
                  className="flex items-center space-x-1.5 bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white font-sans font-bold py-2 px-3.5 rounded-xl text-[9px] tracking-widest uppercase shadow-premium hover:shadow-premium-hover transition-all"
                >
                  <Plus size={11} />
                  <span>Book Visit</span>
                </Link>
              </div>

              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                  <div className="p-4 bg-clinic-sage-50 dark:bg-slate-850 text-clinic-sage-500 rounded-full"><Clock size={28} /></div>
                  <div className="max-w-xs space-y-1">
                    <h4 className="text-xs font-bold text-clinic-text dark:text-slate-300">No Scheduled Visits</h4>
                    <p className="text-[11px] text-clinic-text/60 dark:text-slate-500 leading-relaxed font-semibold">
                      You have no upcoming medical visits. Browse our specialists directory to schedule a checkup.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-clinic-sage-200/45 dark:divide-slate-800">
                  {appointments.slice(0, 3).map((appt) => (
                    <div key={appt.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-clinic-sage-50/20 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg hidden sm:block"><Calendar size={18} /></div>
                        <div>
                          <h4 className="font-serif text-sm font-semibold text-clinic-text dark:text-slate-100">{appt.doctor?.full_name}</h4>
                          <p className="text-[10px] text-clinic-text/60 dark:text-slate-550 font-bold uppercase tracking-wider mt-0.5">{appt.doctor?.specialization}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-clinic-text/70 dark:text-slate-400">
                            <span className="flex items-center font-bold">
                              <Calendar size={12} className="mr-1 text-clinic-forest-500" />
                              {appt.appointment_date}
                            </span>
                            <span className="flex items-center font-bold">
                              <Clock size={12} className="mr-1 text-clinic-forest-500" />
                              {appt.appointment_time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 sm:self-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${getStatusBadgeClass(appt.status)}`}>
                          {appt.status}
                        </span>
                        {appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED && (
                          <button
                            onClick={() => setCancellingApptId(appt.id)}
                            className="inline-flex items-center space-x-1 border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20 hover:bg-clinic-terracotta-500 hover:text-white text-clinic-terracotta-500 py-1.5 px-3 rounded-lg text-[9px] font-sans font-bold uppercase tracking-widest transition-all"
                          >
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {appointments.length > 3 && (
                    <div className="p-3 bg-clinic-sage-50/20 dark:bg-slate-800/50 text-center border-t border-clinic-sage-200/40 dark:border-slate-800">
                      <Link to="/appointments" className="text-[9px] font-sans font-bold text-clinic-forest-500 hover:text-clinic-forest-700 inline-flex items-center space-x-1.5 uppercase tracking-widest">
                        <span>View All {appointments.length} Appointments</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RECENT CHATS PREVIEW PORTLET */}
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl shadow-premium overflow-hidden">
              <div className="flex items-center justify-between border-b border-clinic-sage-200/40 dark:border-slate-800 px-6 py-4 bg-white/40 dark:bg-slate-900/40">
                <h2 className="font-serif text-lg text-clinic-forest-500 dark:text-slate-100 font-semibold tracking-tight">
                  Recent AI Consultations
                </h2>
                <Link
                  to="/chat"
                  className="flex items-center space-x-1.5 bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white font-sans font-bold py-2 px-3.5 rounded-xl text-[9px] tracking-widest uppercase shadow-premium hover:shadow-premium-hover transition-all"
                >
                  <MessageSquare size={11} />
                  <span>New Chat</span>
                </Link>
              </div>

              {recentChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                  <div className="p-4 bg-clinic-sage-50 dark:bg-slate-850 text-clinic-sage-500 rounded-full"><MessageSquare size={28} /></div>
                  <div className="max-w-xs space-y-1">
                    <h4 className="text-xs font-bold text-clinic-text dark:text-slate-300">No Chat History</h4>
                    <p className="text-[11px] text-clinic-text/60 dark:text-slate-500 leading-relaxed font-semibold">
                      Consult our AI medical companion for fast answers about clinical guidelines or symptoms.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-clinic-sage-200/45 dark:divide-slate-800">
                  {recentChats.map((chat) => (
                    <Link 
                      key={chat.session_id} 
                      to={`/chat?session=${chat.session_id}`} 
                      className="p-5 flex items-center justify-between hover:bg-clinic-sage-50/20 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <div className="flex items-start space-x-3.5 min-w-0">
                        <div className="p-2.5 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg mt-0.5"><MessageSquare size={14} /></div>
                        <div className="min-w-0">
                          <h4 className="font-serif text-sm font-semibold text-clinic-text dark:text-slate-105 group-hover:text-clinic-forest-500 transition-colors">{chat.title || "AI Medical Discussion"}</h4>
                          <p className="text-[11px] text-clinic-text/60 dark:text-slate-500 truncate mt-1 font-medium">
                            {chat.last_message || "No messages logged yet."}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-clinic-sage-500 flex-shrink-0 ml-4 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SECTION (1/3 WIDTH): STATS, HEALTH TIPS & ACTIONS */}
          <div className="space-y-6">
            
            {/* STATS METRIC PILLS */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/appointments" className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-5 rounded-xl shadow-premium flex flex-col justify-between hover:bg-clinic-sage-50/20 dark:hover:bg-slate-800/40 transition-colors">
                <div className="p-2 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg self-start"><Calendar size={18} /></div>
                <div className="mt-4">
                  <p className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-550 uppercase tracking-widest leading-none">Visits Booked</p>
                  <h3 className="text-2xl font-serif font-semibold text-clinic-text dark:text-slate-150 mt-2">{stats.userAppointments}</h3>
                </div>
              </Link>
              <Link to="/chat" className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-5 rounded-xl shadow-premium flex flex-col justify-between hover:bg-clinic-sage-50/20 dark:hover:bg-slate-800/40 transition-colors">
                <div className="p-2 bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 rounded-lg self-start"><MessageSquare size={18} /></div>
                <div className="mt-4">
                  <p className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-550 uppercase tracking-widest leading-none">AI Discussions</p>
                  <h3 className="text-2xl font-serif font-semibold text-clinic-text dark:text-slate-150 mt-2">{stats.activeChats}</h3>
                </div>
              </Link>
            </div>

            {/* HEALTH TIPS WIDGET */}
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-6 rounded-xl shadow-premium space-y-4">
              <div className="flex items-center space-x-2 text-clinic-forest-500">
                <Heart size={15} className="animate-pulse" />
                <h3 className="text-[10px] font-sans font-bold uppercase tracking-widest">Clinical Tip</h3>
              </div>
              <div className="space-y-2 animate-in fade-in duration-300" key={currentTip.id}>
                <span className="inline-block text-[8px] font-sans font-black uppercase tracking-widest px-2 py-0.5 rounded bg-clinic-sage-50 dark:bg-clinic-forest-500/20 text-clinic-forest-500">
                  {currentTip.category}
                </span>
                <h4 className="font-serif text-sm font-semibold text-clinic-text dark:text-slate-100">{currentTip.title}</h4>
                <p className="text-xs text-clinic-text/75 dark:text-slate-405 leading-relaxed font-semibold">
                  {currentTip.text}
                </p>
              </div>
              <div className="flex space-x-1.5 pt-2">
                {healthTips.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveTipIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeTipIndex === idx ? 'w-4 bg-clinic-forest-500' : 'w-1.5 bg-clinic-sage-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* PATIENT ACTIONS shortcuts */}
            <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 p-6 rounded-xl shadow-premium space-y-4">
              <h3 className="text-[10px] font-sans font-bold text-clinic-text/60 dark:text-slate-450 uppercase tracking-widest">Quick Channels</h3>
              <div className="flex flex-col space-y-2">
                <Link to="/doctors" className="flex items-center justify-between p-3.5 bg-clinic-bg dark:bg-slate-950 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 text-clinic-text dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-clinic-sage-200/40 dark:border-slate-800">
                  <span className="flex items-center space-x-2">
                    <UserIcon size={14} className="text-clinic-forest-500" />
                    <span>Meet Our Specialists</span>
                  </span>
                  <ArrowRight size={14} className="text-clinic-sage-500" />
                </Link>
                <Link to="/departments" className="flex items-center justify-between p-3.5 bg-clinic-bg dark:bg-slate-950 hover:bg-clinic-sage-50 dark:hover:bg-slate-800 text-clinic-text dark:text-slate-350 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-clinic-sage-200/40 dark:border-slate-800">
                  <span className="flex items-center space-x-2">
                    <Activity size={14} className="text-clinic-forest-500" />
                    <span>Hospital Units</span>
                  </span>
                  <ArrowRight size={14} className="text-clinic-sage-500" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* APPOINTMENT TIMELINE SECTION (ADMIN VIEW ONLY) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl shadow-premium overflow-hidden">
          
          {/* Section Header */}
          <div className="border-b border-clinic-sage-200/40 dark:border-slate-800 px-6 py-5 bg-white/40 dark:bg-slate-900/40">
            <h2 className="font-serif text-lg text-clinic-forest-500 dark:text-slate-100 font-semibold tracking-tight">
              Hospital-Wide Scheduling Log
            </h2>
          </div>

          {/* List Body */}
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
              <div className="p-4 bg-clinic-sage-50 dark:bg-slate-850 text-clinic-sage-500 rounded-full"><Clock size={28} /></div>
              <div className="max-w-xs space-y-1">
                <h4 className="text-xs font-bold text-clinic-text dark:text-slate-300">No scheduled visits</h4>
                <p className="text-[11px] text-clinic-text/60 dark:text-slate-500 leading-relaxed font-semibold">
                  There are currently no bookings logged in the system database.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-clinic-sage-200/40 dark:divide-slate-800 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-clinic-sage-50/50 dark:bg-slate-805 text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest border-b border-clinic-sage-200/40 dark:border-slate-800">
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Patient Detail</th>
                    <th className="px-6 py-4">Doctor Specialist</th>
                    <th className="px-6 py-4">Reason for Visit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-clinic-sage-200/20 dark:divide-slate-800 text-xs font-semibold">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-clinic-sage-50/10 dark:hover:bg-slate-800/30 transition-colors text-clinic-text dark:text-slate-300">
                      
                      {/* Date/Time */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-clinic-sage-50 dark:bg-slate-800 text-clinic-sage-500 rounded-lg"><Calendar size={14} /></div>
                          <div className="flex flex-col">
                            <span className="font-serif font-bold text-clinic-text dark:text-slate-100">{appt.appointment_date}</span>
                            <span className="text-[9px] text-clinic-text/60 dark:text-slate-500 flex items-center mt-0.5 font-sans font-bold uppercase tracking-wider">
                              <Clock size={11} className="mr-1 text-clinic-forest-500" />
                              {appt.appointment_time}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Patient Details */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-clinic-text dark:text-slate-100">{appt.user?.full_name}</span>
                          <span className="text-[10px] text-clinic-text/60 dark:text-slate-500 mt-0.5">{appt.user?.email}</span>
                        </div>
                      </td>

                      {/* Doctor details */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-clinic-text dark:text-slate-100">{appt.doctor?.full_name}</span>
                          <span className="text-[10px] text-clinic-text/60 dark:text-slate-500 mt-0.5">{appt.doctor?.specialization}</span>
                        </div>
                      </td>

                      {/* Visit Reason */}
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="truncate font-medium text-clinic-text/75 dark:text-slate-400" title={appt.reason || ''}>
                          {appt.reason || <span className="text-clinic-text/40 dark:text-slate-700 italic font-normal">No reason provided</span>}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${getStatusBadgeClass(appt.status)}`}>
                          {appt.status}
                        </span>
                      </td>

                      {/* Action Controls */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {appt.status === AppointmentStatus.PENDING && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.CONFIRMED)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-clinic-forest-50 dark:bg-clinic-forest-500/10 text-clinic-forest-500 hover:bg-clinic-forest-500 hover:text-white dark:hover:bg-clinic-forest-500 dark:hover:text-white text-[9px] font-sans font-bold uppercase tracking-wider transition-all"
                              title="Confirm booking"
                            >
                              Confirm
                            </button>
                          )}
                          {appt.status === AppointmentStatus.CONFIRMED && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.COMPLETED)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-clinic-sage-50 dark:bg-slate-800 text-clinic-sage-600 dark:text-slate-350 hover:bg-clinic-forest-500 hover:text-white dark:hover:bg-clinic-forest-500 dark:hover:text-white text-[9px] font-sans font-bold uppercase tracking-wider transition-all"
                              title="Mark Completed"
                            >
                              Complete
                            </button>
                          )}
                          {appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.CANCELLED)}
                              disabled={isActionLoading}
                              className="p-2 rounded-lg text-clinic-text/60 hover:text-clinic-terracotta-500 hover:bg-clinic-terracotta-50 dark:hover:bg-clinic-terracotta-500/10 transition-all animate-pulse"
                              title="Cancel booking"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

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
