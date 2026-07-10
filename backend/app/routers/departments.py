# ==============================================================================
# Hospital Information Assistance — Departments Router
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines all HTTP endpoints for hospital department management.
#   Departments are PUBLIC data — anyone can list and view departments.
#   Creating, updating, and deleting departments is restricted to admins.
#
# ENDPOINTS:
#   GET    /departments              → List all departments (public)
#   POST   /departments              → Create a department (admin only)
#   GET    /departments/{dept_id}    → Get department detail with doctors (public)
#   PUT    /departments/{dept_id}    → Update a department (admin only)
#   DELETE /departments/{dept_id}    → Delete a department (admin only)
# ==============================================================================

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_admin, get_pagination_params
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentListResponse,
    DepartmentDetailResponse
)
from app.services.department_service import DepartmentService


# Create the router
router = APIRouter()


# ==============================================================================
# LIST ALL DEPARTMENTS
# Method: GET
# Path:   /departments
# Access: PUBLIC (no authentication required)
# ==============================================================================
@router.get(
    "/",
    response_model=DepartmentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all hospital departments",
    description="""
    Returns a paginated list of all hospital departments.
    Each department includes a doctor_count showing how many doctors it has.

    This endpoint is public — no authentication required.

    Supports:
    - Pagination with skip and limit
    - Name search filter
    """
)
async def list_departments(
    search: Optional[str] = Query(
        default=None,
        description="Search departments by name (case-insensitive partial match)",
        examples=["cardio"]
    ),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db)
) -> DepartmentListResponse:
    """
    List all hospital departments with pagination and optional search.

    Query Parameters:
    - skip: Pagination offset (default: 0)
    - limit: Max records per page (default: 10, max: 100)
    - search: Optional name search (e.g., "cardio" matches "Cardiology")

    Returns:
    - total: Total number of matching departments
    - departments: List of department objects with doctor_count
    """
    return await DepartmentService.get_all_departments(
        db=db,
        skip=pagination["skip"],
        limit=pagination["limit"],
        search=search
    )


# ==============================================================================
# CREATE DEPARTMENT (ADMIN ONLY)
# Method: POST
# Path:   /departments
# Access: Admin only
# ==============================================================================
@router.post(
    "/",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new hospital department (admin only)",
    description="""
    Creates a new hospital department.
    The department name must be unique.
    Admin access required.
    """
)
async def create_department(
    dept_data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> DepartmentResponse:
    """
    Create a new hospital department.

    Authentication Required: Admin only

    Request Body:
    - name: Department name (required, must be unique)
    - description: Optional description of services
    - location: Optional physical location in the hospital
    - phone: Optional contact phone number

    Returns:
    - The newly created department (doctor_count will be 0)

    Errors:
    - 409 Conflict: Department with that name already exists
    """
    return await DepartmentService.create_department(db=db, dept_data=dept_data)


# ==============================================================================
# GET DEPARTMENT DETAIL
# Method: GET
# Path:   /departments/{dept_id}
# Access: PUBLIC (no authentication required)
# ==============================================================================
@router.get(
    "/{dept_id}",
    response_model=DepartmentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a department's full details including its doctors",
    description="""
    Returns the full profile of a specific department, including:
    - All department information (name, description, location, phone)
    - A complete list of all doctors in this department
    - Total doctor count

    This endpoint is public — no authentication required.
    Useful for the department detail page and the AI chatbot context.
    """
)
async def get_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db)
) -> DepartmentDetailResponse:
    """
    Get a specific department by ID with its full doctor list.

    Path Parameters:
    - dept_id: The database ID of the department

    Returns:
    - Full department profile
    - List of all doctors in this department
    - Total doctor count

    Errors:
    - 404 Not Found: Department with that ID does not exist
    """
    return await DepartmentService.get_department_by_id(db=db, dept_id=dept_id)


# ==============================================================================
# UPDATE DEPARTMENT (ADMIN ONLY)
# Method: PUT
# Path:   /departments/{dept_id}
# Access: Admin only
# ==============================================================================
@router.put(
    "/{dept_id}",
    response_model=DepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a department's information (admin only)",
    description="""
    Partially updates a department's information.
    Only include the fields you want to change — all fields are optional.
    Admin access required.
    """
)
async def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> DepartmentResponse:
    """
    Update a department's information (partial update).

    Authentication Required: Admin only

    Path Parameters:
    - dept_id: ID of the department to update

    Request Body (all optional):
    - name: New department name (must be unique)
    - description: Updated description
    - location: Updated physical location
    - phone: Updated contact phone

    Returns:
    - Updated department with fresh doctor_count

    Errors:
    - 404 Not Found: Department not found
    - 409 Conflict: New name conflicts with another department
    """
    return await DepartmentService.update_department(
        db=db,
        dept_id=dept_id,
        dept_data=dept_data
    )


# ==============================================================================
# DELETE DEPARTMENT (ADMIN ONLY)
# Method: DELETE
# Path:   /departments/{dept_id}
# Access: Admin only
# ==============================================================================
@router.delete(
    "/{dept_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a department (admin only)",
    description="""
    Permanently deletes a hospital department.

    **WARNING**: This will also delete ALL doctors in this department
    due to the CASCADE delete constraint. This action cannot be undone.

    Admin access required.
    """
)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> dict:
    """
    Delete a department and all its doctors (CASCADE).

    Authentication Required: Admin only

    Path Parameters:
    - dept_id: ID of the department to delete

    Returns:
    - message: Confirmation with department name

    Errors:
    - 404 Not Found: Department not found

    WARNING: All doctors in this department will also be deleted!
    """
    return await DepartmentService.delete_department(db=db, dept_id=dept_id)
