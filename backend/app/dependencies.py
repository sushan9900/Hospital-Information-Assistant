# ==============================================================================
# Hospital Information Assistance — FastAPI Dependencies
# ==============================================================================
# WHY THIS FILE EXISTS:
#   FastAPI uses "Dependency Injection" to share reusable logic across routes.
#   Instead of writing the same authentication check in every endpoint,
#   we define it once here and inject it where needed using Depends().
#
# HOW DEPENDENCY INJECTION WORKS:
#   When a router function has a parameter like:
#       current_user: User = Depends(get_current_user)
#   FastAPI automatically:
#     1. Reads the Authorization header from the request
#     2. Calls get_current_user() with the token
#     3. Passes the returned User object to the router function
#
# DEPENDENCIES IN THIS FILE:
#   - get_current_user      → Any logged-in user (patient or admin)
#   - get_current_admin     → Admin users only (raises 403 for patients)
#   - get_optional_user     → Returns user if logged in, None if not
#
# USAGE IN ROUTERS:
#   from app.dependencies import get_current_user, get_current_admin
#   from fastapi import Depends
#
#   @router.get("/protected")
#   async def protected_route(current_user: User = Depends(get_current_user)):
#       return {"user": current_user.email}
# ==============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.core.security import verify_access_token
from app.models.user import User, UserRole
from app.schemas.auth import TokenData


# ------------------------------------------------------------------------------
# OAUTH2 SCHEME
# WHY: FastAPI needs to know WHERE to look for the token in incoming requests.
#      OAuth2PasswordBearer tells FastAPI to look in the Authorization header:
#      Authorization: Bearer <token>
# WHAT: This also makes the "Authorize" button appear in Swagger UI (/docs),
#      allowing you to test protected routes directly from the browser.
# tokenUrl: The login endpoint path — used by Swagger UI for the login button
# ------------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",  # Path to the login endpoint (shown in Swagger)
    scheme_name="JWT"        # Name shown in the Swagger UI security section
)

# A version of oauth2_scheme that does NOT raise an error if no token is found
# Used for optional authentication (public endpoints that work with or without login)
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    auto_error=False  # Returns None instead of raising 401 when no token found
)


# ------------------------------------------------------------------------------
# GET CURRENT USER (REQUIRED AUTHENTICATION)
# WHY: The most commonly used dependency — ensures the user is logged in.
#      Used for any endpoint that requires authentication (appointments, chat, etc.)
# WHAT: Reads the JWT token from the Authorization header, verifies it,
#       and loads the full User object from the database.
# INPUT:
#   - token → JWT string from Authorization header (auto-extracted by FastAPI)
#   - db    → Database session (from get_db dependency)
# OUTPUT: The authenticated User object from the database
#         Raises HTTP 401 if token is missing, invalid, or expired
#         Raises HTTP 401 if user account not found or inactive
# ------------------------------------------------------------------------------
async def get_current_user(
    token: str = Depends(oauth2_scheme),       # Extract token from header
    db: AsyncSession = Depends(get_db)         # Get database session
) -> User:
    """
    FastAPI dependency that authenticates a user via JWT token.
    Use with Depends() in any route that requires the user to be logged in.

    Args:
        token: JWT token automatically extracted from Authorization header.
        db: Async database session from get_db dependency.

    Returns:
        The authenticated User object from the database.

    Raises:
        HTTPException 401: Token missing, invalid, expired, or user not found.
        HTTPException 401: User account is deactivated.
    """

    # Step 1: Verify the JWT token and extract the user data from it
    # verify_access_token raises HTTP 401 if the token is invalid/expired
    token_data: TokenData = verify_access_token(token)

    # Step 2: Look up the user in the database using the email from the token
    # We query by email (the "sub" field in the JWT payload)
    result = await db.execute(
        select(User).where(User.email == token_data.email)
    )
    user = result.scalar_one_or_none()  # Returns User or None if not found

    # Step 3: Check that the user exists in the database
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 4: Check that the user's account is active (not soft-deleted)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Please contact support.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 5: Return the full User object to the router function
    return user


