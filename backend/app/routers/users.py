# ==============================================================================
# Hospital Information Assistance — Users Router
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines all HTTP endpoints for user profile management.
#   Separate from auth.py (which handles login/register) — this file handles
#   everything that happens to a user AFTER they are already authenticated.
#
# ENDPOINTS:
#   GET    /users/me              → Get own profile
#   PUT    /users/me              → Update own profile
#   PUT    /users/me/password     → Change own password
#   GET    /users                 → List all users (admin only)
#   GET    /users/{user_id}       → Get any user by ID (admin only)
#   PATCH  /users/{user_id}/deactivate  → Deactivate user (admin only)
#   PATCH  /users/{user_id}/reactivate  → Reactivate user (admin only)
# ==============================================================================

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin, get_pagination_params
from app.models.user import User, UserRole
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserPasswordChange,
    UserListResponse
)
from app.services.user_service import UserService


# Create the router
router = APIRouter()


# ==============================================================================
# GET CURRENT USER'S PROFILE
# Method: GET
# Path:   /users/me
# Access: Protected (any logged-in user)
# ==============================================================================
@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the current user's profile",
    description="Returns the full profile of the currently logged-in user."
)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """
    Get the currently logged-in user's profile.

    Authentication Required: Yes (any role)

    Returns:
    - Full user profile without the password hash
    """
    return await UserService.get_my_profile(current_user=current_user)


# ==============================================================================
# UPDATE CURRENT USER'S PROFILE
# Method: PUT
# Path:   /users/me
# Access: Protected (any logged-in user)
# ==============================================================================
@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update the current user's profile",
    description="""
    Updates the current user's profile information.
    Only provide the fields you want to change — all fields are optional.

    Updatable fields:
    - full_name
    - email (must be unique across all accounts)
    """
)
async def update_my_profile(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """
    Update the currently logged-in user's profile.

    Request Body (all optional):
    - full_name: New display name
    - email: New email (must not be taken by another account)

    Returns:
    - Updated user profile

    Errors:
    - 409 Conflict: New email is already registered to another account
    """
    return await UserService.update_my_profile(
        db=db,
        current_user=current_user,
        user_data=user_data
    )


# ==============================================================================
# CHANGE CURRENT USER'S PASSWORD
# Method: PUT
# Path:   /users/me/password
# Access: Protected (any logged-in user)
# ==============================================================================
@router.put(
    "/me/password",
    status_code=status.HTTP_200_OK,
    summary="Change the current user's password",
    description="""
    Changes the current user's password.
    Requires the current password for security verification.
    """
)
async def change_my_password(
    password_data: UserPasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Change the currently logged-in user's password.

    Request Body:
    - current_password: Must match the current account password
    - new_password: At least 8 characters
    - confirm_new_password: Must match new_password

    Returns:
    - message: Success confirmation

    Errors:
    - 400 Bad Request: Current password is incorrect
    - 422 Unprocessable Entity: new_password and confirm do not match
    """
    return await UserService.change_password(
        db=db,
        current_user=current_user,
        password_data=password_data
    )


# ==============================================================================
# LIST ALL USERS (ADMIN ONLY)
# Method: GET
# Path:   /users
# Access: Admin only
# ==============================================================================
@router.get(
    "/",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all users (admin only)",
    description="""
    Returns a paginated list of all registered users.
    Supports filtering by role (admin or patient).
    Admin access required.
    """
)
async def list_all_users(
    role: Optional[UserRole] = Query(
        default=None,
        description="Filter by role: 'admin' or 'patient'"
    ),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> UserListResponse:
    """
    Get a paginated list of all users in the system.

    Authentication Required: Admin only

    Query Parameters:
    - skip: Pagination offset (default: 0)
    - limit: Records per page (default: 10, max: 100)
    - role: Filter by role — "admin" or "patient" (optional)

    Returns:
    - total: Total number of matching users
    - users: List of user profiles
    """
    return await UserService.get_all_users(
        db=db,
        skip=pagination["skip"],
        limit=pagination["limit"],
        role=role
    )


# ==============================================================================
# GET USER BY ID (ADMIN ONLY)
# Method: GET
# Path:   /users/{user_id}
# Access: Admin only
# ==============================================================================
@router.get(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a specific user by ID (admin only)",
    description="Fetches a specific user's profile by their database ID. Admin access required."
)
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> UserResponse:
    """
    Get a user's profile by their ID.

    Authentication Required: Admin only

    Path Parameters:
    - user_id: The database ID of the user

    Returns:
    - User profile

    Errors:
    - 404 Not Found: User with that ID does not exist
    """
    return await UserService.get_user_by_id(db=db, user_id=user_id)


# ==============================================================================
# DEACTIVATE USER (ADMIN ONLY — SOFT DELETE)
# Method: PATCH
# Path:   /users/{user_id}/deactivate
# Access: Admin only
# ==============================================================================
@router.patch(
    "/{user_id}/deactivate",
    status_code=status.HTTP_200_OK,
    summary="Deactivate a user account (admin only)",
    description="""
    Soft-deletes a user account by setting is_active=False.
    The user can no longer log in, but their data is preserved.
    Admin cannot deactivate their own account.
    """
)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> dict:
    """
    Deactivate a user account (soft delete).

    Authentication Required: Admin only

    Path Parameters:
    - user_id: ID of the user to deactivate

    Returns:
    - message: Confirmation message

    Errors:
    - 400 Bad Request: Cannot deactivate your own account
    - 404 Not Found: User not found
    """
    return await UserService.deactivate_user(
        db=db,
        user_id=user_id,
        admin_user=current_user
    )


# ==============================================================================
# REACTIVATE USER (ADMIN ONLY)
# Method: PATCH
# Path:   /users/{user_id}/reactivate
# Access: Admin only
# ==============================================================================
@router.patch(
    "/{user_id}/reactivate",
    status_code=status.HTTP_200_OK,
    summary="Reactivate a deactivated user account (admin only)",
    description="Re-enables a previously deactivated user account. Admin access required."
)
async def reactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Admin only
) -> dict:
    """
    Reactivate a deactivated user account.

    Authentication Required: Admin only

    Path Parameters:
    - user_id: ID of the user to reactivate

    Returns:
    - message: Confirmation message

    Errors:
    - 404 Not Found: User not found
    """
    return await UserService.reactivate_user(db=db, user_id=user_id)
