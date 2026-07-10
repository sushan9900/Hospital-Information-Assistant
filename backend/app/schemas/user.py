# ==============================================================================
# Hospital Information Assistance — User Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   SQLAlchemy models define what is STORED in the database.
#   Pydantic schemas define what is SENT and RECEIVED through the API.
#
#   They serve different purposes:
#     - SQLAlchemy model → database table structure
#     - Pydantic schema  → API request/response shape + validation
#
# SCHEMA TYPES EXPLAINED:
#   - Base    : Shared fields used across multiple schemas
#   - Create  : Fields required when CREATING a new record (input)
#   - Update  : Fields allowed when UPDATING a record (all optional)
#   - Response: Fields returned in API responses (output)
#
# Pydantic V2 is used — note the use of `model_config` instead of `class Config`
# ==============================================================================

from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


# ------------------------------------------------------------------------------
# USER BASE SCHEMA
# WHY: Contains the common fields shared between Create and Response schemas.
#      Avoids repeating the same fields in multiple places (DRY principle).
# ------------------------------------------------------------------------------
class UserBase(BaseModel):
    """
    Base schema with fields shared between user creation and response.
    Not used directly in API endpoints — used as a parent class.
    """

    # User's full display name
    full_name: str = Field(
        ...,                    # ... means this field is REQUIRED
        min_length=2,           # Must be at least 2 characters
        max_length=100,         # Cannot exceed 100 characters
        description="Full name of the user",
        examples=["John Smith"]
    )

    # User's email address — validated as a proper email format
    email: EmailStr = Field(
        ...,
        description="Unique email address used for login",
        examples=["john.smith@email.com"]
    )

    # User's role in the system
    role: UserRole = Field(
        default=UserRole.patient,
        description="User role: 'admin' or 'patient'"
    )


# ------------------------------------------------------------------------------
# USER CREATE SCHEMA (REQUEST)
# WHY: Defines what the client must send when registering a new user.
#      Includes password fields with validation (confirm password check).
# INPUT: Sent in the request body of POST /auth/register
# ------------------------------------------------------------------------------
class UserCreate(UserBase):
    """
    Schema for creating a new user account.
    Used in: POST /auth/register

    Includes password and confirm_password for registration validation.
    """

    # Plain text password (will be hashed before storage — NEVER stored as-is)
    password: str = Field(
        ...,
        min_length=8,           # Minimum 8 characters for security
        max_length=100,
        description="Password (minimum 8 characters)",
        examples=["SecurePass123"]
    )

    # Confirm password — must match the password field
    confirm_password: str = Field(
        ...,
        description="Must match the password field",
        examples=["SecurePass123"]
    )

    @model_validator(mode="after")
    def passwords_must_match(self) -> "UserCreate":
        """
        WHY: Validates that password and confirm_password are identical.
             This prevents users from accidentally setting the wrong password.
        WHAT: Runs after all individual field validations pass.
        OUTPUT: Returns self if valid, raises ValueError if passwords don't match.
        """
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# ------------------------------------------------------------------------------
# USER UPDATE SCHEMA (REQUEST)
# WHY: Defines which fields a user can update in their profile.
#      All fields are Optional — the user can update just one field at a time.
# INPUT: Sent in the request body of PUT /users/me or PATCH /users/{id}
# ------------------------------------------------------------------------------
class UserUpdate(BaseModel):
    """
    Schema for updating an existing user's profile.
    All fields are optional — only send the fields you want to change.
    Used in: PUT /users/me
    """

    # Optional updated full name
    full_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Updated full name",
        examples=["Jane Smith"]
    )

    # Optional updated email
    email: Optional[EmailStr] = Field(
        default=None,
        description="Updated email address",
        examples=["jane.smith@email.com"]
    )


# ------------------------------------------------------------------------------
# USER PASSWORD CHANGE SCHEMA (REQUEST)
# WHY: A dedicated schema for changing the password securely.
#      Requires the old password to confirm identity before changing.
# INPUT: Sent in the request body of PUT /users/me/password
# ------------------------------------------------------------------------------
class UserPasswordChange(BaseModel):
    """
    Schema for changing a user's password.
    Requires the current password for security verification.
    Used in: PUT /users/me/password
    """

    # Current password for verification
    current_password: str = Field(
        ...,
        description="The user's current password for verification",
        examples=["OldPassword123"]
    )

    # New password
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="The new password (minimum 8 characters)",
        examples=["NewSecurePass456"]
    )

    # Confirm new password
    confirm_new_password: str = Field(
        ...,
        description="Must match new_password",
        examples=["NewSecurePass456"]
    )

    @model_validator(mode="after")
    def new_passwords_must_match(self) -> "UserPasswordChange":
        """
        WHY: Ensures the new password and confirmation match.
        OUTPUT: Returns self if valid, raises ValueError if they don't match.
        """
        if self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self


# ------------------------------------------------------------------------------
# USER RESPONSE SCHEMA (RESPONSE)
# WHY: Defines what fields are returned when a user is fetched from the API.
#      IMPORTANT: The hashed_password is NEVER included in responses.
#      Only safe, non-sensitive fields are exposed.
# OUTPUT: Returned from GET /users/me, GET /users/{id}, etc.
# ------------------------------------------------------------------------------
class UserResponse(BaseModel):
    """
    Schema for returning user data in API responses.
    Never includes the password or hashed_password — for security.
    Used in: GET /users/me, GET /users/{id}, auth responses
    """

    id: int = Field(description="Unique user ID")
    full_name: str = Field(description="User's full name")
    email: str = Field(description="User's email address")
    role: UserRole = Field(description="User role: admin or patient")
    is_active: bool = Field(description="Whether the account is active")
    created_at: datetime = Field(description="Account creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    # Pydantic V2 configuration
    model_config = {
        # from_attributes=True allows Pydantic to read data from SQLAlchemy
        # model instances (ORM objects) directly — required for ORM integration
        "from_attributes": True,

        # Add schema examples for Swagger documentation
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "full_name": "John Smith",
                    "email": "john.smith@email.com",
                    "role": "patient",
                    "is_active": True,
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-15T10:30:00Z"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# USER LIST RESPONSE SCHEMA (RESPONSE)
# WHY: Used when returning a paginated list of users (admin view).
# OUTPUT: Returned from GET /users (admin only)
# ------------------------------------------------------------------------------
class UserListResponse(BaseModel):
    """
    Schema for returning a paginated list of users.
    Used in: GET /users (admin endpoint)
    """

    total: int = Field(description="Total number of users in the database")
    users: list[UserResponse] = Field(description="List of user objects")

    model_config = {"from_attributes": True}
