# ==============================================================================
# Hospital Information Assistance — Auth Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines the request and response shapes for all authentication
#   related API endpoints — login, token response, and token data.
#
# AUTHENTICATION FLOW:
#   1. User sends POST /auth/login with email + password
#   2. Server verifies credentials and creates a JWT token
#   3. Server returns the token in a LoginResponse
#   4. Client stores the token and sends it in every future request:
#      Authorization: Bearer <token>
#   5. Server decodes the token using TokenData to identify the user
# ==============================================================================

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.schemas.user import UserResponse


# ------------------------------------------------------------------------------
# LOGIN REQUEST SCHEMA (REQUEST)
# WHY: Defines what the client must send to log in.
# INPUT: Sent in the request body of POST /auth/login
# ------------------------------------------------------------------------------
class LoginRequest(BaseModel):
    """
    Schema for user login requests.
    Used in: POST /auth/login

    The client sends email and password.
    The server verifies them and returns a JWT token.
    """

    # The user's registered email address
    email: EmailStr = Field(
        ...,
        description="Registered email address",
        examples=["john.smith@email.com"]
    )

    # The user's plain text password (transmitted securely over HTTPS)
    password: str = Field(
        ...,
        min_length=1,
        description="Account password",
        examples=["SecurePass123"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "john.smith@email.com",
                    "password": "SecurePass123"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# TOKEN SCHEMA (RESPONSE)
# WHY: The standard OAuth2 token response format.
#      Returns the JWT access token and the token type.
# OUTPUT: Returned from POST /auth/login
# ------------------------------------------------------------------------------
class Token(BaseModel):
    """
    Schema for the JWT token returned after successful login.
    Follows the OAuth2 standard token response format.
    Used in: POST /auth/login response
    """

    # The JWT access token string
    # Client stores this and sends it in: Authorization: Bearer <access_token>
    access_token: str = Field(
        description="JWT access token to include in future requests"
    )

    # The type of token — always "bearer" for JWT
    token_type: str = Field(
        default="bearer",
        description="Token type — always 'bearer' for JWT"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# LOGIN RESPONSE SCHEMA (RESPONSE)
# WHY: Returns both the JWT token AND the user details in one response.
#      This saves the client from making an extra request to /users/me
#      after login — the user data is immediately available.
# OUTPUT: Returned from POST /auth/login
# ------------------------------------------------------------------------------
class LoginResponse(BaseModel):
    """
    Extended login response that includes the token AND the user profile.
    Saves an extra API call — the frontend gets everything it needs on login.
    Used in: POST /auth/login response
    """

    # The JWT access token
    access_token: str = Field(
        description="JWT access token to include in future requests"
    )

    # Always "bearer"
    token_type: str = Field(
        default="bearer",
        description="Token type — always 'bearer'"
    )

    # The logged-in user's profile data (safe — no password included)
    user: UserResponse = Field(
        description="The logged-in user's profile data"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "user": {
                        "id": 1,
                        "full_name": "John Smith",
                        "email": "john.smith@email.com",
                        "role": "patient",
                        "is_active": True,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z"
                    }
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# TOKEN DATA SCHEMA (INTERNAL)
# WHY: When a JWT token arrives in a request, we decode it and extract
#      the user information embedded inside. This schema represents the
#      structure of the data stored inside the JWT payload.
# WHAT: Used internally by the dependency that verifies tokens.
#       NOT sent to or from the client directly.
# ------------------------------------------------------------------------------
class TokenData(BaseModel):
    """
    Schema representing the data decoded from a JWT token payload.
    Used internally in the token verification dependency.
    NOT an API request/response schema — used only inside the backend.
    """

    # The user's email address extracted from the JWT payload
    # We use email as the "subject" (sub) field of the JWT
    email: Optional[str] = Field(
        default=None,
        description="User email extracted from JWT token payload"
    )

    # The user's ID extracted from the JWT payload
    user_id: Optional[int] = Field(
        default=None,
        description="User ID extracted from JWT token payload"
    )

    # The user's role extracted from the JWT payload
    role: Optional[str] = Field(
        default=None,
        description="User role extracted from JWT token payload"
    )


# ------------------------------------------------------------------------------
# REGISTER RESPONSE SCHEMA (RESPONSE)
# WHY: Returns a success message and the newly created user after registration.
#      Lets the client know registration was successful without needing
#      an immediate login request.
# OUTPUT: Returned from POST /auth/register
# ------------------------------------------------------------------------------
class RegisterResponse(BaseModel):
    """
    Response returned after successful user registration.
    Includes a success message and the newly created user profile.
    Used in: POST /auth/register response
    """

    # A friendly success message
    message: str = Field(
        description="Success message",
        examples=["Account created successfully. Please log in."]
    )

    # The newly created user profile (no password included)
    user: UserResponse = Field(
        description="The newly created user's profile"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "message": "Account created successfully. Please log in.",
                    "user": {
                        "id": 2,
                        "full_name": "Jane Doe",
                        "email": "jane.doe@email.com",
                        "role": "patient",
                        "is_active": True,
                        "created_at": "2024-01-16T09:00:00Z",
                        "updated_at": "2024-01-16T09:00:00Z"
                    }
                }
            ]
        }
    }
