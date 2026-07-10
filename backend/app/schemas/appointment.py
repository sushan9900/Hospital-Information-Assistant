# ==============================================================================
# Hospital Information Assistance — Appointment Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines request and response shapes for all Appointment-related API endpoints.
#   Appointments are the core booking transaction of the system — linking
#   a patient (User) to a Doctor on a specific date and time.
#
# SCHEMAS:
#   - AppointmentBase        : Shared fields (parent class)
#   - AppointmentCreate      : Fields required to book an appointment
#   - AppointmentUpdate      : Fields allowed when updating (all optional)
#   - AppointmentStatusUpdate: For updating only the status (admin/doctor)
#   - AppointmentResponse    : Full response with nested user and doctor info
#   - AppointmentListResponse: Paginated list of appointments
# ==============================================================================

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.appointment import AppointmentStatus


# ------------------------------------------------------------------------------
# APPOINTMENT BASE SCHEMA
# WHY: Contains the shared fields between Create and Response schemas.
# ------------------------------------------------------------------------------
class AppointmentBase(BaseModel):
    """
    Base schema with fields common to appointment creation and responses.
    Not used directly in API endpoints — serves as a parent class.
    """

    # The date of the appointment in YYYY-MM-DD format
    appointment_date: str = Field(
        ...,
        description="Appointment date in YYYY-MM-DD format",
        examples=["2024-12-25"]
    )

    # The time slot for the appointment
    appointment_time: str = Field(
        ...,
        description="Appointment time (e.g., '10:00 AM' or '14:30')",
        examples=["10:00 AM"]
    )

    # Reason for visiting
    reason: Optional[str] = Field(
        default=None,
        description="Reason for the appointment / patient complaint",
        examples=["Chest pain and shortness of breath"]
    )

    @field_validator("appointment_date")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        """
        WHY: Ensures the date is in a valid YYYY-MM-DD format.
             Prevents invalid dates like "25-12-2024" or "December 25" from
             being stored in the database.
        INPUT: appointment_date string
        OUTPUT: The same string if valid, raises ValueError if invalid.
        """
        try:
            # Try to parse as a date — raises ValueError if format is wrong
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            raise ValueError("appointment_date must be in YYYY-MM-DD format (e.g., 2024-12-25)")


