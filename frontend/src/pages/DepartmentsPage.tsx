// ==============================================================================
// Hospital Information Assistance — Departments Directory Page
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the department directory page. It provides different views based on role:
//
//   PATIENT / VISITOR VIEW:
//     - Search departments by name (case-insensitive partial match)
//     - Grid of department cards (location, phone, doctor count stats)
//     - "View Details" opens a modal displaying the list of doctors in that department
//
//   ADMIN VIEW:
//     - All patient features
//     - "Add Department" button to open creation modal
//     - "Edit" and "Delete" controls on cards (cascade warnings applied)
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { departmentService, DepartmentInput } from '@/services/departmentService';
import { Department, DepartmentDetailResponse, UserRole } from '@/types';
import { 
  Plus, Activity, MapPin, Phone, MessageSquare, Trash2, Edit2, 
  Award, ArrowRight, Loader2, AlertCircle, Sparkles, Building2
} from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast, ToastType } from '@/components/Toast';

const STANDARD_DEPARTMENTS = [
  'Allergy & Immunology',
  'Anesthesiology',
  'Cardiology',
  'Cardiothoracic Surgery',
  'Critical Care Medicine (ICU)',
  'Dental & Oral Surgery',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'ENT (Otolaryngology)',
  'Gastroenterology',
  'General Medicine (Internal Medicine)',
  'General Surgery',
  'Geriatric Medicine',
  'Gynecology & Obstetrics',
  'Hematology',
  'Infectious Diseases',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Nuclear Medicine',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pathology',
  'Pediatrics',
  'Physical Medicine & Rehabilitation',
  'Physiotherapy & Rehabilitation',
  'Plastic & Reconstructive Surgery',
  'Psychiatry & Behavioral Health',
  'Pulmonology (Respiratory Medicine)',
  'Radiology & Medical Imaging',
  'Rheumatology',
  'Sports Medicine',
  'Urology'
];

