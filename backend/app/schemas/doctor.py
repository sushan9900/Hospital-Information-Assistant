# ==============================================================================
# Hospital Information Assistance — Doctor Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines request and response shapes for all Doctor-related API endpoints.
#   Pydantic validates incoming data before it reaches the service layer,
#   and controls what data is returned in responses.
#
# SCHEMAS:
#   - DoctorBase        : Shared fields (parent class)
#   - DoctorCreate      : Fields required to create a new doctor (admin only)
#   - DoctorUpdate      : Fields allowed when updating a doctor (all optional)
#   - DoctorResponse    : Fields returned in API responses
#   - DoctorListResponse: Paginated list of doctors
# ==============================================================================

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ------------------------------------------------------------------------------
# DOCTOR BASE SCHEMA
# WHY: Contains shared fields used across Create and Response schemas.
#      Prevents repeating the same field definitions (DRY principle).
# ------------------------------------------------------------------------------
class DoctorBase(BaseModel):
    """
    Base schema with fields common to doctor creation and response schemas.
    Not used directly in API endpoints — serves as a parent class.
    """

    # Doctor's full name
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
        description="Doctor's full name",
        examples=["Dr. Sarah Johnson"]
    )

    # Medical specialization
    specialization: str = Field(
        ...,
        min_length=2,
        max_length=150,
        description="Doctor's medical specialization",
        examples=["Cardiologist"]
    )

    # Academic qualifications
    qualification: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Academic qualifications",
        examples=["MBBS, MD, DM Cardiology"]
    )

    # Years of professional experience
    experience_years: Optional[int] = Field(
        default=None,
        ge=0,         # Must be 0 or greater (ge = greater than or equal)
        le=60,        # Reasonable max of 60 years (le = less than or equal)
        description="Years of professional experience",
        examples=[10]
    )

    # Contact email
    email: Optional[EmailStr] = Field(
        default=None,
        description="Doctor's contact email address",
        examples=["dr.sarah@hospital.com"]
    )

    # Contact phone
    phone: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Doctor's contact phone number",
        examples=["+1-555-0101"]
    )

    # Biography / profile description
    bio: Optional[str] = Field(
        default=None,
        description="Doctor's biography and profile description",
        examples=["Dr. Sarah Johnson is a renowned cardiologist with 10 years of experience..."]
    )

    # Consultation fee
    consultation_fee: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Consultation fee amount",
        examples=["500", "Free", "300-500"]
    )

    # Available days for appointments
    available_days: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Days available for consultation",
        examples=["Monday, Wednesday, Friday"]
    )


