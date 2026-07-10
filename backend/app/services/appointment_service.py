# ==============================================================================
# Hospital Information Assistance — Appointment Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Contains all business logic for appointment booking and management.
#   Appointments are the core transaction of the hospital system —
#   linking patients (users) to doctors on a specific date and time.
#
# OPERATIONS:
#   - book_appointment()          → Patient books a new appointment
#   - get_my_appointments()       → Patient views their own appointments
#   - get_all_appointments()      → Admin views all appointments (with filters)
#   - get_appointment_by_id()     → Get a single appointment (with access check)
#   - update_appointment()        → Patient reschedules their appointment
#   - update_appointment_status() → Admin/doctor changes the appointment status
#   - cancel_appointment()        → Patient cancels their appointment
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from typing import Optional

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentStatusUpdate,
    AppointmentResponse,
    AppointmentListResponse,
    PatientBrief,
    DoctorBrief
)


# ==============================================================================
# APPOINTMENT SERVICE CLASS
# ==============================================================================
class AppointmentService:

    # --------------------------------------------------------------------------
    # HELPER: BUILD APPOINTMENT RESPONSE
    # WHY: Building the response object with nested user and doctor briefs
    #      is the same logic in multiple methods — extract it as a helper.
    # WHAT: Converts a SQLAlchemy Appointment object into an AppointmentResponse.
    # INPUT:  appointment → SQLAlchemy Appointment object (with user & doctor loaded)
    # OUTPUT: AppointmentResponse with nested patient and doctor briefs
    # --------------------------------------------------------------------------
    @staticmethod
    def _build_response(appointment: Appointment) -> AppointmentResponse:
        """
        Helper to build an AppointmentResponse from a SQLAlchemy object.
        Includes brief nested user (patient) and doctor info.

        Args:
            appointment: SQLAlchemy Appointment object with user+doctor loaded.

        Returns:
            AppointmentResponse with all fields populated.
        """

        # Build the patient brief (if user is loaded)
        patient_brief = None
        if appointment.user:
            patient_brief = PatientBrief(
                id=appointment.user.id,
                full_name=appointment.user.full_name,
                email=appointment.user.email
            )

        # Build the doctor brief (if doctor is loaded)
        doctor_brief = None
        if appointment.doctor:
            doctor_brief = DoctorBrief(
                id=appointment.doctor.id,
                full_name=appointment.doctor.full_name,
                specialization=appointment.doctor.specialization
            )

        return AppointmentResponse(
            id=appointment.id,
            user_id=appointment.user_id,
            doctor_id=appointment.doctor_id,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            status=appointment.status,
            reason=appointment.reason,
            notes=appointment.notes,
            user=patient_brief,
            doctor=doctor_brief,
            created_at=appointment.created_at,
            updated_at=appointment.updated_at
        )

    # --------------------------------------------------------------------------
    # BOOK APPOINTMENT
    # WHY: Allows a logged-in patient to book a new appointment with a doctor.
    # WHAT: Validates the doctor exists, then creates the appointment record.
    #       The user_id is taken from the authenticated user — not from request.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - appt_data: AppointmentCreate → validated booking data
    #   - current_user: User → the logged-in patient (from JWT dependency)
    # OUTPUT: AppointmentResponse for the new appointment
    #         Raises HTTP 404 if the doctor is not found
    # --------------------------------------------------------------------------
    @staticmethod
    async def book_appointment(
        db: AsyncSession,
        appt_data: AppointmentCreate,
        current_user: User
    ) -> AppointmentResponse:
        """
        Books a new appointment for the current user with the specified doctor.

        Steps:
        1. Verify the doctor exists
        2. Create the appointment (status = pending by default)
        3. Return the appointment with nested patient and doctor info

        Args:
            db: Async database session.
            appt_data: Validated appointment data (doctor_id, date, time, reason).
            current_user: The logged-in User (patient) from JWT dependency.

        Returns:
            AppointmentResponse for the newly created appointment.

        Raises:
            HTTPException 404: If the specified doctor does not exist.
        """

        # Step 1: Verify the doctor exists
        doctor_result = await db.execute(
            select(Doctor).where(Doctor.id == appt_data.doctor_id)
        )
        doctor = doctor_result.scalar_one_or_none()

        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with ID {appt_data.doctor_id} not found."
            )

        # Step 2: Create the new appointment
        # user_id is always the logged-in user — patients cannot book for others
        new_appointment = Appointment(
            user_id=current_user.id,               # Always the current user
            doctor_id=appt_data.doctor_id,
            appointment_date=appt_data.appointment_date,
            appointment_time=appt_data.appointment_time,
            status=AppointmentStatus.pending,       # Always starts as pending
            reason=appt_data.reason
        )

        db.add(new_appointment)
        await db.flush()

        # Reload appointment with user + doctor relationships for response
        result = await db.execute(
            select(Appointment)
            .where(Appointment.id == new_appointment.id)
            .options(
                selectinload(Appointment.user),
                selectinload(Appointment.doctor)
            )
        )
        appointment = result.scalar_one()

        return AppointmentService._build_response(appointment)

    # --------------------------------------------------------------------------
    # GET MY APPOINTMENTS (PATIENT)
    # WHY: Allows patients to view only their own appointment history.
    # WHAT: Queries appointments filtered by the current user's ID.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - current_user: User → the logged-in patient
    #   - skip: int → pagination offset
    #   - limit: int → max records per page
    #   - status_filter: Optional[AppointmentStatus] → filter by status
    # OUTPUT: AppointmentListResponse with the patient's appointments
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_my_appointments(
        db: AsyncSession,
        current_user: User,
        skip: int = 0,
        limit: int = 10,
        status_filter: Optional[AppointmentStatus] = None
    ) -> AppointmentListResponse:
        """
        Returns all appointments belonging to the logged-in patient.

        Args:
            db: Async database session.
            current_user: The logged-in User (patient).
            skip: Pagination offset.
            limit: Max records per page.
            status_filter: Optional filter by appointment status.

        Returns:
            AppointmentListResponse with total count and appointments.
        """

        # Build query filtered to only this user's appointments
        query = (
            select(Appointment)
            .where(Appointment.user_id == current_user.id)
            .options(
                selectinload(Appointment.user),
                selectinload(Appointment.doctor)
            )
        )

        # Apply status filter if provided
        if status_filter is not None:
            query = query.where(Appointment.status == status_filter)

        # Count total matching appointments
        count_result = await db.execute(
            select(func.count()).select_from(
                select(Appointment)
                .where(Appointment.user_id == current_user.id)
                .where(
                    Appointment.status == status_filter
                    if status_filter else True
                )
                .subquery()
            )
        )
        total = count_result.scalar_one()

        # Fetch paginated results, newest first
        result = await db.execute(
            query.offset(skip).limit(limit).order_by(Appointment.created_at.desc())
        )
        appointments = result.scalars().all()

        return AppointmentListResponse(
            total=total,
            appointments=[AppointmentService._build_response(a) for a in appointments]
        )

    # --------------------------------------------------------------------------
    # GET ALL APPOINTMENTS (ADMIN)
    # WHY: Allows admins to view and manage all appointments in the system.
    # WHAT: Returns paginated appointments with optional filters.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - skip, limit: pagination
    #   - doctor_id: filter by doctor
    #   - user_id: filter by patient
    #   - status_filter: filter by status
    # OUTPUT: AppointmentListResponse with all appointments
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_all_appointments(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10,
        doctor_id: Optional[int] = None,
        user_id: Optional[int] = None,
        status_filter: Optional[AppointmentStatus] = None
    ) -> AppointmentListResponse:
        """
        Returns all appointments in the system (admin only).
        Supports filtering by doctor, patient, and status.

        Args:
            db: Async database session.
            skip: Pagination offset.
            limit: Max records per page.
            doctor_id: Optional filter by doctor ID.
            user_id: Optional filter by patient (user) ID.
            status_filter: Optional filter by appointment status.

        Returns:
            AppointmentListResponse with total and filtered appointments.
        """

        # Build base query with eager loading
        query = select(Appointment).options(
            selectinload(Appointment.user),
            selectinload(Appointment.doctor)
        )

        # Apply filters
        if doctor_id is not None:
            query = query.where(Appointment.doctor_id == doctor_id)
        if user_id is not None:
            query = query.where(Appointment.user_id == user_id)
        if status_filter is not None:
            query = query.where(Appointment.status == status_filter)

        # Count total matching records
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        # Fetch paginated results
        result = await db.execute(
            query.offset(skip).limit(limit).order_by(Appointment.created_at.desc())
        )
        appointments = result.scalars().all()

        return AppointmentListResponse(
            total=total,
            appointments=[AppointmentService._build_response(a) for a in appointments]
        )

    # --------------------------------------------------------------------------
    # GET APPOINTMENT BY ID
    # WHY: Returns a single appointment's full details.
    #      Patients can only see their own appointments.
    #      Admins can see any appointment.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - appt_id: int → appointment primary key
    #   - current_user: User → the requesting user (for access check)
    # OUTPUT: AppointmentResponse
    #         Raises HTTP 404 if not found
    #         Raises HTTP 403 if patient tries to access someone else's appointment
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_appointment_by_id(
        db: AsyncSession,
        appt_id: int,
        current_user: User
    ) -> AppointmentResponse:
        """
        Returns a single appointment by ID.
        Patients can only access their own appointments.
        Admins can access any appointment.

        Args:
            db: Async database session.
            appt_id: The appointment database ID.
            current_user: The requesting user for access control.

        Returns:
            AppointmentResponse with full details.

        Raises:
            HTTPException 404: If appointment not found.
            HTTPException 403: If patient tries to access another patient's appointment.
        """

        result = await db.execute(
            select(Appointment)
            .where(Appointment.id == appt_id)
            .options(
                selectinload(Appointment.user),
                selectinload(Appointment.doctor)
            )
        )
        appointment = result.scalar_one_or_none()

        if appointment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment with ID {appt_id} not found."
            )

        # Access control: patients can only view THEIR OWN appointments
        if (current_user.role != UserRole.admin and
                appointment.user_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this appointment."
            )

        return AppointmentService._build_response(appointment)

    # --------------------------------------------------------------------------
    # UPDATE APPOINTMENT (PATIENT RESCHEDULE)
    # WHY: Allows patients to reschedule or update their appointment details.
    #      Only pending or confirmed appointments can be rescheduled.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - appt_id: int → appointment to update
    #   - appt_data: AppointmentUpdate → new date/time/reason
    #   - current_user: User → must be the appointment owner
    # OUTPUT: Updated AppointmentResponse
    # --------------------------------------------------------------------------
    @staticmethod
    async def update_appointment(
        db: AsyncSession,
        appt_id: int,
        appt_data: AppointmentUpdate,
        current_user: User
    ) -> AppointmentResponse:
        """
        Updates (reschedules) an appointment.
        Only the appointment owner (patient) can do this.
        Cannot update completed or cancelled appointments.

        Args:
            db: Async database session.
            appt_id: ID of the appointment to update.
            appt_data: Fields to update (date, time, reason, notes).
            current_user: The patient who owns the appointment.

        Returns:
            Updated AppointmentResponse.

        Raises:
            HTTPException 404: If appointment not found.
            HTTPException 403: If the user doesn't own this appointment.
            HTTPException 400: If trying to update a completed/cancelled appointment.
        """

        result = await db.execute(
            select(Appointment)
            .where(Appointment.id == appt_id)
            .options(
                selectinload(Appointment.user),
                selectinload(Appointment.doctor)
            )
        )
        appointment = result.scalar_one_or_none()

        if appointment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment with ID {appt_id} not found."
            )

        # Only the owner can update their appointment
        if appointment.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own appointments."
            )

        # Cannot update completed or cancelled appointments
        if appointment.status in [AppointmentStatus.completed, AppointmentStatus.cancelled]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update an appointment with status '{appointment.status.value}'."
            )

        # Apply updates
        if appt_data.appointment_date is not None:
            appointment.appointment_date = appt_data.appointment_date
        if appt_data.appointment_time is not None:
            appointment.appointment_time = appt_data.appointment_time
        if appt_data.reason is not None:
            appointment.reason = appt_data.reason
        if appt_data.notes is not None:
            appointment.notes = appt_data.notes

        await db.flush()
        await db.refresh(appointment)

        return AppointmentService._build_response(appointment)

    # --------------------------------------------------------------------------
    # UPDATE APPOINTMENT STATUS (ADMIN)
    # WHY: Allows admins to confirm, complete, or cancel appointments.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - appt_id: int → appointment to update
    #   - status_data: AppointmentStatusUpdate → new status + optional notes
    # OUTPUT: Updated AppointmentResponse
    # --------------------------------------------------------------------------
    @staticmethod
    async def update_appointment_status(
        db: AsyncSession,
        appt_id: int,
        status_data: AppointmentStatusUpdate
    ) -> AppointmentResponse:
        """
        Updates the status of an appointment (admin only).
        Used to confirm, complete, or cancel appointments.

        Args:
            db: Async database session.
            appt_id: ID of the appointment.
            status_data: New status + optional notes.

        Returns:
            Updated AppointmentResponse.

        Raises:
            HTTPException 404: If appointment not found.
        """

        result = await db.execute(
            select(Appointment)
            .where(Appointment.id == appt_id)
            .options(
                selectinload(Appointment.user),
                selectinload(Appointment.doctor)
            )
        )
        appointment = result.scalar_one_or_none()

        if appointment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment with ID {appt_id} not found."
            )

        # Update status and optional notes
        appointment.status = status_data.status
        if status_data.notes is not None:
            appointment.notes = status_data.notes

        await db.flush()
        await db.refresh(appointment)

        return AppointmentService._build_response(appointment)

    # --------------------------------------------------------------------------
    # CANCEL APPOINTMENT (PATIENT)
    # WHY: Allows patients to cancel their own pending/confirmed appointments.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - appt_id: int → appointment to cancel
    #   - current_user: User → must be the appointment owner
    # OUTPUT: Dict with success message
    # --------------------------------------------------------------------------
    @staticmethod
    async def cancel_appointment(
        db: AsyncSession,
        appt_id: int,
        current_user: User
    ) -> dict:
        """
        Cancels a patient's own appointment.
        Cannot cancel already-completed or already-cancelled appointments.

        Args:
            db: Async database session.
            appt_id: ID of the appointment to cancel.
            current_user: The patient requesting the cancellation.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 404: If appointment not found.
            HTTPException 403: If user doesn't own this appointment.
            HTTPException 400: If appointment is already completed or cancelled.
        """

        result = await db.execute(
            select(Appointment).where(Appointment.id == appt_id)
        )
        appointment = result.scalar_one_or_none()

        if appointment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment with ID {appt_id} not found."
            )

        # Only the appointment owner can cancel it
        if appointment.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own appointments."
            )

        # Cannot cancel a completed or already-cancelled appointment
        if appointment.status == AppointmentStatus.completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel an appointment that has already been completed."
            )
        if appointment.status == AppointmentStatus.cancelled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This appointment is already cancelled."
            )

        appointment.status = AppointmentStatus.cancelled
        await db.flush()

        return {"message": f"Appointment ID {appt_id} has been cancelled successfully."}
