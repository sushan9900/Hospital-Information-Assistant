# ==============================================================================
# Hospital Information Assistance — Authentication Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file contains ALL the business logic for user authentication.
#   Following Clean Architecture, routers should NOT contain business logic —
#   they only receive requests and call services.
#
# WHAT THIS SERVICE DOES:
#   - register_user()  → Creates a new user account with a hashed password
#   - login_user()     → Verifies credentials and returns a JWT token
#   - get_user_by_id() → Fetches a user by their database ID
#   - get_user_by_email() → Fetches a user by their email address
#
# HOW TO USE:
#   from app.services.auth_service import AuthService
#   # In a router:
#   result = await AuthService.register_user(db=db, user_data=user_data)
# ==============================================================================

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import Optional

from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.schemas.auth import LoginRequest, LoginResponse, RegisterResponse, TokenData
from app.core.hashing import hash_password, verify_password, needs_rehash
from app.core.security import create_access_token, create_token_payload


# ==============================================================================
# AUTH SERVICE CLASS
# WHY: Grouping related methods in a class keeps code organized.
#      All auth-related logic lives in one place — easy to find and maintain.
# ==============================================================================
class AuthService:

    # --------------------------------------------------------------------------
    # REGISTER USER
    # WHY: Handles the full user registration process:
    #      1. Check if the email is already taken (prevent duplicates)
    #      2. Hash the password (never store plain text)
    #      3. Create and save the new user in the database
    # WHAT: Creates a new User record in the PostgreSQL database.
    # INPUT:
    #   - db: AsyncSession → database session for DB operations
    #   - user_data: UserCreate → validated registration form data (from schema)
    # OUTPUT: RegisterResponse with success message + new user data
    #         Raises HTTP 409 Conflict if email is already registered
    # --------------------------------------------------------------------------
    @staticmethod
    async def register_user(
        db: AsyncSession,
        user_data: UserCreate
    ) -> RegisterResponse:
        """
        Registers a new user account.

        Steps:
        1. Check if the email is already taken
        2. Hash the plain text password with bcrypt
        3. Create a new User record in the database
        4. Return a success response with the new user's profile

        Args:
            db: Async database session.
            user_data: Validated registration data from the request body.

        Returns:
            RegisterResponse with success message and the new user profile.

        Raises:
            HTTPException 409: If the email address is already registered.
        """

        # Step 1: Check if a user with this email already exists
        # We must do this BEFORE creating the user to prevent duplicates
        existing_user = await AuthService.get_user_by_email(db, user_data.email)

        if existing_user is not None:
            # HTTP 409 Conflict = the resource already exists
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{user_data.email}' already exists. Please log in."
            )

        # Step 2: Hash the plain text password before storing
        # NEVER save user_data.password directly — always hash it first
        # Run in worker thread to avoid blocking the single-threaded event loop
        hashed = await asyncio.to_thread(hash_password, user_data.password)

        # Step 3: Create a new User SQLAlchemy model instance
        new_user = User(
            full_name=user_data.full_name,
            email=user_data.email,
            hashed_password=hashed,           # Store the hash, not the plain password
            role=user_data.role,              # Default is "patient" from schema
            is_active=True                    # New accounts are active by default
        )

        # Step 4: Add the new user to the database session and save
        db.add(new_user)        # Stage the new record
        await db.flush()        # Push to DB to get the auto-generated ID
        await db.refresh(new_user)  # Reload the object with DB-generated fields (id, timestamps)

        # Step 5: Return success response
        return RegisterResponse(
            message="Account created successfully. Please log in.",
            user=new_user
        )

    # --------------------------------------------------------------------------
    # LOGIN USER
    # WHY: Handles the full login process:
    #      1. Find the user by email
    #      2. Verify the password against the stored hash
    #      3. Generate a JWT access token
    #      4. Return the token + user profile
    # WHAT: Authenticates a user and returns a JWT token.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - login_data: LoginRequest → email and password from the login form
    # OUTPUT: LoginResponse with JWT token + user profile
    #         Raises HTTP 401 if credentials are wrong
    # --------------------------------------------------------------------------
    @staticmethod
    async def login_user(
        db: AsyncSession,
        login_data: LoginRequest
    ) -> LoginResponse:
        """
        Authenticates a user and returns a JWT access token.

        Steps:
        1. Find the user by email
        2. Verify the submitted password against the stored hash
        3. Check that the account is active
        4. Generate a JWT access token
        5. Return the token + user profile

        Args:
            db: Async database session.
            login_data: Validated login credentials (email + password).

        Returns:
            LoginResponse with access_token, token_type, and user profile.

        Raises:
            HTTPException 401: If email not found or password is incorrect.
            HTTPException 401: If the account is deactivated.
        """

        # Step 1: Find the user by their email address
        user = await AuthService.get_user_by_email(db, login_data.email)

        # If no user found with this email, reject the login
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User does not exist.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Step 2: Verify the submitted password against the stored hash
        # verify_password returns True if they match, False otherwise
        # Run in worker thread to avoid blocking the single-threaded event loop
        password_is_correct = await asyncio.to_thread(
            verify_password,
            plain_password=login_data.password,
            hashed_password=user.hashed_password
        )

        if not password_is_correct:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Step 3: Check that the account is not deactivated
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your account has been deactivated. Please contact support.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Step 4: (Optional) Re-hash the password if it uses an old algorithm
        # This transparently upgrades passwords to the latest bcrypt settings
        if needs_rehash(user.hashed_password):
            user.hashed_password = hash_password(login_data.password)
            await db.flush()

        # Step 5: Generate a JWT access token for this user
        token_payload = create_token_payload(
            email=user.email,
            user_id=user.id,
            role=user.role.value  # Convert enum to string ("admin" or "patient")
        )
        access_token = create_access_token(data=token_payload)

        # Step 6: Return the token + user profile in the response
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user
        )

    # --------------------------------------------------------------------------
    # GET USER BY EMAIL
    # WHY: Used during login to find the user, and during registration to
    #      check if the email is already taken. A common operation reused
    #      in multiple places, so we extract it as a standalone method.
    # WHAT: Queries the database for a user with the given email.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - email: str → the email address to search for
    # OUTPUT: User object if found, None if no user with that email exists
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_user_by_email(
        db: AsyncSession,
        email: str
    ) -> Optional[User]:
        """
        Finds a user by their email address.

        Args:
            db: Async database session.
            email: The email address to search for.

        Returns:
            The User object if found, None otherwise.
        """

        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    # --------------------------------------------------------------------------
    # GET USER BY ID
    # WHY: Used to fetch a specific user by their database ID.
    #      Called by the "get current user" endpoint and other user lookups.
    # WHAT: Queries the database for a user with the given ID.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - user_id: int → the user's database ID
    # OUTPUT: User object if found, raises HTTP 404 if not found
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: int
    ) -> User:
        """
        Finds a user by their database ID.

        Args:
            db: Async database session.
            user_id: The user's integer database ID.

        Returns:
            The User object if found.

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

        return user
