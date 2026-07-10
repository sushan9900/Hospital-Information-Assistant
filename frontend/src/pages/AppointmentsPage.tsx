// ==============================================================================
// Hospital Information Assistance — Appointments Scheduling Management Page
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the main scheduling portal where users can manage bookings:
//
//   PATIENT VIEW:
//     - Browse their personal scheduling history with pagination & status filters
//     - "Reschedule" booking dates/times via modal forms
//     - "Cancel" bookings via Confirmation warning overlays
//
//   ADMIN VIEW:
//     - Audit the entire hospital booking logs database with advanced filters
//       (filter by doctor, patient, or booking status)
//     - Transition scheduling lifecycles: **Confirm** pending bookings, mark
//       active bookings as **Completed**, or **Cancel** bookings
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { appointmentService } from '@/services/appointmentService';
import { doctorService } from '@/services/doctorService';
import { Appointment, AppointmentStatus, UserRole, Doctor } from '@/types';
import { 
  Calendar, Clock, User as UserIcon, Activity, CheckCircle2, 
  AlertCircle, XCircle, RefreshCw, Eye, ClipboardList, Loader2, Filter
} from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast, ToastType } from '@/components/Toast';

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);

  // Search/Filter states
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | undefined>(undefined);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined);
  const [filterUserId, setFilterUserId] = useState<string>(''); // Admin only
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // UI Flow states
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Modals controllers
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [cancellingApptId, setCancellingApptId] = useState<number | null>(null);
  
  // Reschedule Form inputs
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load bookings and doctors list
  useEffect(() => {
    fetchAppointments();
  }, [selectedStatus, selectedDoctorId, currentPage]);

  useEffect(() => {
    if (isAdmin) {
      fetchDoctors();
    }
  }, [isAdmin]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      
      if (isAdmin) {
        // Admin: List all database appointments with queries
        const targetUserId = filterUserId ? Number(filterUserId) : undefined;
        const res = await appointmentService.listAllAppointments(
          offset,
          itemsPerPage,
          selectedDoctorId,
          isNaN(targetUserId as number) ? undefined : targetUserId,
          selectedStatus
        );
        setAppointments(res.appointments);
        setTotalAppointments(res.total);
      } else {
        // Patient: List personal history
        const res = await appointmentService.getMyAppointments(
          offset,
          itemsPerPage,
          selectedStatus
        );
        setAppointments(res.appointments);
        setTotalAppointments(res.total);
      }
    } catch (err) {
      showToast('Failed to load appointment records.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await doctorService.listDoctors(0, 100);
      setDoctors(res.doctors);
    } catch (err) {
      console.error('Failed to load doctors list for filters:', err);
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const handleAdminSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAppointments();
  };

  // ----------------------------------------------------------------------------
  // PATIENT: SUBMIT RESCHEDULE REQUEST
  // ----------------------------------------------------------------------------
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!reschedulingAppt) return;
    if (!rescheduleDate || !rescheduleTime) {
      setFormError('Please select both date and time slot.');
      return;
    }

    setIsActionLoading(true);
    try {
      const updated = await appointmentService.updateAppointment(reschedulingAppt.id, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime
      });

      // Update UI row state directly
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === reschedulingAppt.id ? { ...appt, ...updated } : appt))
      );
      
      showToast('Appointment rescheduled successfully.', 'success');
      setReschedulingAppt(null);
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Reschedule failed. Try again.';
      setFormError(apiErr);
    } finally {
      setIsActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // PATIENT: CANCEL APPOINTMENT
  // ----------------------------------------------------------------------------
  const handleCancelAppointment = async () => {
    if (cancellingApptId === null) return;
    setIsActionLoading(true);
    try {
      await appointmentService.cancelAppointment(cancellingApptId);
      
      // Update UI row status
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === cancellingApptId
            ? { ...appt, status: AppointmentStatus.CANCELLED }
            : appt
        )
      );

      showToast('Appointment cancelled successfully.', 'success');
    } catch (err) {
      showToast('Failed to cancel appointment.', 'error');
    } finally {
      setIsActionLoading(false);
      setCancellingApptId(null);
    }
  };

  // ----------------------------------------------------------------------------
  // ADMIN: STATE MODIFIER (CONFIRM / COMPLETE / CANCEL)
  // ----------------------------------------------------------------------------
  const handleUpdateStatus = async (apptId: number, nextStatus: AppointmentStatus) => {
    setIsActionLoading(true);
    try {
      const updated = await appointmentService.updateAppointmentStatus(apptId, nextStatus);
      
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === apptId ? updated : appt))
      );
      
      showToast(`Appointment status updated to ${nextStatus}.`, 'success');
    } catch (err) {
      showToast('Failed to update appointment status.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // RESCHEDULE FORM INITIAL VALUES
  // ----------------------------------------------------------------------------
  const openRescheduleModal = (appt: Appointment) => {
    setReschedulingAppt(appt);
    setRescheduleDate(appt.appointment_date);
    setRescheduleTime(appt.appointment_time);
    setFormError(null);
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER PAGE */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Appointments Portal</h1>
        <p className="text-sm font-semibold text-slate-400 mt-1">
          {isAdmin 
            ? 'Oversee all hospital appointments, verify schedules, and update status logs.'
            : 'Track your personal scheduling history, reschedule dates, and request cancellations.'}
        </p>
      </div>

      {/* SEARCH FILTERS BLOCK */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-50">
          <span className="flex items-center"><Filter size={14} className="mr-1.5" /> Filter Log Results</span>
        </div>

        <form onSubmit={handleAdminSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          
          {/* Status Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Booking Status</label>
            <select
              value={selectedStatus || ''}
              onChange={(e) => {
                setSelectedStatus(e.target.value ? e.target.value as AppointmentStatus : undefined);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 rounded-xl outline-none hover:border-slate-300 focus:border-emerald-500 shadow-inner"
            >
              <option value="">All Statuses</option>
              <option value={AppointmentStatus.PENDING}>Pending</option>
              <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
              <option value={AppointmentStatus.COMPLETED}>Completed</option>
              <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          {/* Doctor filter (Admin only) */}
          {isAdmin ? (
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Practitioner Doctor</label>
              <select
                value={selectedDoctorId || ''}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 rounded-xl outline-none hover:border-slate-300 focus:border-emerald-500 shadow-inner"
              >
                <option value="">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Patient ID query (Admin only) */}
          {isAdmin ? (
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Patient User ID</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2 px-3 rounded-xl outline-none hover:border-slate-300 focus:border-emerald-500 shadow-inner"
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                >
                  Filter
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}

        </form>
      </div>

      {/* SCHEDULING LIST DATA LOG */}
      {isLoading ? (
        <LoadingSpinner message="Querying scheduled appointments..." />
      ) : appointments.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full"><ClipboardList size={36} /></div>
          <div className="max-w-xs">
            <h4 className="font-bold text-slate-700 text-sm">No bookings found</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              No medical visits matched your status filters or search queries.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">{isAdmin ? 'Patient profile' : 'Doctor Specialist'}</th>
                  <th className="px-6 py-3.5">Reason for Visit</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/20 transition-colors">
                    
                    {/* Booking ID */}
                    <td className="px-6 py-4 font-bold text-slate-400">
                      //{appt.id}
                    </td>

                    {/* Date and Time */}
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

                    {/* Patient/Doctor Name */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {isAdmin ? (
                          <>
                            <span className="font-bold text-slate-800">{appt.user?.full_name}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 font-semibold">ID: {appt.user_id}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-800">{appt.doctor?.full_name}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 font-semibold">{appt.doctor?.specialization}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Reason */}
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
                        /* Admin controls */
                        <div className="flex items-center justify-end space-x-1.5">
                          {appt.status === AppointmentStatus.PENDING && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.CONFIRMED)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-all"
                            >
                              Confirm
                            </button>
                          )}
                          {appt.status === AppointmentStatus.CONFIRMED && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.COMPLETED)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white text-xs font-bold transition-all"
                            >
                              Complete
                            </button>
                          )}
                          {appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED && (
                            <button
                              onClick={() => handleUpdateStatus(appt.id, AppointmentStatus.CANCELLED)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Cancel appointment"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Patient controls */
                        appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.COMPLETED ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openRescheduleModal(appt)}
                              className="inline-flex items-center space-x-1 border border-slate-100 hover:bg-slate-50 text-slate-600 py-1.5 px-3 rounded-xl text-xs font-bold transition-all"
                            >
                              <RefreshCw size={13} />
                              <span>Reschedule</span>
                            </button>
                            <button
                              onClick={() => setCancellingApptId(appt.id)}
                              className="inline-flex items-center space-x-1 border border-red-50 hover:bg-red-500 hover:text-white text-red-500 py-1.5 px-3 rounded-xl text-xs font-bold transition-all"
                            >
                              <XCircle size={13} />
                              <span>Cancel</span>
                            </button>
                          </div>
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

          {/* PAGINATION GRID */}
          <Pagination
            totalItems={totalAppointments}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* MODAL: RESCHEDULE SCHEDULING FORM (PATIENT ONLY) */}
      <Modal
        isOpen={reschedulingAppt !== null}
        onClose={() => setReschedulingAppt(null)}
        title={reschedulingAppt ? `Reschedule Appointment #${reschedulingAppt.id}` : ''}
        size="sm"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          
          {formError && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{formError}</span>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">New Date</label>
            <div className="relative flex items-center">
              <Calendar size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Block history dates
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 shadow-sm transition-all"
                required
              />
            </div>
          </div>

          {/* Time Picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">New Time Slot</label>
            <div className="relative flex items-center">
              <Clock size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
              <select
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none hover:border-slate-300 focus:border-emerald-500 shadow-sm transition-all"
                required
              >
                <option value="">Select a time slot</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>
          </div>

          {/* Reschedule actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 mt-6 font-semibold text-sm">
            <button
              type="button"
              onClick={() => setReschedulingAppt(null)}
              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 px-4 rounded-xl border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="flex-1 flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-4 rounded-xl shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
            >
              {isActionLoading && <Loader2 size={16} className="animate-spin" />}
              <span>Save Schedule</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* CONFIRMATION FOR APPOINTMENT CANCELLATION (PATIENT ONLY) */}
      <ConfirmDialog
        isOpen={cancellingApptId !== null}
        onClose={() => setCancellingApptId(null)}
        onConfirm={handleCancelAppointment}
        isLoading={isActionLoading}
        isDanger
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? Doing so will update status logs. This action cannot be undone."
        confirmLabel="Cancel Appointment"
      />

      {/* TOAST NOTIFIER */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
};
export default AppointmentsPage;
