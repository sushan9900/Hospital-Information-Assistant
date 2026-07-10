// ==============================================================================
// Hospital Information Assistance — Doctor Directory API Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Handles all HTTP queries related to browsing doctor profiles and
//   admin-only modification of doctor details (CRUD).
//
// OPERATIONS:
//   - listDoctors()   → Retrieves a paginated list of doctors (with filters)
//   - getDoctorById() → Fetches details of a specific doctor
//   - createDoctor()  → Admin-only: add a new doctor
//   - updateDoctor()  → Admin-only: modify doctor details
//   - deleteDoctor()  → Admin-only: remove doctor from database
// ==============================================================================

import api from '@/utils/api';
import { Doctor } from '@/types';

export interface DoctorListResponse {
  total: number;
  doctors: Doctor[];
}

export interface DoctorInput {
  full_name: string;
  specialization: string;
  department_id: number;
  qualification?: string | null;
  experience_years?: number | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  consultation_fee?: string | null;
  available_days?: string | null;
}

export const doctorService = {
  // ----------------------------------------------------------------------------
  // LIST DOCTORS (PUBLIC)
  // WHY: Displays doctors on the directory page. Supports pagination,
  //      department filtering, and search parameters.
  // ----------------------------------------------------------------------------
  async listDoctors(
    skip = 0,
    limit = 10,
    departmentId?: number,
    specialization?: string,
    search?: string
  ): Promise<DoctorListResponse> {
    const params: Record<string, any> = { skip, limit };
    
    if (departmentId !== undefined && departmentId !== null) {
      params.department_id = departmentId;
    }
    if (specialization) {
      params.specialization = specialization;
    }
    if (search) {
      params.search = search;
    }

    const response = await api.get<DoctorListResponse>('/doctors/', { params });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET DOCTOR DETAILS (PUBLIC)
  // WHY: Retrieves doctor details for profile pages and chat context lookups.
  // ----------------------------------------------------------------------------
  async getDoctorById(doctorId: number): Promise<Doctor> {
    const response = await api.get<Doctor>(`/doctors/${doctorId}`);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // CREATE DOCTOR (ADMIN ONLY)
  // WHY: Adds a new doctor profile to the PostgreSQL database.
  // ----------------------------------------------------------------------------
  async createDoctor(doctorData: DoctorInput): Promise<Doctor> {
    const response = await api.post<Doctor>('/doctors/', doctorData);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // UPDATE DOCTOR (ADMIN ONLY)
  // WHY: Modifies an existing doctor's bio, available days, fees, etc.
  // ----------------------------------------------------------------------------
  async updateDoctor(doctorId: number, doctorData: Partial<DoctorInput>): Promise<Doctor> {
    const response = await api.put<Doctor>(`/doctors/${doctorId}`, doctorData);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // DELETE DOCTOR (ADMIN ONLY)
  // WHY: Removes a doctor record. Associated appointments cascade-delete.
  // ----------------------------------------------------------------------------
  async deleteDoctor(doctorId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/doctors/${doctorId}`);
    return response.data;
  }
};
