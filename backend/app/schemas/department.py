# ==============================================================================
# Hospital Information Assistance — Department Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines request and response shapes for all Department-related API endpoints.
#   Departments are the top-level hospital units (e.g., Cardiology, Neurology).
#   Doctors belong to departments, so department data is often shown alongside
#   doctor information.
#
# SCHEMAS:
#   - DepartmentBase        : Shared fields (parent class)
#   - DepartmentCreate      : Fields required to create a department (admin only)
#   - DepartmentUpdate      : Fields allowed when updating (all optional)
#   - DepartmentResponse    : Fields returned in API responses (with doctor count)
#   - DepartmentListResponse: Paginated list of departments
# ==============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ------------------------------------------------------------------------------
# DEPARTMENT BASE SCHEMA
# WHY: Contains fields shared between Create and Response schemas.
# ------------------------------------------------------------------------------
class DepartmentBase(BaseModel):
    """
    Base schema with fields common to department creation and response schemas.
    Not used directly in API endpoints — serves as a parent class.
    """

    # Department name (e.g., "Cardiology", "Neurology", "Pediatrics")
    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
        description="Name of the department",
        examples=["Cardiology"]
    )

    # Description of services offered by this department
    description: Optional[str] = Field(
        default=None,
        description="Description of the department and its services",
        examples=["The Cardiology department specializes in heart-related conditions and treatments."]
    )

    # Physical location within the hospital
    location: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Physical location in the hospital",
        examples=["Block A, Floor 2, Wing B"]
    )

    # Department contact phone number
    phone: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Department contact phone number",
        examples=["+1-555-0200"]
    )


# ------------------------------------------------------------------------------
# DEPARTMENT CREATE SCHEMA (REQUEST)
# WHY: Defines what an admin must send when creating a new department.
# INPUT: Sent in the request body of POST /departments (admin only)
# ------------------------------------------------------------------------------
class DepartmentCreate(DepartmentBase):
    """
    Schema for creating a new department.
    Used in: POST /departments (admin only)
    """

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Cardiology",
                    "description": "Specializes in diagnosis and treatment of heart conditions.",
                    "location": "Block A, Floor 2",
                    "phone": "+1-555-0200"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# DEPARTMENT UPDATE SCHEMA (REQUEST)
# WHY: Allows partial updates — admin can change just one field at a time.
#      All fields are Optional so the client only sends what changed.
# INPUT: Sent in the request body of PUT /departments/{id} (admin only)
# ------------------------------------------------------------------------------
class DepartmentUpdate(BaseModel):
    """
    Schema for updating an existing department.
    All fields are optional — only include what you want to change.
    Used in: PUT /departments/{id} (admin only)
    """

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
        description="Updated department name"
    )

    description: Optional[str] = Field(
        default=None,
        description="Updated department description"
    )

    location: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Updated physical location"
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Updated contact phone number"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "location": "Block B, Floor 3",
                    "phone": "+1-555-0201"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# DEPARTMENT RESPONSE SCHEMA (RESPONSE)
# WHY: Defines what fields are returned when a department is fetched.
#      Includes doctor_count — a computed field showing how many doctors
#      belong to this department. Useful for the UI dashboard.
# OUTPUT: Returned from GET /departments, GET /departments/{id}, etc.
# ------------------------------------------------------------------------------
class DepartmentResponse(BaseModel):
    """
    Schema for returning department data in API responses.
    Includes doctor_count for dashboard statistics.
    Used in: GET /departments, GET /departments/{id}, POST /departments
    """

    id: int = Field(description="Unique department ID")
    name: str = Field(description="Department name")
    description: Optional[str] = Field(description="Department description")
    location: Optional[str] = Field(description="Physical location in hospital")
    phone: Optional[str] = Field(description="Department contact phone")

    # Total number of doctors in this department
    # This is computed in the service layer — not stored as a column
    doctor_count: Optional[int] = Field(
        default=0,
        description="Number of doctors in this department"
    )

    created_at: datetime = Field(description="Record creation timestamp")
    updated_at: datetime = Field(description="Record last update timestamp")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Cardiology",
                    "description": "Specializes in heart conditions and treatments.",
                    "location": "Block A, Floor 2",
                    "phone": "+1-555-0200",
                    "doctor_count": 5,
                    "created_at": "2024-01-10T08:00:00Z",
                    "updated_at": "2024-01-10T08:00:00Z"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# DEPARTMENT LIST RESPONSE SCHEMA (RESPONSE)
# WHY: Returns a paginated list of departments with a total count.
#      The total count helps the frontend build pagination controls.
# OUTPUT: Returned from GET /departments
# ------------------------------------------------------------------------------
class DepartmentListResponse(BaseModel):
    """
    Schema for returning a paginated list of departments.
    Used in: GET /departments
    """

    total: int = Field(description="Total number of departments in the database")
    departments: List[DepartmentResponse] = Field(
        description="List of department objects"
    )

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------------------
# DEPARTMENT WITH DOCTORS SCHEMA (RESPONSE)
# WHY: Used for the department detail page — shows the department info
#      along with a brief list of all doctors in that department.
#      Saves the client from making two separate API calls.
# OUTPUT: Returned from GET /departments/{id}
# ------------------------------------------------------------------------------
class DoctorInDepartment(BaseModel):
    """
    A brief doctor summary nested inside department detail responses.
    Only includes essential fields to avoid over-fetching data.
    """

    id: int = Field(description="Doctor ID")
    full_name: str = Field(description="Doctor's full name")
    specialization: str = Field(description="Medical specialization")
    experience_years: Optional[int] = Field(description="Years of experience")
    consultation_fee: Optional[str] = Field(description="Consultation fee")

    model_config = {"from_attributes": True}


class DepartmentDetailResponse(DepartmentResponse):
    """
    Extended department response that includes the list of doctors.
    Used in: GET /departments/{id} (detail view)
    """

    # List of doctors in this department
    doctors: List[DoctorInDepartment] = Field(
        default=[],
        description="List of doctors in this department"
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Cardiology",
                    "description": "Specializes in heart conditions.",
                    "location": "Block A, Floor 2",
                    "phone": "+1-555-0200",
                    "doctor_count": 2,
                    "created_at": "2024-01-10T08:00:00Z",
                    "updated_at": "2024-01-10T08:00:00Z",
                    "doctors": [
                        {
                            "id": 1,
                            "full_name": "Dr. Sarah Johnson",
                            "specialization": "Cardiologist",
                            "experience_years": 10,
                            "consultation_fee": "500"
                        }
                    ]
                }
            ]
        }
    }
