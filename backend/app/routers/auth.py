# ==============================================================================
# Hospital Information Assistance — Authentication Router
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines all HTTP endpoints for user authentication.
#   Routers in FastAPI connect URL paths to service functions.
#   Routers should be THIN — no business logic here, only:
#     - Define the route (path + HTTP method)
#     - Extract request data
#     - Call the service
#     - Return the response
#
# ENDPOINTS:
#   POST /auth/register → Register a new user account
#   POST /auth/login    → Login and receive a JWT token
#   GET  /auth/me       → Get the current user's profile (requires auth)
#
# HOW ROUTERS CONNECT TO THE APP:
#   This router is imported and registered in main.py:
#   app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
# ==============================================================================

from fastapi import APIRouter, Depends, status, Request, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, LoginResponse, RegisterResponse
from app.services.auth_service import AuthService


# Create the router — all routes defined here will be prefixed with /auth
router = APIRouter()


# ==============================================================================
# REGISTER NEW USER
# Method: POST
# Path:   /auth/register  (becomes /auth/register with prefix in main.py)
# Access: Public (no authentication required)
# ==============================================================================
@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,  # 201 = Created (more precise than 200 for creation)
    summary="Register a new user account",
    description="""
    Creates a new user account with the provided details.

    - Validates that the email is not already registered
    - Hashes the password using bcrypt before storing
    - Returns the new user profile (no password)
    - New accounts are assigned the 'patient' role by default
    """
)
async def register(
    user_data: UserCreate,          # Request body — Pydantic validates automatically
    db: AsyncSession = Depends(get_db)  # Database session from dependency
) -> RegisterResponse:
    """
    Register a new user account.

    Request Body:
    - full_name: User's full name (min 2, max 100 chars)
    - email: Valid email address (must be unique)
    - password: At least 8 characters
    - confirm_password: Must match password
    - role: "patient" (default) or "admin"

    Returns:
    - message: Success confirmation
    - user: The newly created user profile (without password)

    Errors:
    - 409 Conflict: Email already registered
    - 422 Unprocessable Entity: Validation errors (e.g., passwords don't match)
    """

    # Delegate ALL business logic to the service layer
    # The router just calls the service and returns the result
    return await AuthService.register_user(db=db, user_data=user_data)


# ==============================================================================
# USER LOGIN
# Method: POST
# Path:   /auth/login
# Access: Public (no authentication required)
# ==============================================================================
@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login and receive a JWT access token",
    description="""
    Authenticates a user with email and password.

    Returns a JWT access token that must be included in the Authorization header
    of all subsequent protected requests:

    ```
    Authorization: Bearer <access_token>
    ```

    The response also includes the user's profile data so the frontend
    doesn't need to make an extra request to /auth/me after login.
    """
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """
    Authenticate a user and return a JWT access token (JSON format for Frontend React client).
    """
    return await AuthService.login_user(db=db, login_data=login_data)


# ==============================================================================
# OAUTH2 COMPATIBLE TOKEN LOGIN (For Swagger UI)
# Method: POST
# Path:   /auth/token
# Access: Public
# ==============================================================================
@router.post(
    "/token",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="OAuth2 compatible token login for Swagger UI",
    description="Authenticates via standard OAuth2 password form-data parameters (username/password) for Swagger UI compatibility."
)
async def login_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> LoginResponse:
    login_data = LoginRequest(email=form_data.username, password=form_data.password)
    return await AuthService.login_user(db=db, login_data=login_data)


# ==============================================================================
# GET CURRENT USER PROFILE
# Method: GET
# Path:   /auth/me
# Access: Protected (requires valid JWT token)
# ==============================================================================
@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the currently logged-in user's profile",
    description="""
    Returns the profile of the currently authenticated user.
    Requires a valid JWT token in the Authorization header.

    Use this endpoint to:
    - Display the user's name and email in the UI
    - Check the user's role (admin vs patient)
    - Verify the token is still valid
    """
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)  # JWT verification happens here
) -> UserResponse:
    """
    Get the currently logged-in user's profile.

    Authentication Required:
        Authorization: Bearer <access_token>

    Returns:
    - Full user profile (id, name, email, role, is_active, timestamps)
    - Never returns the password hash

    Errors:
    - 401 Unauthorized: Token missing, invalid, or expired
    - 401 Unauthorized: Account not found or deactivated
    """

    # The user is already loaded and validated by the get_current_user dependency
    # Just return it — Pydantic will serialize it automatically
    return UserResponse.model_validate(current_user)