# ------------------------------------------------------------------------------
# GET CURRENT ADMIN USER (ADMIN-ONLY AUTHENTICATION)
# WHY: Some endpoints should only be accessible by admin users.
#      For example: creating doctors, managing departments, viewing all users.
# WHAT: Builds on get_current_user — first checks login, then checks role.
# INPUT:
#   - current_user → User object from get_current_user (chained dependency)
# OUTPUT: The authenticated User object (guaranteed to be an admin)
#         Raises HTTP 403 Forbidden if the user is not an admin
# ------------------------------------------------------------------------------
async def get_current_admin(
    current_user: User = Depends(get_current_user)  # Must be logged in first
) -> User:
    """
    FastAPI dependency that requires the current user to be an admin.
    Use with Depends() in any route that is restricted to admin users.

    Args:
        current_user: The authenticated user from get_current_user.

    Returns:
        The authenticated admin User object.

    Raises:
        HTTPException 403: If the current user's role is not 'admin'.
    """

    # Check if the user's role is admin
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action. Admin access required."
        )

    # User is an admin — return them to the router
    return current_user


# ------------------------------------------------------------------------------
# GET OPTIONAL USER (OPTIONAL AUTHENTICATION)
# WHY: Some endpoints are PUBLIC but show extra data when the user is logged in.
#      For example: viewing doctors (public) vs. seeing "Book Appointment"
#      button (requires login). This dependency handles both cases.
# WHAT: Returns the User object if logged in, or None if not authenticated.
#       Does NOT raise an error if the token is missing.
# INPUT:
#   - token → Optional JWT string (None if not provided)
#   - db    → Database session
# OUTPUT: User object if authenticated, None if not authenticated
# ------------------------------------------------------------------------------
async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),  # None if no token
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency for optional authentication.
    Returns the User if a valid token is provided, None otherwise.
    Use for public endpoints that have enhanced behavior when logged in.

    Args:
        token: Optional JWT token from Authorization header (None if absent).
        db: Async database session from get_db dependency.

    Returns:
        User object if authenticated, None if no valid token is provided.
        Never raises authentication errors — silently returns None.
    """

    # If no token was provided in the request, return None (user is not logged in)
    if token is None:
        return None

    try:
        # Try to verify the token — if it fails, return None (don't raise error)
        token_data: TokenData = verify_access_token(token)

        # Look up the user in the database
        result = await db.execute(
            select(User).where(User.email == token_data.email)
        )
        user = result.scalar_one_or_none()

        # Return the user (or None if not found / inactive)
        if user and user.is_active:
            return user
        return None

    except Exception:
        # If anything goes wrong (expired token, etc.), just return None
        # Don't raise an error — optional auth should fail silently
        return None


# ------------------------------------------------------------------------------
# COMMON PAGINATION PARAMETERS
# WHY: Many list endpoints (GET /doctors, GET /appointments, etc.) support
#      pagination with `skip` and `limit` query parameters.
#      This dependency centralizes the parameter definition and validation.
# WHAT: Returns a dict with validated skip and limit values.
# INPUT:
#   - skip  → Number of records to skip (for pagination offset)
#   - limit → Maximum number of records to return per page
# OUTPUT: Dict with {"skip": int, "limit": int}
# ------------------------------------------------------------------------------
async def get_pagination_params(
    skip: int = 0,    # Default: start from the first record
    limit: int = 10   # Default: return 10 records per page
) -> dict:
    """
    FastAPI dependency for standard pagination query parameters.
    Validates that skip >= 0 and limit is between 1 and 100.

    Args:
        skip: Number of records to skip (pagination offset). Default: 0.
        limit: Maximum records to return per page. Default: 10, max: 100.

    Returns:
        A dictionary with validated {"skip": int, "limit": int}.

    Raises:
        HTTPException 400: If skip is negative or limit is out of range.
    """

    # Validate skip — must be zero or positive
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'skip' must be 0 or greater."
        )

    # Validate limit — must be between 1 and 100
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'limit' must be between 1 and 100."
        )

    return {"skip": skip, "limit": limit}
