// ==============================================================================
// Hospital Information Assistance — Frontend Type Definitions
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Defines all TypeScript interfaces and enums used across the frontend.
//   These interfaces match the structure of the data sent and received from
//   the FastAPI backend (our Pydantic schemas).
//   Having strong types prevents bugs, provides autocomplete in our IDE, and
//   documents the API structure for developer convenience.
// ==============================================================================

// ------------------------------------------------------------------------------
// USER & AUTH TYPES
// ------------------------------------------------------------------------------
export enum UserRole {
  ADMIN = 'admin',
  PATIENT = 'patient',
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

// ------------------------------------------------------------------------------
// DEPARTMENT TYPES
// ------------------------------------------------------------------------------
export interface DepartmentBrief {
  id: number;
  name: string;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  phone: string | null;
  doctor_count: number;
  created_at: string;
  updated_at: string;
}

// Lightweight Doctor object nested inside DepartmentDetailResponse
export interface DoctorInDepartment {
  id: number;
  full_name: string;
  specialization: string;
  experience_years: number | null;
  consultation_fee: string | null;
}

export interface DepartmentDetailResponse extends Department {
  doctors: DoctorInDepartment[];
}

// ------------------------------------------------------------------------------
// DOCTOR TYPES
// ------------------------------------------------------------------------------
export interface Doctor {
  id: number;
  full_name: string;
  specialization: string;
  qualification: string | null;
  experience_years: number | null;
  department_id: number;
  department: DepartmentBrief | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  consultation_fee: string | null;
  available_days: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// APPOINTMENT TYPES
// ------------------------------------------------------------------------------
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface PatientBrief {
  id: number;
  full_name: string;
  email: string;
}

export interface DoctorBrief {
  id: number;
  full_name: string;
  specialization: string;
}

export interface Appointment {
  id: number;
  user_id: number;
  doctor_id: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // e.g., "10:00 AM"
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  user: PatientBrief | null;
  doctor: DoctorBrief | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// CHATBOT & SESSION TYPES
// ------------------------------------------------------------------------------
export interface ChatSession {
  id: number;
  user_id: number;
  session_id: string; // UUID string
  title: string;
  is_active: boolean;
  message_count: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'human' | 'ai';
  content: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  title: string;
  messages: ChatMessage[];
  total_messages: number;
}

export interface ChatResponse {
  success: boolean;
  session_id: string;
  user_message: string;
  ai_response: string;
  message_count: number;
  timestamp: string;
}

// ------------------------------------------------------------------------------
// RAG & SEARCH TYPES
// ------------------------------------------------------------------------------
export interface SearchResultItem {
  point_id: string;
  score: number;
  record_type: 'doctor' | 'department';
  record_id: number;
  content: string;
  metadata: {
    name: string;
    specialization?: string;
    department?: string;
    [key: string]: any;
  };
}

export interface RAGSearchResponse {
  success: boolean;
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface RAGAskResponse {
  success: boolean;
  question: string;
  answer: string;
  sources: SearchResultItem[];
  has_relevant_context: boolean;
}
