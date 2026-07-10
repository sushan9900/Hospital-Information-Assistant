// ==============================================================================
// Hospital Information Assistance — Department API Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Handles all HTTP queries related to browsing hospital departments and
//   admin-only department configuration modifications (CRUD).
//
// OPERATIONS:
//   - listDepartments()   → Retrieves a paginated list of departments (with search)
//   - getDepartmentById() → Fetches department profile and list of doctors
//   - createDepartment()  → Admin-only: add a new department
//   - updateDepartment()  → Admin-only: modify department details
//   - deleteDepartment()  → Admin-only: remove department from database
// ==============================================================================

import api from '@/utils/api';
import { Department, DepartmentDetailResponse } from '@/types';

export interface DepartmentListResponse {
  total: number;
  departments: Department[];
}

export interface DepartmentInput {
  name: string;
  description?: string | null;
  location?: string | null;
  phone?: string | null;
}

export const departmentService = {
  // ----------------------------------------------------------------------------
  // LIST DEPARTMENTS (PUBLIC)
  // WHY: Displays hospital departments on directory pages. Supports search.
  // ----------------------------------------------------------------------------
  async listDepartments(
    skip = 0,
    limit = 10,
    search?: string
  ): Promise<DepartmentListResponse> {
    const params: Record<string, any> = { skip, limit };
    
    if (search) {
      params.search = search;
    }

    const response = await api.get<DepartmentListResponse>('/departments/', { params });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET DEPARTMENT DETAILS (PUBLIC)
  // WHY: Retrieves the department info alongside a nested list of doctors
  //      registered inside it (e.g. for the department detail page).
  // ----------------------------------------------------------------------------
  async getDepartmentById(deptId: number): Promise<DepartmentDetailResponse> {
    const response = await api.get<DepartmentDetailResponse>(`/departments/${deptId}`);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // CREATE DEPARTMENT (ADMIN ONLY)
  // WHY: Adds a new department record to the PostgreSQL database.
  // ----------------------------------------------------------------------------
  async createDepartment(deptData: DepartmentInput): Promise<Department> {
    const response = await api.post<Department>('/departments/', deptData);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // UPDATE DEPARTMENT (ADMIN ONLY)
  // WHY: Modifies department description, floor location, phone contact, etc.
  // ----------------------------------------------------------------------------
  async updateDepartment(
    deptId: number,
    deptData: Partial<DepartmentInput>
  ): Promise<Department> {
    const response = await api.put<Department>(`/departments/${deptId}`, deptData);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // DELETE DEPARTMENT (ADMIN ONLY)
  // WHY: Removes a department. Associated doctor profiles cascade-delete.
  // ----------------------------------------------------------------------------
  async deleteDepartment(deptId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/departments/${deptId}`);
    return response.data;
  }
};
