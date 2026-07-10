# ==============================================================================
# Hospital Information Assistance — User Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This service handles all user profile management operations.
#   While auth_service.py handles login/register, this service handles
#   everything that happens AFTER the user is already authenticated:
#     - Getting user profiles
#     - Updating profile information
#     - Changing passwords
#     - Listing all users (admin feature)
#     - Deactivating accounts
#
# CLEAN ARCHITECTURE RULE:
#   Routers call services. Services talk to the database.
#   Routers should contain NO business logic — only call service methods.
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from typing import Optional

from app.models.user import User, UserRole
from app.schemas.user import UserUpdate, UserPasswordChange, UserResponse, UserListResponse
from app.core.hashing import hash_password, verify_password


# ==============================================================================
# USER SERVICE CLASS
# ==============================================================================
class UserService:

    # --------------------------------------------------------------------------
    # GET CURRENT USER PROFILE
    # WHY: Provides the "GET /users/me" endpoint functionality.
    #      Returns the logged-in user's own profile data.
    # WHAT: Returns the User object passed in from the dependency.
    #       (The user is already loaded by the get_current_user dependency.)
    # INPUT:
    #   - current_user: User → the authenticated user (from dependency injection)
    # OUTPUT: UserResponse with the user's profile data
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_my_profile(current_user: User) -> UserResponse:
        """
        Returns the currently logged-in user's profile.
        The user is already loaded by the get_current_user dependency,
        so this method simply wraps it in the response schema.

        Args:
            current_user: The authenticated User object from the dependency.

        Returns:
            UserResponse containing the user's profile data (no password).
        """

        # The user object is already loaded — just return it
        # Pydantic's from_attributes=True will convert the SQLAlchemy object
        return UserResponse.model_validate(current_user)

    # --------------------------------------------------------------------------
    # UPDATE USER PROFILE
    # WHY: Allows users to update their own name or email address.
    # WHAT: Applies partial updates to the user's profile.
    #       Only the fields provided in user_data will be updated.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - current_user: User → the authenticated user to update
    #   - user_data: UserUpdate → fields to update (all optional)
    # OUTPUT: Updated UserResponse
    #         Raises HTTP 409 if the new email is already taken by another user
    # --------------------------------------------------------------------------
    @staticmethod
    async def update_my_profile(
        db: AsyncSession,
        current_user: User,
        user_data: UserUpdate
    ) -> UserResponse:
        """
        Updates the currently logged-in user's profile information.
        Only updates fields that are explicitly provided (partial update).

        Args:
            db: Async database session.
            current_user: The authenticated User object to update.
            user_data: Validated update data — only provided fields are updated.

        Returns:
            UserResponse with the updated profile data.

        Raises:
            HTTPException 409: If the new email is already used by another account.
        """

        # Check if a new email was provided
        if user_data.email is not None:
            # Check that the new email isn't already taken by ANOTHER user
            # (exclude the current user's own email from the check)
            result = await db.execute(
                select(User).where(
                    User.email == user_data.email,
                    User.id != current_user.id  # Exclude the current user
                )
            )
            email_owner = result.scalar_one_or_none()

            if email_owner is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{user_data.email}' is already registered to another account."
                )

            # Update the email
            current_user.email = user_data.email

        # Update full_name if provided
        if user_data.full_name is not None:
            current_user.full_name = user_data.full_name

        # Flush changes to the database
        # (The get_db dependency will commit them at the end of the request)
        await db.flush()
        await db.refresh(current_user)  # Reload to get updated timestamps

        return UserResponse.model_validate(current_user)

    # --------------------------------------------------------------------------
    # CHANGE PASSWORD
    # WHY: Allows users to update their own password securely.
    #      Requires the current password to confirm identity before changing.
    # WHAT: Verifies the current password, then saves the new hashed password.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - current_user: User → the authenticated user
    #   - password_data: UserPasswordChange → old + new + confirm passwords
    # OUTPUT: Dict with success message
    #         Raises HTTP 400 if current password is wrong
    # --------------------------------------------------------------------------
    @staticmethod
    async def change_password(
        db: AsyncSession,
        current_user: User,
        password_data: UserPasswordChange
    ) -> dict:
        """
        Changes the user's password after verifying the current one.

        Steps:
        1. Verify the current password is correct
        2. Hash the new password
        3. Save the new hash to the database

        Args:
            db: Async database session.
            current_user: The authenticated User object.
            password_data: Current password + new password + confirm.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 400: If the current password is incorrect.
        """

        # Step 1: Verify the current password before allowing the change
        # This prevents someone who finds a logged-in browser from changing the password
        is_correct = verify_password(
            plain_password=password_data.current_password,
            hashed_password=current_user.hashed_password
        )

        if not is_correct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect. Please try again."
            )

        # Step 2: Hash the new password
        new_hashed = hash_password(password_data.new_password)

        # Step 3: Update the hashed_password in the database
        current_user.hashed_password = new_hashed
        await db.flush()

        return {"message": "Password changed successfully."}

    # --------------------------------------------------------------------------
    # GET ALL USERS (ADMIN ONLY)
    # WHY: Allows admins to view and manage all registered user accounts.
    # WHAT: Returns a paginated list of all users in the database.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - skip: int → number of records to skip (pagination offset)
    #   - limit: int → max records to return per page
    #   - role: Optional[UserRole] → filter by role (optional)
    # OUTPUT: UserListResponse with total count and list of users
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_all_users(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 10,
        role: Optional[UserRole] = None
    ) -> UserListResponse:
        """
        Returns a paginated list of all users (admin only).
        Optionally filters by user role.

        Args:
            db: Async database session.
            skip: Number of records to skip (for pagination).
            limit: Max number of records to return.
            role: Optional role filter ("admin" or "patient").

        Returns:
            UserListResponse with total count and list of user profiles.
        """

        # Build the base query
        query = select(User)

        # Apply optional role filter if provided
        if role is not None:
            query = query.where(User.role == role)

        # Get total count (for pagination metadata)
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        # Apply pagination and fetch results
        result = await db.execute(
            query.offset(skip).limit(limit).order_by(User.created_at.desc())
        )
        users = result.scalars().all()

        return UserListResponse(
            total=total,
            users=[UserResponse.model_validate(u) for u in users]
        )

    # --------------------------------------------------------------------------
    # GET USER BY ID (ADMIN ONLY)
    # WHY: Allows admins to view a specific user's profile by their ID.
    # WHAT: Fetches a user by their primary key.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - user_id: int → the target user's database ID
    # OUTPUT: UserResponse with the user's profile
    #         Raises HTTP 404 if the user doesn't exist
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: int
    ) -> UserResponse:
        """
        Fetches a specific user by their ID (admin access).

        Args:
            db: Async database session.
            user_id: The database ID of the user to fetch.

        Returns:
            UserResponse with the user's profile data.

        Raises:
            HTTPException 404: If no user with that ID exists.
        """

        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        return UserResponse.model_validate(user)

    # --------------------------------------------------------------------------
    # DEACTIVATE USER (ADMIN ONLY — SOFT DELETE)
    # WHY: Instead of permanently deleting user accounts (which could break
    #      foreign key references in appointments, chat sessions, etc.),
    #      we "soft delete" by setting is_active=False.
    #      The user can no longer log in, but their data is preserved.
    # WHAT: Sets a user's is_active flag to False.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - user_id: int → the ID of the user to deactivate
    #   - admin_user: User → the admin performing the action
    # OUTPUT: Dict with success message
    #         Raises HTTP 404 if user not found
    #         Raises HTTP 400 if trying to deactivate yourself
    # --------------------------------------------------------------------------
    @staticmethod
    async def deactivate_user(
        db: AsyncSession,
        user_id: int,
        admin_user: User
    ) -> dict:
        """
        Deactivates a user account (soft delete).
        The user can no longer log in, but their data remains in the database.

        Args:
            db: Async database session.
            user_id: ID of the user to deactivate.
            admin_user: The admin User performing this action.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 400: If the admin tries to deactivate their own account.
            HTTPException 404: If the target user is not found.
        """

        # Safety check: prevent admin from deactivating their own account
        if user_id == admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account."
            )

        # Find the user to deactivate
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        # Soft delete — set is_active to False
        user.is_active = False
        await db.flush()

        return {"message": f"User '{user.full_name}' has been deactivated successfully."}

    # --------------------------------------------------------------------------
    # REACTIVATE USER (ADMIN ONLY)
    # WHY: Allows admins to re-enable a previously deactivated account.
    # WHAT: Sets a user's is_active flag back to True.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - user_id: int → the ID of the user to reactivate
    # OUTPUT: Dict with success message
    # --------------------------------------------------------------------------
    @staticmethod
    async def reactivate_user(
        db: AsyncSession,
        user_id: int
    ) -> dict:
        """
        Reactivates a previously deactivated user account.

        Args:
            db: Async database session.
            user_id: ID of the user to reactivate.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 404: If the user is not found.
        """

        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        user.is_active = True
        await db.flush()

        return {"message": f"User '{user.full_name}' has been reactivated successfully."}