export const DepartmentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalDepartments, setTotalDepartments] = useState(0);

  // Detail load states (loads list of nested doctors inside modal)
  const [detailDept, setDetailDept] = useState<DepartmentDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Query / page states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // UI Flow states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Modals controllers
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Input states (Admin Form)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [adminFormError, setAdminFormError] = useState<string | null>(null);

  // Load directories on mount and page changes
  useEffect(() => {
    fetchDepartments();
  }, [currentPage]);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const res = await departmentService.listDepartments(
        offset, 
        itemsPerPage, 
        searchQuery || undefined
      );
      setDepartments(res.departments);
      setTotalDepartments(res.total);
    } catch (err) {
      showToast('Failed to load department logs.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    setCurrentPage(1);
    fetchDepartments();
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  // ----------------------------------------------------------------------------
  // VISITOR / PATIENT: VIEW NESTED DOCTORS DETAIL MODAL
  // WHY: Calls getDepartmentById to eager-load the nested list of doctor profiles.
  // ----------------------------------------------------------------------------
  const handleViewDetail = async (deptId: number) => {
    setIsDetailLoading(true);
    try {
      const data = await departmentService.getDepartmentById(deptId);
      setDetailDept(data);
    } catch (err) {
      showToast('Failed to load department details.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // ADMIN: OPEN CREATE / EDIT MODALS
  // ----------------------------------------------------------------------------
  const openCreateModal = () => {
    setName(STANDARD_DEPARTMENTS[0]);
    setDescription('');
    setLocation('');
    setPhone('');
    setAdminFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setLocation(dept.location || '');
    setPhone(dept.phone || '');
    setAdminFormError(null);
  };

  // ----------------------------------------------------------------------------
  // ADMIN: SUBMIT SAVE (CREATE / EDIT)
  // ----------------------------------------------------------------------------
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormError(null);

    const inputData: DepartmentInput = {
      name,
      description: description || null,
      location: location || null,
      phone: phone || null,
    };

    setIsSubmitLoading(true);
    try {
      if (editingDept) {
        // Edit flow
        const updated = await departmentService.updateDepartment(editingDept.id, inputData);
        setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? updated : d)));
        showToast(`Department '${name}' updated successfully.`, 'success');
        setEditingDept(null);
      } else {
        // Create flow
        const created = await departmentService.createDepartment(inputData);
        if (departments.length < itemsPerPage) {
          setDepartments((prev) => [...prev, created]);
        }
        setTotalDepartments((prev) => prev + 1);
        showToast(`Department '${name}' created successfully.`, 'success');
        setIsCreateModalOpen(false);
      }
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Failed to save department.';
      setAdminFormError(apiErr);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // ADMIN: DELETE DEPARTMENT
  // ----------------------------------------------------------------------------
  const handleDeleteDepartment = async () => {
    if (deletingDeptId === null) return;
    setIsSubmitLoading(true);
    try {
      await departmentService.deleteDepartment(deletingDeptId);
      setDepartments((prev) => prev.filter((d) => d.id !== deletingDeptId));
      setTotalDepartments((prev) => Math.max(0, prev - 1));
      showToast('Department and all its doctors deleted successfully.', 'success');
    } catch (err) {
      showToast('Failed to delete department.', 'error');
    } finally {
      setIsSubmitLoading(false);
      setDeletingDeptId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
            {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Hospital Departments</h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Browse hospital wards, investigate specializations, and view staff practitioner lists.
          </p>
        </div>
        
        {/* Admin Add Department button */}
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors"
          >
            <Plus size={16} />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm transition-colors duration-200">
        <div className="flex space-x-2 max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearchSubmit}
            placeholder="Search departments by name..."
          />
          <button
            onClick={handleSearchSubmit}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* DIRECTORY GRID VIEW */}
      {isLoading ? (
        <LoadingSpinner message="Searching hospital units..." />
      ) : departments.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full"><Building2 size={36} /></div>
          <div className="max-w-xs">
            <h4 className="font-bold text-slate-700 dark:text-slate-205 text-sm">No departments found</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              No units matched your query search. Try modifying your name filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                
                {/* Header (Initials + Name) */}
                <div className="flex items-start space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-100 dark:border-emerald-900/35 shadow-inner">
                    <Activity size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base truncate leading-snug">{dept.name}</h3>
                    <div className="flex items-center text-xs text-slate-400 font-semibold mt-1">
                      <Award size={13} className="mr-1 text-slate-400" />
                      <span>{dept.doctor_count} Registered Doctors</span>
                    </div>
                  </div>
                </div>

                {/* Description Body */}
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                  {dept.description || 'Specialized clinical treatments logged. Continuous emergency responses and standard protocols applied.'}
                </p>

                {/* Location and Phone Contact Details */}
                <div className="space-y-2 border-t border-slate-50 dark:border-slate-800/80 pt-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {dept.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{dept.location}</span>
                    </div>
                  )}
                  {dept.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone size={15} className="text-slate-400 flex-shrink-0" />
                      <span>{dept.phone}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons (Footer of Card) */}
              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/80 flex items-center gap-2 justify-between">
                
                {/* View details (loads nested doctors) */}
                <button
                  onClick={() => handleViewDetail(dept.id)}
                  disabled={isDetailLoading}
                  className="flex items-center space-x-1 text-xs text-emerald-500 hover:text-emerald-600 font-bold transition-colors animate-pulse-subtle"
                >
                  <span>View Doctors</span>
                  <ArrowRight size={14} />
                </button>

                {isAdmin && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors"
                      title="Edit department details"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingDeptId(dept.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-100 dark:border-slate-800 transition-colors"
                      title="Remove department profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

              </div>

            </div>
          ))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      <Pagination
        totalItems={totalDepartments}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* MODAL: DETAIL / STAFF PRACTITIONERS VIEW (PATIENT / VISITOR) */}
      <Modal
        isOpen={detailDept !== null}
        onClose={() => setDetailDept(null)}
        title={detailDept ? `${detailDept.name} Department Details` : ''}
        size="md"
      >
        {detailDept && (
          <div className="space-y-6">
            
            {/* Description & Metadata Header */}
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-4.5 rounded-2xl">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Unit Profile Description</h4>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {detailDept.description || 'Specialized clinical treatments logged. Continuous emergency responses and standard protocols applied.'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 dark:border-slate-800 pt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {detailDept.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin size={15} className="text-slate-400" />
                    <span>{detailDept.location}</span>
                  </div>
                )}
                {detailDept.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone size={15} className="text-slate-400" />
                    <span>{detailDept.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Doctors Nested List inside Department */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Staff Doctors ({detailDept.doctors.length})
              </h4>
              
              {detailDept.doctors.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-semibold">
                  No practitioners currently registered inside this department.
                </div>
              ) : (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                  {detailDept.doctors.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 rounded-xl text-sm"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">{doc.full_name}</span>
                        <span className="text-xs text-slate-400 mt-0.5 block truncate font-semibold uppercase">{doc.specialization}</span>
                      </div>
                      
                      {doc.consultation_fee && (
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">{doc.consultation_fee} INR</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold">Consultation Fee</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDetailDept(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-sm"
              >
                Close View
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* MODAL: ADMIN CREATE / EDIT DEPARTMENT FORM */}
      <Modal
        isOpen={isCreateModalOpen || editingDept !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDept(null);
        }}
        title={editingDept ? `Edit Department '${name}'` : 'Add New Department'}
        size="sm"
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4">
          
          {adminFormError && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{adminFormError}</span>
            </div>
          )}

          {/* Department Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Department Name *</label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
              required
            >
              {STANDARD_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Physical Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Block A, Floor 2"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Phone Contact */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Department Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1-555-0200"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Department Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of clinical services offered by this department..."
              rows={4}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingDept(null);
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
              <span>Save Department</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* CONFIRMATION FOR DELETION (ADMIN ONLY) */}
      <ConfirmDialog
        isOpen={deletingDeptId !== null}
        onClose={() => setDeletingDeptId(null)}
        onConfirm={handleDeleteDepartment}
        isLoading={isSubmitLoading}
        isDanger
        title="Remove Department"
        message="Are you sure you want to permanently delete this department? Doing so will CASCADE and permanently delete all doctor profiles registered inside it! This action cannot be undone."
        confirmLabel="Delete Department"
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
export default DepartmentsPage;
