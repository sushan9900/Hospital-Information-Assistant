# ==============================================================================
# Hospital Information Assistance — Appointment Model
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines the "appointments" table in our PostgreSQL database.
#   An appointment links a Patient (User) to a Doctor on a specific date/time.
#   It is the core transactional table of the hospital management system.
#
# RELATIONSHIPS:
#   Appointment belongs to → User    (the patient who booked it)
#   Appointment belongs to → Doctor  (the doctor being visited)
# ==============================================================================

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# ------------------------------------------------------------------------------
# APPOINTMENT STATUS ENUM
# WHY: Restricts the status to only valid values — prevents typos like
#      "pendingg" or "canceld" from being stored in the database.
# WHAT: Defines the lifecycle states of an appointment.
# ------------------------------------------------------------------------------
class AppointmentStatus(str, enum.Enum):
    """
    Defines the possible statuses for an appointment.

    - pending:   Appointment booked but not yet confirmed by the hospital
    - confirmed: Appointment confirmed and scheduled
    - completed: Appointment has taken place
    - cancelled: Appointment was cancelled by the patient or doctor
    """
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"


# ------------------------------------------------------------------------------
# APPOINTMENT MODEL (DATABASE TABLE)
# WHY: Represents the "appointments" table — the core booking table.
# WHAT: Each row is one appointment booking between a patient and a doctor.
# ------------------------------------------------------------------------------
class Appointment(Base):
    """
    SQLAlchemy model for the 'appointments' database table.

    Columns:
        id              - Primary key, auto-incremented integer
        user_id         - Foreign key → users.id (the patient)
        doctor_id       - Foreign key → doctors.id (the doctor)
        appointment_date- The date of the appointment (YYYY-MM-DD)
        appointment_time- The time slot (e.g., "10:00 AM")
        status          - Current status: pending / confirmed / completed / cancelled
        reason          - Reason for the visit (patient-provided, optional)
        notes           - Doctor/admin notes about the appointment (optional)
        created_at      - Timestamp when the booking was made (auto-set)
        updated_at      - Timestamp when the record was last updated (auto-set)

    Relationships:
        user            - The User (patient) who booked this appointment
        doctor          - The Doctor this appointment is with
    """

    # The name of the database table this model maps to
    __tablename__ = "appointments"

    # --------------------------------------------------------------------------
    # PRIMARY KEY
    # WHY: Unique identifier for each appointment booking.
    # WHAT: Auto-incrementing integer primary key.
    # --------------------------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    # --------------------------------------------------------------------------
    # USER (PATIENT) FOREIGN KEY
    # WHY: Links the appointment to the patient who booked it.
    #      References the "users" table's "id" column.
    # WHAT: If the user is deleted, their appointments are also deleted (CASCADE).
    # --------------------------------------------------------------------------
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",        # References the id column in the users table
            ondelete="CASCADE" # If user is deleted, delete their appointments too
        ),
        nullable=False,        # Every appointment must have a patient
        index=True             # Indexed for fast "my appointments" queries
    )

    # --------------------------------------------------------------------------
    # DOCTOR FOREIGN KEY
    # WHY: Links the appointment to the doctor being visited.
    #      References the "doctors" table's "id" column.
    # WHAT: If the doctor is deleted, their appointments are also deleted (CASCADE).
    # --------------------------------------------------------------------------
    doctor_id = Column(
        Integer,
        ForeignKey(
            "doctors.id",      # References the id column in the doctors table
            ondelete="CASCADE" # If doctor is deleted, delete their appointments too
        ),
        nullable=False,        # Every appointment must have a doctor
        index=True             # Indexed for fast "doctor's appointments" queries
    )

    # --------------------------------------------------------------------------
    # APPOINTMENT DATE
    # WHY: Stores which day the appointment is scheduled for.
    # WHAT: Stored as a string (e.g., "2024-12-25") for simplicity.
    #       Can be converted to date type if stricter validation is needed.
    # --------------------------------------------------------------------------
    appointment_date = Column(
        String(20),
        nullable=False  # Required — every appointment must have a date
    )

    # --------------------------------------------------------------------------
    # APPOINTMENT TIME
    # WHY: Stores the time slot for the appointment.
    # WHAT: Stored as a string (e.g., "10:00 AM", "14:30").
    # --------------------------------------------------------------------------
    appointment_time = Column(
        String(20),
        nullable=False  # Required — every appointment must have a time slot
    )

    # --------------------------------------------------------------------------
    # STATUS
    # WHY: Tracks the lifecycle of the appointment from booking to completion.
    # WHAT: Enum column with values: pending, confirmed, completed, cancelled.
    #       New appointments start as "pending" by default.
    # --------------------------------------------------------------------------
    status = Column(
        SAEnum(AppointmentStatus, name="appointmentstatus"),
        nullable=False,
        default=AppointmentStatus.pending,             # New bookings start as pending
        server_default=AppointmentStatus.pending.value
    )

    # --------------------------------------------------------------------------
    # REASON FOR VISIT
    # WHY: Helps the doctor prepare before the appointment.
    #      Also useful for the AI chatbot to provide context-aware responses.
    # WHAT: Optional text description of why the patient is visiting.
    # --------------------------------------------------------------------------
    reason = Column(
        Text,
        nullable=True  # Optional — patient may or may not provide a reason
    )

    # --------------------------------------------------------------------------
    # NOTES
    # WHY: Allows doctors or admins to add follow-up notes about the appointment.
    #      Could include prescriptions, diagnoses, or instructions.
    # WHAT: Optional text field, editable after the appointment.
    # --------------------------------------------------------------------------
    notes = Column(
        Text,
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # TIMESTAMPS
    # WHY: Tracks when the appointment was booked and last modified.
    # --------------------------------------------------------------------------
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()  # Set by DB on INSERT
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),  # Set on INSERT
        onupdate=func.now()         # Automatically updated on UPDATE
    )

    # --------------------------------------------------------------------------
    # RELATIONSHIPS
    # WHY: Links Appointment back to User and Doctor for easy access.
    #      Allows: appointment.user → User object
    #              appointment.doctor → Doctor object
    # --------------------------------------------------------------------------

    # Many appointments belong to one user (patient)
    # Access like: appointment.user → User object
    user = relationship(
        "User",
        back_populates="appointments",
        lazy="select"
    )

    # Many appointments belong to one doctor
    # Access like: appointment.doctor → Doctor object
    doctor = relationship(
        "Doctor",
        back_populates="appointments",
        lazy="select"
    )

    # --------------------------------------------------------------------------
    # STRING REPRESENTATION
    # WHY: Useful for debugging — shows meaningful info when printing.
    # --------------------------------------------------------------------------
    def __repr__(self) -> str:
        return (
            f"<Appointment id={self.id} "
            f"user_id={self.user_id} "
            f"doctor_id={self.doctor_id} "
            f"date='{self.appointment_date}' "
            f"status='{self.status}'>"
        )
