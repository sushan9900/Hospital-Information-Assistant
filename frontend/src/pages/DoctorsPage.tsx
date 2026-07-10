// ==============================================================================
// Hospital Information Assistance — Doctors Directory Page
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the doctor directory page. It provides different views based on role:
//
//   PATIENT / VISITOR VIEW:
//     - Search name/specialization and filter by department
//     - Grid of doctor profile cards (qualification, fees, experience, availability)
//     - "Book Appointment" triggers a modal scheduling form (requires login)
//
//   ADMIN VIEW:
//     - All patient features
//     - "Add Doctor" button to open creation modal
//     - "Edit Doctor" and "Delete Doctor" controls on cards (destructive verify)
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { doctorService, DoctorInput } from '@/services/doctorService';
import { departmentService } from '@/services/departmentService';
import { appointmentService } from '@/services/appointmentService';
import { Doctor, Department, UserRole, AppointmentStatus } from '@/types';
import { 
  Search, Filter, Plus, Calendar, Clock, UserCheck, Trash2, Edit2, 
  MapPin, Phone, GraduationCap, DollarSign, Award, Clipboard, Loader2, AlertCircle 
} from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast, ToastType } from '@/components/Toast';

export const DoctorsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === UserRole.ADMIN;

  // Data states
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalDoctors, setTotalDoctors] = useState(0);

  // Filter/Query states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // UI Flow states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Modals controllers
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deletingDoctorId, setDeletingDoctorId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Input states (Booking form)
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Input states (Admin Create/Edit form)
  const [fullName, setFullName] = useState('');
  const [departmentId, setDepartmentId] = useState<number>(0);
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [availableDays, setAvailableDays] = useState('');
  const [adminFormError, setAdminFormError] = useState<string | null>(null);

  // Load directories on mount and query changes
  useEffect(() => {
    fetchDoctors();
  }, [selectedDeptId, currentPage]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const res = await doctorService.listDoctors(
        offset, 
        itemsPerPage, 
        selectedDeptId, 
        undefined, 
        searchQuery || undefined
      );
      setDoctors(res.doctors);
      setTotalDoctors(res.total);
    } catch (err) {
      showToast('Failed to load doctor profiles.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.listDepartments(0, 100);
      setDepartments(res.departments);
      if (res.departments.length > 0 && departmentId === 0) {
        setDepartmentId(res.departments[0].id);
      }
    } catch (err) {
      console.error('Failed to load departments list:', err);
    }
  };

  const handleSearchSubmit = () => {
    setCurrentPage(1);
    fetchDoctors();
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  // ----------------------------------------------------------------------------
  // PATIENT: BOOK APPOINTMENT SUBMIT
  // ----------------------------------------------------------------------------
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!bookingDoctor) return;
    if (!bookingDate || !bookingTime) {
      setBookingError('Please select both date and time slot.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      await appointmentService.bookAppointment({
        doctor_id: bookingDoctor.id,
        appointment_date: bookingDate,
        appointment_time: bookingTime,
        reason: bookingReason || undefined
      });
      
      showToast(`Appointment booked successfully with ${bookingDoctor.full_name}.`, 'success');
      
      // Reset inputs & close
      setBookingDate('');
      setBookingTime('');
      setBookingReason('');
      setBookingDoctor(null);
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Booking failed. Please try again.';
      setBookingError(apiErr);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // ADMIN: OPEN CREATE/EDIT DIALOGS
  // ----------------------------------------------------------------------------
  const openCreateModal = () => {
    setFullName('');
    if (departments.length > 0) setDepartmentId(departments[0].id);
    setQualification('');
    setExperienceYears(0);
    setEmail('');
    setPhone('');
    setBio('');
    setConsultationFee('');
    setAvailableDays('');
    setAdminFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFullName(doctor.full_name);
    setDepartmentId(doctor.department_id);
    setQualification(doctor.qualification || '');
    setExperienceYears(doctor.experience_years || 0);
    setEmail(doctor.email || '');
    setPhone(doctor.phone || '');
    setBio(doctor.bio || '');
    setConsultationFee(doctor.consultation_fee || '');
    setAvailableDays(doctor.available_days || '');
    setAdminFormError(null);
  };

  // ----------------------------------------------------------------------------
  // ADMIN: SUBMIT CREATE / EDIT
  // ----------------------------------------------------------------------------
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError(null);

    const selectedDept = departments.find((d) => d.id === departmentId);
    const deptName = selectedDept ? selectedDept.name : '';

    const docInput: DoctorInput = {
      full_name: fullName,
      specialization: deptName,
      department_id: departmentId,
      qualification: qualification || null,
      experience_years: experienceYears || null,
      email: email || null,
      phone: phone || null,
      bio: bio || null,
      consultation_fee: consultationFee || null,
      available_days: availableDays || null
    };

    setIsSubmitLoading(true);
    try {
      if (editingDoctor) {
        // Edit flow
        const updated = await doctorService.updateDoctor(editingDoctor.id, docInput);
        setDoctors((prev) => prev.map((d) => (d.id === editingDoctor.id ? updated : d)));
        showToast(`Dr. ${fullName} profile updated successfully.`, 'success');
        setEditingDoctor(null);
      } else {
        // Create flow
        const created = await doctorService.createDoctor(docInput);
        if (doctors.length < itemsPerPage) {
          setDoctors((prev) => [...prev, created]);
        }
        setTotalDoctors((prev) => prev + 1);
        showToast(`Dr. ${fullName} added successfully.`, 'success');
        setIsCreateModalOpen(false);
      }
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Failed to save doctor details.';
      setAdminFormError(apiErr);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // ADMIN: DELETE DOCTOR
  // ----------------------------------------------------------------------------
  const handleDeleteDoctor = async () => {
    if (deletingDoctorId === null) return;
    setIsSubmitLoading(true);
    try {
      await doctorService.deleteDoctor(deletingDoctorId);
      setDoctors((prev) => prev.filter((d) => d.id !== deletingDoctorId));
      setTotalDoctors((prev) => Math.max(0, prev - 1));
      showToast('Doctor deleted successfully.', 'success');
    } catch (err) {
      showToast('Failed to delete doctor.', 'error');
    } finally {
      setIsSubmitLoading(false);
      setDeletingDoctorId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Doctors Directory</h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Search specialized medical practitioners, inspect profiles, and book slot timings.
          </p>
        </div>
        
        {/* Admin Add Doctor button */}
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors"
          >
            <Plus size={16} />
            <span>Add Doctor Profile</span>
          </button>
        )}
      </div>

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        
        {/* Search Input */}
        <div className="w-full md:w-auto flex-1 max-w-md">
          <div className="flex space-x-2 w-full">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearchSubmit}
              placeholder="Search by doctor name or specialization..."
            />
            <button
              onClick={handleSearchSubmit}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Department filter selection */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 hidden sm:block" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:block">Unit:</span>
          <select
            value={selectedDeptId || ''}
            onChange={(e) => {
              setSelectedDeptId(e.target.value ? Number(e.target.value) : undefined);
              setCurrentPage(1);
            }}
            className="w-full md:w-48 bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 rounded-xl outline-none hover:border-slate-300 focus:border-emerald-500 shadow-inner"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* DIRECTORY GRID VIEW */}
      {isLoading ? (
        <LoadingSpinner message="Searching medical practitioners..." />
      ) : doctors.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full"><Award size={36} /></div>
          <div className="max-w-xs">
            <h4 className="font-bold text-slate-700 text-sm">No profiles found</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              No doctors matched your search criteria. Try modifying your filters or search query.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                
                {/* Header (Initials Badge + Name/Specialization) */}
                <div className="flex items-start space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 shadow-inner">
                    Dr
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-base truncate leading-snug">{doctor.full_name}</h3>
                    <p className="text-xs text-emerald-600 font-bold tracking-wide uppercase mt-0.5">{doctor.specialization}</p>
                  </div>
                </div>

                {/* Qualification & Experience */}
                <div className="space-y-2 border-t border-b border-slate-50 py-3.5 text-xs text-slate-500 font-medium">
                  {doctor.qualification && (
                    <div className="flex items-center space-x-2">
                      <GraduationCap size={15} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{doctor.qualification}</span>
                    </div>
                  )}
                  {doctor.experience_years !== null && (
                    <div className="flex items-center space-x-2">
                      <Award size={15} className="text-slate-400 flex-shrink-0" />
                      <span>{doctor.experience_years} Years Experience</span>
                    </div>
                  )}
                  {doctor.consultation_fee && (
                    <div className="flex items-center space-x-2 font-semibold text-slate-700">
                      <DollarSign size={15} className="text-slate-400 flex-shrink-0" />
                      <span>Fee: {doctor.consultation_fee} INR</span>
                    </div>
                  )}
                </div>

                {/* Bio Description */}
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                  {doctor.bio || 'Professional profile credentials logged. Standard medical treatments applied.'}
                </p>

                {/* Availability info */}
                {doctor.available_days && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col space-y-1 text-xs">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Consultation Days</span>
                    <span className="font-bold text-slate-700 truncate">{doctor.available_days}</span>
                  </div>
                )}

              </div>

              {/* Action Buttons (Footer of Card) */}
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 justify-end">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => openEditModal(doctor)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-50 border border-slate-100 transition-colors"
                      title="Edit doctor profile"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingDoctorId(doctor.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 transition-colors"
                      title="Remove doctor profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login');
                      } else {
                        setBookingDoctor(doctor);
                      }
                    }}
                    className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md shadow-emerald-50 transition-colors"
                  >
                    <Calendar size={13} />
                    <span>Book Timings</span>
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      <Pagination
        totalItems={totalDoctors}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* MODAL: SCHEDULING / APPOINTMENT BOOKING FORM (PATIENT) */}
      <Modal
        isOpen={bookingDoctor !== null}
        onClose={() => setBookingDoctor(null)}
        title={bookingDoctor ? `Book Appointment with ${bookingDoctor.full_name}` : ''}
        size="sm"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          
          {bookingError && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{bookingError}</span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Selected Practitioner</span>
            <div className="flex justify-between items-center text-slate-800 font-bold">
              <span>{bookingDoctor?.full_name}</span>
              <span className="text-emerald-500 text-[10px]">{bookingDoctor?.specialization}</span>
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Preferred Date</label>
            <div className="relative flex items-center">
              <Calendar size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Block historical dates
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 shadow-sm transition-all"
                required
              />
            </div>
          </div>

          {/* Time slot picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Time Slot</label>
            <div className="relative flex items-center">
              <Clock size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
              <select
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
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

          {/* Complaint Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Reason for Appointment</label>
            <textarea
              value={bookingReason}
              onChange={(e) => setBookingReason(e.target.value)}
              placeholder="Briefly describe your symptoms or reason for visit..."
              rows={3}
              className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none hover:border-slate-300 focus:border-emerald-500 shadow-sm transition-all resize-none"
            />
          </div>

          {/* Dialog Action Controls */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setBookingDoctor(null)}
              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-sm border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="flex-1 flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
            >
              {isSubmitLoading && <Loader2 size={16} className="animate-spin" />}
              <span>Schedule Booking</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* MODAL: ADMIN CREATE / EDIT DOCTOR PROFILE FORM */}
      <Modal
        isOpen={isCreateModalOpen || editingDoctor !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDoctor(null);
        }}
        title={editingDoctor ? `Edit Dr. ${fullName}` : 'Add New Doctor Profile'}
        size="md"
      >
        <form onSubmit={handleSaveDoctor} className="space-y-4">
          
          {adminFormError && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{adminFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Jane Doe"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
                required
              />
            </div>

            {/* Department Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hospital Department *</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
                required
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consultation Fee */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Consultation Fee (INR)</label>
              <input
                type="text"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="500"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Experience Years */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Years of Experience</label>
              <input
                type="number"
                value={experienceYears || ''}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                placeholder="10"
                min={0}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Qualification */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Academic Qualifications</label>
            <input
              type="text"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="MBBS, MD Cardiology"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.jdoe@hospital.com"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0102"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Available Consultation Days */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Available Working Days</label>
            <input
              type="text"
              value={availableDays}
              onChange={(e) => setAvailableDays(e.target.value)}
              placeholder="Monday, Wednesday, Friday"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Bio profile */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Doctor Biography</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Detailed description of professional background and specialty services..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingDoctor(null);
              }}
              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-sm border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="flex-1 flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
            >
              {isSubmitLoading && <Loader2 size={16} className="animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* CONFIRMATION FOR DELETION (ADMIN ONLY) */}
      <ConfirmDialog
        isOpen={deletingDoctorId !== null}
        onClose={() => setDeletingDoctorId(null)}
        onConfirm={handleDeleteDoctor}
        isLoading={isSubmitLoading}
        isDanger
        title="Remove Doctor Profile"
        message="Are you sure you want to permanently remove this doctor from the hospital directories? All associated appointments will cascade delete."
        confirmLabel="Delete Doctor Profile"
      />

      {/* TOAST ALERTS */}
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
export default DoctorsPage;