# ------------------------------------------------------------------------------
# DOCTOR CREATE SCHEMA (REQUEST)
# WHY: Defines what an admin must send when adding a new doctor.
#      department_id is required to link the doctor to a department.
# INPUT: Sent in the request body of POST /doctors (admin only)
# ------------------------------------------------------------------------------
class DoctorCreate(DoctorBase):
    """
    Schema for creating a new doctor record.
    Used in: POST /doctors (admin only)

    Requires department_id to link the doctor to their department.
    """

    # The ID of the department this doctor belongs to
    department_id: int = Field(
        ...,
        gt=0,  # Must be a positive integer (gt = greater than)
        description="ID of the department this doctor belongs to",
        examples=[1]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "full_name": "Dr. Sarah Johnson",
                    "specialization": "Cardiologist",
                    "qualification": "MBBS, MD, DM Cardiology",
                    "experience_years": 10,
                    "department_id": 1,
                    "email": "dr.sarah@hospital.com",
                    "phone": "+1-555-0101",
                    "bio": "Dr. Sarah is a renowned cardiologist with 10 years of experience.",
                    "consultation_fee": "500",
                    "available_days": "Monday, Wednesday, Friday"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# DOCTOR UPDATE SCHEMA (REQUEST)
# WHY: Allows partial updates — admin can update just one field at a time.
#      All fields are Optional so the client only sends what changed.
# INPUT: Sent in the request body of PUT /doctors/{id} (admin only)
# ------------------------------------------------------------------------------
class DoctorUpdate(BaseModel):
    """
    Schema for updating an existing doctor record.
    All fields are optional — only include the fields you want to change.
    Used in: PUT /doctors/{id} (admin only)
    """

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    specialization: Optional[str] = Field(default=None, min_length=2, max_length=150)
    qualification: Optional[str] = Field(default=None, max_length=255)
    experience_years: Optional[int] = Field(default=None, ge=0, le=60)
    department_id: Optional[int] = Field(default=None, gt=0)
    email: Optional[EmailStr] = Field(default=None)
    phone: Optional[str] = Field(default=None, max_length=20)
    bio: Optional[str] = Field(default=None)
    consultation_fee: Optional[str] = Field(default=None, max_length=50)
    available_days: Optional[str] = Field(default=None, max_length=200)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "consultation_fee": "600",
                    "available_days": "Monday, Tuesday, Thursday"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# DEPARTMENT BRIEF SCHEMA
# WHY: When returning a doctor, we include a brief summary of their department
#      (just id + name) so the client doesn't need a separate API call.
#      We use a "brief" schema to avoid circular imports with department.py.
# OUTPUT: Nested inside DoctorResponse
# ------------------------------------------------------------------------------
class DepartmentBrief(BaseModel):
    """
    A lightweight department summary nested inside doctor responses.
    Avoids circular imports — department.py would otherwise import doctor.py.
    """

    id: int = Field(description="Department ID")
    name: str = Field(description="Department name")

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------------------
# DOCTOR RESPONSE SCHEMA (RESPONSE)
# WHY: Defines what fields are returned when a doctor is fetched.
#      Includes a nested DepartmentBrief so the client knows the department.
# OUTPUT: Returned from GET /doctors, GET /doctors/{id}, POST /doctors, etc.
# ------------------------------------------------------------------------------
class DoctorResponse(BaseModel):
    """
    Schema for returning doctor data in API responses.
    Includes a brief nested department object.
    Used in: GET /doctors, GET /doctors/{id}, POST /doctors, PUT /doctors/{id}
    """

    id: int = Field(description="Unique doctor ID")
    full_name: str = Field(description="Doctor's full name")
    specialization: str = Field(description="Medical specialization")
    qualification: Optional[str] = Field(description="Academic qualifications")
    experience_years: Optional[int] = Field(description="Years of experience")
    department_id: int = Field(description="Department ID")
    department: Optional[DepartmentBrief] = Field(
        default=None,
        description="Brief department info (id + name)"
    )
    email: Optional[str] = Field(description="Contact email")
    phone: Optional[str] = Field(description="Contact phone")
    bio: Optional[str] = Field(description="Doctor biography")
    consultation_fee: Optional[str] = Field(description="Consultation fee")
    available_days: Optional[str] = Field(description="Available days")
    created_at: datetime = Field(description="Record creation timestamp")
    updated_at: datetime = Field(description="Record last update timestamp")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "full_name": "Dr. Sarah Johnson",
                    "specialization": "Cardiologist",
                    "qualification": "MBBS, MD, DM Cardiology",
                    "experience_years": 10,
                    "department_id": 1,
                    "department": {"id": 1, "name": "Cardiology"},
                    "email": "dr.sarah@hospital.com",
                    "phone": "+1-555-0101",
                    "bio": "Dr. Sarah is a renowned cardiologist.",
                    "consultation_fee": "500",
                    "available_days": "Monday, Wednesday, Friday",
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-15T10:30:00Z"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# DOCTOR LIST RESPONSE SCHEMA (RESPONSE)
# WHY: Returns a paginated list of doctors with a total count.
#      The total count helps the frontend build pagination controls.
# OUTPUT: Returned from GET /doctors
# ------------------------------------------------------------------------------
class DoctorListResponse(BaseModel):
    """
    Schema for returning a paginated list of doctors.
    Used in: GET /doctors
    """

    total: int = Field(description="Total number of doctors in the database")
    doctors: List[DoctorResponse] = Field(description="List of doctor objects")

    model_config = {"from_attributes": True}
