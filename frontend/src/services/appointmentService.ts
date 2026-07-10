// ==============================================================================
// Hospital Information Assistance — Appointment Booking API Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Handles all HTTP queries related to patient booking requests, personal
//   scheduling history, and administrator-specific scheduling overviews.
//
// OPERATIONS:
//   - bookAppointment()          → Patient schedules a new booking slot
//   - getMyAppointments()       → Patient retrieves their own history
//   - listAllAppointments()      → Admin-only paginated query of all system appointments
//   - getAppointmentById()     → Fetches a specific booking detail (access checks apply)
//   - updateAppointment()        → Patient updates/reschedules their booking
//   - updateAppointmentStatus() → Admin-only confirms/completes/cancels a booking
//   - cancelAppointment()        → Patient cancels their booking
// ==============================================================================

import api from '@/utils/api';
import { Appointment, AppointmentStatus } from '@/types';

export interface AppointmentListResponse {
  total: number;
  appointments: Appointment[];
}

export interface AppointmentInput {
  doctor_id: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // e.g., "10:00 AM"
  reason?: string | null;
}

export interface AppointmentUpdateInput {
  appointment_date?: string;
  appointment_time?: string;
  reason?: string;
  notes?: string;
}

export const appointmentService = {
  // ----------------------------------------------------------------------------
  // BOOK APPOINTMENT (PATIENT)
  // WHY: Submits a new booking form. JWT details map user_id on backend.
  // ----------------------------------------------------------------------------
  async bookAppointment(data: AppointmentInput): Promise<Appointment> {
    const response = await api.post<Appointment>('/appointments/', data);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET MY APPOINTMENTS (PATIENT)
  // WHY: Queries scheduling history for the logged-in user.
  // ----------------------------------------------------------------------------
  async getMyAppointments(
    skip = 0,
    limit = 10,
    status?: AppointmentStatus
  ): Promise<AppointmentListResponse> {
    const params: Record<string, any> = { skip, limit };
    if (status) {
      params.status = status;
    }

    const response = await api.get<AppointmentListResponse>('/appointments/my', { params });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // LIST ALL APPOINTMENTS (ADMIN ONLY)
  // WHY: Allows administrators to monitor all hospital visits with pagination/filters.
  // ----------------------------------------------------------------------------
  async listAllAppointments(
    skip = 0,
    limit = 10,
    doctorId?: number,
    userId?: number,
    status?: AppointmentStatus
  ): Promise<AppointmentListResponse> {
    const params: Record<string, any> = { skip, limit };
    
    if (doctorId !== undefined) params.doctor_id = doctorId;
    if (userId !== undefined) params.user_id = userId;
    if (status) params.status = status;

    const response = await api.get<AppointmentListResponse>('/appointments/', { params });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET APPOINTMENT BY ID (PATIENT / ADMIN)
  // WHY: Retrieves specific details of a booking slot. Access control applies.
  // ----------------------------------------------------------------------------
  async getAppointmentById(apptId: number): Promise<Appointment> {
    const response = await api.get<Appointment>(`/appointments/${apptId}`);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // UPDATE / RESCHEDULE APPOINTMENT (PATIENT)
  // WHY: Allows the booking owner to modify the date/time/complaint details.
  // ----------------------------------------------------------------------------
  async updateAppointment(apptId: number, data: AppointmentUpdateInput): Promise<Appointment> {
    const response = await api.put<Appointment>(`/appointments/${apptId}`, data);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // UPDATE STATUS (ADMIN ONLY)
  // WHY: Allows administrators/receptionists to confirm, complete, or cancel bookings.
  // ----------------------------------------------------------------------------
  async updateAppointmentStatus(
    apptId: number,
    status: AppointmentStatus,
    notes?: string
  ): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${apptId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // CANCEL APPOINTMENT (PATIENT)
  // WHY: Allows a patient to safely cancel a booking slot (updates status to cancel).
  // ----------------------------------------------------------------------------
  async cancelAppointment(apptId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/appointments/${apptId}/cancel`);
    return response.data;
  }
};