# ------------------------------------------------------------------------------
# APPOINTMENT CREATE SCHEMA (REQUEST)
# WHY: Defines what a patient must send to book a new appointment.
#      The doctor_id is required — patients choose which doctor to visit.
#      The user_id is NOT included here — it's automatically set from the
#      JWT token (the logged-in user cannot book for someone else).
# INPUT: Sent in the request body of POST /appointments
# ------------------------------------------------------------------------------
class AppointmentCreate(AppointmentBase):
    """
    Schema for booking a new appointment.
    Used in: POST /appointments

    user_id is automatically extracted from the JWT token — not sent by client.
    The patient chooses the doctor, date, time, and optionally a reason.
    """

    # The doctor the patient wants to visit
    doctor_id: int = Field(
        ...,
        gt=0,
        description="ID of the doctor to book the appointment with",
        examples=[1]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "doctor_id": 1,
                    "appointment_date": "2024-12-25",
                    "appointment_time": "10:00 AM",
                    "reason": "Chest pain and shortness of breath"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# APPOINTMENT UPDATE SCHEMA (REQUEST)
# WHY: Allows a patient to reschedule their appointment (change date/time)
#      or update the reason. All fields are optional.
# INPUT: Sent in the request body of PUT /appointments/{id}
# ------------------------------------------------------------------------------
class AppointmentUpdate(BaseModel):
    """
    Schema for updating an existing appointment.
    All fields are optional — only include what you want to change.
    Used in: PUT /appointments/{id}
    """

    appointment_date: Optional[str] = Field(
        default=None,
        description="New appointment date in YYYY-MM-DD format",
        examples=["2024-12-26"]
    )

    appointment_time: Optional[str] = Field(
        default=None,
        description="New appointment time",
        examples=["2:00 PM"]
    )

    reason: Optional[str] = Field(
        default=None,
        description="Updated reason for the visit"
    )

    notes: Optional[str] = Field(
        default=None,
        description="Doctor/admin notes about the appointment"
    )

    @field_validator("appointment_date")
    @classmethod
    def validate_date_format(cls, value: Optional[str]) -> Optional[str]:
        """
        WHY: If a date is provided in an update, it must still be valid format.
        INPUT: Optional appointment_date string
        OUTPUT: Validated date string or None
        """
        if value is None:
            return value
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            raise ValueError("appointment_date must be in YYYY-MM-DD format")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "appointment_date": "2024-12-26",
                    "appointment_time": "2:00 PM"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# APPOINTMENT STATUS UPDATE SCHEMA (REQUEST)
# WHY: Admins and doctors can update only the status of an appointment
#      (e.g., confirm it, mark it completed, or cancel it).
#      This is a separate schema to keep the update action focused.
# INPUT: Sent in the request body of PATCH /appointments/{id}/status
# ------------------------------------------------------------------------------
class AppointmentStatusUpdate(BaseModel):
    """
    Schema for updating only the status of an appointment.
    Used by admins to confirm, complete, or cancel appointments.
    Used in: PATCH /appointments/{id}/status (admin only)
    """

    status: AppointmentStatus = Field(
        ...,
        description="New appointment status",
        examples=["confirmed"]
    )

    # Optional notes added when changing status (e.g., cancellation reason)
    notes: Optional[str] = Field(
        default=None,
        description="Optional notes about the status change",
        examples=["Confirmed by Dr. Sarah's receptionist"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "status": "confirmed",
                    "notes": "Confirmed by reception. Please arrive 15 minutes early."
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# PATIENT BRIEF & DOCTOR BRIEF SCHEMAS
# WHY: When returning appointment details, we embed brief user/doctor summaries
#      so the client doesn't need extra API calls to show who the appointment
#      is between.
# OUTPUT: Nested inside AppointmentResponse
# ------------------------------------------------------------------------------
class PatientBrief(BaseModel):
    """Brief patient (user) info nested inside appointment responses."""
    id: int
    full_name: str
    email: str

    model_config = {"from_attributes": True}


class DoctorBrief(BaseModel):
    """Brief doctor info nested inside appointment responses."""
    id: int
    full_name: str
    specialization: str

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------------------
# APPOINTMENT RESPONSE SCHEMA (RESPONSE)
# WHY: Defines the full appointment data returned from API responses.
#      Includes nested patient and doctor briefs for complete context.
# OUTPUT: Returned from GET /appointments, POST /appointments, etc.
# ------------------------------------------------------------------------------
class AppointmentResponse(BaseModel):
    """
    Schema for returning appointment data in API responses.
    Includes brief nested user (patient) and doctor objects.
    Used in: GET /appointments, POST /appointments, PUT /appointments/{id}
    """

    id: int = Field(description="Unique appointment ID")
    user_id: int = Field(description="Patient's user ID")
    doctor_id: int = Field(description="Doctor's ID")
    appointment_date: str = Field(description="Appointment date (YYYY-MM-DD)")
    appointment_time: str = Field(description="Appointment time")
    status: AppointmentStatus = Field(description="Current appointment status")
    reason: Optional[str] = Field(description="Reason for the visit")
    notes: Optional[str] = Field(description="Doctor/admin notes")

    # Nested brief objects for richer responses
    user: Optional[PatientBrief] = Field(
        default=None,
        description="Brief patient info"
    )
    doctor: Optional[DoctorBrief] = Field(
        default=None,
        description="Brief doctor info"
    )

    created_at: datetime = Field(description="Booking creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "user_id": 2,
                    "doctor_id": 1,
                    "appointment_date": "2024-12-25",
                    "appointment_time": "10:00 AM",
                    "status": "confirmed",
                    "reason": "Chest pain",
                    "notes": "Please bring previous ECG reports",
                    "user": {"id": 2, "full_name": "John Smith", "email": "john@email.com"},
                    "doctor": {"id": 1, "full_name": "Dr. Sarah Johnson", "specialization": "Cardiologist"},
                    "created_at": "2024-12-20T09:00:00Z",
                    "updated_at": "2024-12-21T11:00:00Z"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# APPOINTMENT LIST RESPONSE SCHEMA (RESPONSE)
# WHY: Returns a paginated list of appointments with a total count.
# OUTPUT: Returned from GET /appointments
# ------------------------------------------------------------------------------
class AppointmentListResponse(BaseModel):
    """
    Schema for returning a paginated list of appointments.
    Used in: GET /appointments
    """

    total: int = Field(description="Total number of appointments")
    appointments: List[AppointmentResponse] = Field(
        description="List of appointment objects"
    )

    model_config = {"from_attributes": True}
