# ==============================================================================
# Hospital Information Assistance — Doctors Router
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines all HTTP endpoints for doctor management.
#   Doctors are PUBLIC data — anyone can browse doctor profiles.
#   Creating, updating, and deleting doctors is restricted to admins.
#
# ENDPOINTS:
#   GET    /doctors              → List all doctors with filters (public)
#   POST   /doctors              → Add a new doctor (admin only)
#   GET    /doctors/{doctor_id}  → Get a single doctor's profile (public)
#   PUT    /doctors/{doctor_id}  → Update a doctor (admin only)
#   DELETE /doctors/{doctor_id}  → Delete a doctor (admin only)
# ==============================================================================

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_admin, get_pagination_params
from app.models.user import User
from app.schemas.doctor import (
    DoctorCreate,
    DoctorUpdate,
    DoctorResponse,
    DoctorListResponse
)
from app.services.doctor_service import DoctorService


# Create the router
router = APIRouter()


# ==============================================================================
# LIST ALL DOCTORS
# Method: GET
# Path:   /doctors
# Access: PUBLIC (no authentication required)
# ==============================================================================
@router.get(
    "/",
    response_model=DoctorListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all doctors with optional filters",
    description="""
    Returns a paginated list of all doctors in the hospital.
    Each doctor includes their department information.

    This endpoint is public — no authentication required.

    Supports filtering by:
    - Department ID
    - Specialization (partial match)
    - General search across name and specialization
    """
)
async def list_doctors(
    department_id: Optional[int] = Query(
        default=None,
        description="Filter by department ID",
        examples=[1]
    ),
    specialization: Optional[str] = Query(
        default=None,
        description="Filter by specialization (case-insensitive partial match)",
        examples=["cardio"]
    ),
    search: Optional[str] = Query(
        default=None,
        description="Search across doctor name and specialization",
        examples=["sarah"]
    ),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db)
) -> DoctorListResponse:
    """
    List all doctors with optional department, specialization, and name filters.

    Query Parameters:
    - skip: Pagination offset (default: 0)
    - limit: Max records per page (default: 10, max: 100)
    - department_id: Filter by department ID (optional)
    - specialization: Partial match on specialization (optional)
    - search: Search name and specialization (optional)

    Returns:
    - total: Total number of matching doctors
    - doctors: List of doctor profiles with department info
    """
    return await DoctorService.get_all_doctors(
        db=db,
        skip=pagination["skip"],
        limit=pagination["limit"],
        department_id=department_id,
        specialization=specialization,
        search=search
    )


# ==============================================================================
# CREATE DOCTOR (ADMIN ONLY)
# Method: POST
# Path:   /doctors
# Access: Admin only
# ==============================================================================
@router.post(
    "/",
    response_model=DoctorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new doctor to the hospital (admin only)",
    description="""
    Creates a new doctor profile in the system.

    Requirements:
    - The specified department must exist
    - Email must be unique (if provided)

    Admin access required.
    """
)
async def create_doctor(
    doctor_data: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> DoctorResponse:
    """
    Add a new doctor to the hospital.

    Authentication Required: Admin only

    Request Body:
    - full_name: Doctor's full name (required)
    - specialization: Medical specialization (required)
    - department_id: ID of the department (required, must exist)
    - qualification: Academic qualifications (optional)
    - experience_years: Years of experience (optional, 0-60)
    - email: Contact email (optional, must be unique)
    - phone: Contact phone (optional)
    - bio: Biography / profile description (optional)
    - consultation_fee: Fee amount (optional)
    - available_days: Available working days (optional)

    Returns:
    - Newly created doctor profile with nested department info

    Errors:
    - 404 Not Found: Specified department does not exist
    - 409 Conflict: Doctor with that email already exists
    """
    return await DoctorService.create_doctor(db=db, doctor_data=doctor_data)


# ==============================================================================
# GET DOCTOR BY ID
# Method: GET
# Path:   /doctors/{doctor_id}
# Access: PUBLIC (no authentication required)
# ==============================================================================
@router.get(
    "/{doctor_id}",
    response_model=DoctorResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a doctor's full profile",
    description="""
    Returns the full profile of a specific doctor including their department.
    This endpoint is public — no authentication required.
    """
)
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db)
) -> DoctorResponse:
    """
    Get a specific doctor by their ID.

    Path Parameters:
    - doctor_id: The database ID of the doctor

    Returns:
    - Full doctor profile with nested department info

    Errors:
    - 404 Not Found: Doctor with that ID does not exist
    """
    return await DoctorService.get_doctor_by_id(db=db, doctor_id=doctor_id)


# ==============================================================================
# UPDATE DOCTOR (ADMIN ONLY)
# Method: PUT
# Path:   /doctors/{doctor_id}
# Access: Admin only
# ==============================================================================
@router.put(
    "/{doctor_id}",
    response_model=DoctorResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a doctor's profile (admin only)",
    description="""
    Partially updates a doctor's profile information.
    Only include the fields you want to change — all fields are optional.
    Admin access required.
    """
)
async def update_doctor(
    doctor_id: int,
    doctor_data: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> DoctorResponse:
    """
    Update a doctor's profile (partial update).

    Authentication Required: Admin only

    Path Parameters:
    - doctor_id: ID of the doctor to update

    Request Body (all optional — only send what you want to change):
    - full_name, specialization, qualification, experience_years
    - department_id (new department — must exist)
    - email, phone, bio, consultation_fee, available_days

    Returns:
    - Updated doctor profile

    Errors:
    - 404 Not Found: Doctor or new department not found
    - 409 Conflict: New email already used by another doctor
    """
    return await DoctorService.update_doctor(
        db=db,
        doctor_id=doctor_id,
        doctor_data=doctor_data
    )


# ==============================================================================
# DELETE DOCTOR (ADMIN ONLY)
# Method: DELETE
# Path:   /doctors/{doctor_id}
# Access: Admin only
# ==============================================================================
@router.delete(
    "/{doctor_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a doctor from the system (admin only)",
    description="""
    Permanently removes a doctor from the hospital system.

    **Note**: All appointments linked to this doctor will also be deleted
    due to the CASCADE delete constraint.

    Admin access required.
    """
)
async def delete_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> dict:
    """
    Delete a doctor from the system.

    Authentication Required: Admin only

    Path Parameters:
    - doctor_id: ID of the doctor to remove

    Returns:
    - message: Confirmation with doctor's name

    Errors:
    - 404 Not Found: Doctor not found

    Note: Their appointments will also be deleted (CASCADE).
    """
    return await DoctorService.delete_doctor(db=db, doctor_id=doctor_id)
