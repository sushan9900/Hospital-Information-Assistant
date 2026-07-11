from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin, get_pagination_params
from app.models.user import User
from app.models.appointment import AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentStatusUpdate,
    AppointmentResponse,
    AppointmentListResponse
)
from app.services.appointment_service import AppointmentService


# Create the router
router = APIRouter()



@router.post(
    "/",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book a new appointment with a doctor",
    description="""
    Books a new appointment for the currently logged-in patient.

    The user_id is automatically taken from the JWT token —
    patients cannot book appointments on behalf of other people.

    New appointments always start with status: **pending**
    (waiting for admin confirmation).
    """
)
async def book_appointment(
    appt_data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Must be logged in
) -> AppointmentResponse:
    """
    Book a new appointment with a doctor.

    Authentication Required: Any logged-in user

    Request Body:
    - doctor_id: ID of the doctor to book with (required, must exist)
    - appointment_date: Date in YYYY-MM-DD format (required)
    - appointment_time: Time slot e.g. "10:00 AM" (required)
    - reason: Reason for visit (optional)

    Returns:
    - Newly created appointment (status: pending)
    - Nested patient and doctor brief info

    Errors:
    - 404 Not Found: Doctor does not exist
    - 422 Unprocessable Entity: Invalid date format
    """
    return await AppointmentService.book_appointment(
        db=db,
        appt_data=appt_data,
        current_user=current_user
    )


@router.get(
    "/my",
    response_model=AppointmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get my appointment history",
    description="""
    Returns all appointments belonging to the currently logged-in patient.
    Supports filtering by appointment status and pagination.
    """
)
async def get_my_appointments(
    status_filter: Optional[AppointmentStatus] = Query(
        default=None,
        description="Filter by status: pending, confirmed, completed, or cancelled",
        alias="status"
    ),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AppointmentListResponse:
    """
    Get the currently logged-in patient's appointment history.

    Authentication Required: Any logged-in user

    Query Parameters:
    - skip: Pagination offset (default: 0)
    - limit: Max records per page (default: 10, max: 100)
    - status: Filter by appointment status (optional)
              Values: pending | confirmed | completed | cancelled

    Returns:
    - total: Total number of matching appointments
    - appointments: List of appointment objects (newest first)
    """
    return await AppointmentService.get_my_appointments(
        db=db,
        current_user=current_user,
        skip=pagination["skip"],
        limit=pagination["limit"],
        status_filter=status_filter
    )


@router.get(
    "/",
    response_model=AppointmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all appointments in the system (admin only)",
    description="""
    Returns a paginated list of all appointments in the system.
    Supports filtering by doctor, patient, and status.
    Admin access required.
    """
)
async def list_all_appointments(
    doctor_id: Optional[int] = Query(
        default=None,
        description="Filter by doctor ID"
    ),
    user_id: Optional[int] = Query(
        default=None,
        description="Filter by patient (user) ID"
    ),
    status_filter: Optional[AppointmentStatus] = Query(
        default=None,
        description="Filter by appointment status",
        alias="status"
    ),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> AppointmentListResponse:
    """
    Get all appointments in the system (admin view).

    Authentication Required: Admin only

    Query Parameters:
    - skip, limit: Pagination
    - doctor_id: Filter by specific doctor (optional)
    - user_id: Filter by specific patient (optional)
    - status: Filter by appointment status (optional)

    Returns:
    - total: Total matching appointments
    - appointments: List with nested patient and doctor info
    """
    return await AppointmentService.get_all_appointments(
        db=db,
        skip=pagination["skip"],
        limit=pagination["limit"],
        doctor_id=doctor_id,
        user_id=user_id,
        status_filter=status_filter
    )



@router.get(
    "/{appt_id}",
    response_model=AppointmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a specific appointment by ID",
    description="""
    Returns the full details of a specific appointment.

    Access Control:
    - Patients can only view their own appointments
    - Admins can view any appointment
    """
)
async def get_appointment(
    appt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AppointmentResponse:
    """
    Get a specific appointment by its ID.

    Authentication Required: Any logged-in user

    Path Parameters:
    - appt_id: Database ID of the appointment

    Returns:
    - Full appointment details with nested patient and doctor info

    Errors:
    - 404 Not Found: Appointment does not exist
    - 403 Forbidden: Patient trying to view someone else's appointment
    """
    return await AppointmentService.get_appointment_by_id(
        db=db,
        appt_id=appt_id,
        current_user=current_user
    )


@router.put(
    "/{appt_id}",
    response_model=AppointmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Reschedule or update an appointment",
    description="""
    Updates an appointment's date, time, or reason.
    Only the appointment owner (patient) can do this.

    Restrictions:
    - Cannot update **completed** or **cancelled** appointments
    - Cannot change the doctor or status through this endpoint
    """
)
async def update_appointment(
    appt_id: int,
    appt_data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AppointmentResponse:
    """
    Reschedule or update an appointment (patient only).

    Authentication Required: Appointment owner only

    Path Parameters:
    - appt_id: ID of the appointment to update

    Request Body (all optional):
    - appointment_date: New date (YYYY-MM-DD)
    - appointment_time: New time slot
    - reason: Updated visit reason
    - notes: Additional notes

    Returns:
    - Updated appointment details

    Errors:
    - 404 Not Found: Appointment not found
    - 403 Forbidden: Not the appointment owner
    - 400 Bad Request: Cannot update a completed/cancelled appointment
    """
    return await AppointmentService.update_appointment(
        db=db,
        appt_id=appt_id,
        appt_data=appt_data,
        current_user=current_user
    )


@router.patch(
    "/{appt_id}/status",
    response_model=AppointmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update appointment status (admin only)",
    description="""
    Changes the status of an appointment.
    Used by admins to confirm, complete, or cancel appointments.

    Status transitions:
    - pending → confirmed (admin confirms the booking)
    - confirmed → completed (appointment took place)
    - pending/confirmed → cancelled (admin cancels)
    """
)
async def update_appointment_status(
    appt_id: int,
    status_data: AppointmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> AppointmentResponse:
    """
    Update the status of an appointment (admin only).

    Authentication Required: Admin only

    Path Parameters:
    - appt_id: ID of the appointment

    Request Body:
    - status: New status (pending | confirmed | completed | cancelled)
    - notes: Optional notes about the status change

    Returns:
    - Updated appointment with new status

    Errors:
    - 404 Not Found: Appointment not found
    """
    return await AppointmentService.update_appointment_status(
        db=db,
        appt_id=appt_id,
        status_data=status_data
    )


@router.delete(
    "/{appt_id}/cancel",
    status_code=status.HTTP_200_OK,
    summary="Cancel an appointment",
    description="""
    Cancels the patient's own appointment.

    Restrictions:
    - Only the appointment owner can cancel it
    - Cannot cancel an already-completed appointment
    - Cannot cancel an already-cancelled appointment
    """
)
async def cancel_appointment(
    appt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Cancel the currently logged-in patient's appointment.

    Authentication Required: Appointment owner only

    Path Parameters:
    - appt_id: ID of the appointment to cancel

    Returns:
    - message: Confirmation message

    Errors:
    - 404 Not Found: Appointment not found
    - 403 Forbidden: Not the appointment owner
    - 400 Bad Request: Appointment is already completed or cancelled
    """
    return await AppointmentService.cancel_appointment(
        db=db,
        appt_id=appt_id,
        current_user=current_user
    )
