# ==============================================================================
# Hospital Information Assistance — JWT Security
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file handles everything related to JWT (JSON Web Token) security:
#   - Creating access tokens when a user logs in
#   - Verifying/decoding tokens from incoming requests
#   - Extracting user data from tokens
#
# WHAT IS A JWT TOKEN:
#   A JWT is a secure string that contains user information (payload).
#   It has 3 parts separated by dots:
#     header.payload.signature
#   Example:
#     eyJhbGci... . eyJ1c2VyX2lkIjoxfQ... . XbK8_abc123...
#
#   The server creates the token at login.
#   The client stores the token and sends it with every request.
#   The server verifies the token and extracts the user data.
#
# SECURITY:
#   - The token is signed with the SECRET_KEY — cannot be tampered with
#   - The token has an expiry time — old tokens become invalid
#   - The token payload is readable but NOT modifiable without the secret key
# ==============================================================================

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status
from app.config import settings
from app.schemas.auth import TokenData


# ------------------------------------------------------------------------------
# CREATE ACCESS TOKEN
# WHY: After a user logs in successfully, we create a JWT token that
#      proves their identity for all future requests.
#      The token contains the user's email, id, and role.
# WHAT: Generates a signed JWT string that expires after a set time.
# INPUT:
#   - data: dict → the payload to encode (e.g., {"sub": email, "user_id": 1})
#   - expires_delta: Optional[timedelta] → custom expiry time (optional)
# OUTPUT: A signed JWT string (e.g., "eyJhbGci...")
# ------------------------------------------------------------------------------
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Creates a signed JWT access token with the given payload data.

    Args:
        data: Dictionary of data to encode in the token payload.
              Should include: {"sub": email, "user_id": id, "role": role}
        expires_delta: How long until the token expires.
                       Defaults to ACCESS_TOKEN_EXPIRE_MINUTES from config.

    Returns:
        A signed JWT token string.
    """

    # Make a copy of the data so we don't accidentally modify the original
    to_encode = data.copy()

    # Calculate the expiry time
    if expires_delta:
        # Use the provided custom expiry duration
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Use the default expiry from settings (e.g., 1440 minutes = 24 hours)
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Add the expiry time to the token payload
    # "exp" is a standard JWT claim — libraries automatically check this
    to_encode.update({"exp": expire})

    # Sign and encode the token using the secret key and algorithm
    # This produces the final JWT string
    encoded_jwt = jwt.encode(
        to_encode,              # The payload data
        settings.SECRET_KEY,    # The secret key (from .env)
        algorithm=settings.ALGORITHM  # The signing algorithm (HS256)
    )

    return encoded_jwt


# ------------------------------------------------------------------------------
# VERIFY AND DECODE ACCESS TOKEN
# WHY: When a client sends a request with a token, we need to:
#      1. Verify the token signature is valid (not tampered with)
#      2. Check that the token has not expired
#      3. Extract the user data from the token payload
# WHAT: Decodes the JWT and returns the user data inside it.
# INPUT:  token → the JWT string from the Authorization header
# OUTPUT: TokenData object with email, user_id, and role
#         Raises HTTPException 401 if token is invalid or expired
# ------------------------------------------------------------------------------
def verify_access_token(token: str) -> TokenData:
    """
    Verifies a JWT token and returns the decoded user data.

    Args:
        token: The JWT string to verify (from the Authorization header).

    Returns:
        TokenData containing the user's email, id, and role.

    Raises:
        HTTPException 401: If the token is invalid, expired, or malformed.
    """

    # Standard error returned for any token problem
    # We use a generic message for security (don't reveal why it failed)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},  # Required by OAuth2 standard
    )

    try:
        # Decode the JWT token using the secret key
        # jose will automatically check:
        #   - The signature is valid (not tampered with)
        #   - The token has not expired ("exp" claim)
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        # Extract the user's email from the "sub" (subject) field
        # "sub" is the standard JWT field for the subject (user identifier)
        email: Optional[str] = payload.get("sub")

        # If there is no email in the payload, the token is invalid
        if email is None:
            raise credentials_exception

        # Extract additional user data from the payload
        user_id: Optional[int] = payload.get("user_id")
        role: Optional[str] = payload.get("role")

        # Create and return a TokenData object with the extracted data
        token_data = TokenData(
            email=email,
            user_id=user_id,
            role=role
        )

        return token_data

    except JWTError:
        # JWTError is raised if:
        #   - The signature is invalid (token was tampered with)
        #   - The token has expired
        #   - The token format is incorrect
        raise credentials_exception


# ------------------------------------------------------------------------------
# CREATE TOKEN PAYLOAD
# WHY: A helper function to standardize how we build the token payload.
#      Ensures the same fields are always included in every token.
# WHAT: Builds the dictionary that gets encoded into the JWT.
# INPUT:
#   - email: str → user's email address
#   - user_id: int → user's database ID
#   - role: str → user's role ("admin" or "patient")
# OUTPUT: A dictionary ready to be passed to create_access_token()
# ------------------------------------------------------------------------------
def create_token_payload(email: str, user_id: int, role: str) -> dict:
    """
    Builds the standard token payload dictionary.

    Args:
        email: User's email address (used as the JWT subject).
        user_id: User's database ID.
        role: User's role in the system ("admin" or "patient").

    Returns:
        A dictionary to pass to create_access_token().
    """

    return {
        "sub": email,       # "sub" = subject (standard JWT field for identifier)
        "user_id": user_id, # Custom field: user's database ID
        "role": role        # Custom field: user's role for authorization
    }


# ------------------------------------------------------------------------------
# CHECK IF USER IS ADMIN
# WHY: Some endpoints are restricted to admin users only.
#      This helper checks the role from the decoded token data.
# WHAT: Raises HTTP 403 Forbidden if the user is not an admin.
# INPUT:  token_data → TokenData extracted from the JWT
# OUTPUT: None (passes silently if admin), raises 403 if not admin
# ------------------------------------------------------------------------------
def require_admin_role(token_data: TokenData) -> None:
    """
    Checks that the token belongs to an admin user.
    Raises HTTP 403 Forbidden if the user is not an admin.

    Args:
        token_data: Decoded token data from the JWT.

    Raises:
        HTTPException 403: If the user's role is not 'admin'.
    """

    if token_data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action. Admin access required."
        )
