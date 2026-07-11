from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.core.security import verify_access_token
from app.models.user import User, UserRole
from app.schemas.auth import TokenData


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",  # Path to the login endpoint (shown in Swagger)
    scheme_name="JWT"        # Name shown in the Swagger UI security section
)

oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    auto_error=False  # Returns None instead of raising 401 when no token found
)


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

    token_data: TokenData = verify_access_token(token)

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
