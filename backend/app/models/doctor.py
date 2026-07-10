# ==============================================================================
# Hospital Information Assistance — Doctor Model
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines the "doctors" table in our PostgreSQL database.
#   A doctor belongs to a department and can have many appointments.
#   Doctor records are also used as the data source for the RAG system —
#   doctor profiles are embedded into Qdrant for semantic search.
#
# RELATIONSHIPS:
#   Doctor belongs to → Department (many doctors belong to one department)
#   Doctor has many  → Appointments (one doctor can have many appointments)
# ==============================================================================

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ------------------------------------------------------------------------------
# DOCTOR MODEL (DATABASE TABLE)
# WHY: Represents the "doctors" table — stores all doctor profiles.
# WHAT: Each row is one doctor profile in the hospital.
# ------------------------------------------------------------------------------
class Doctor(Base):
    """
    SQLAlchemy model for the 'doctors' database table.

    Columns:
        id              - Primary key, auto-incremented integer
        full_name       - Doctor's full name (e.g., "Dr. Sarah Johnson")
        specialization  - Medical specialization (e.g., "Cardiologist")
        qualification   - Academic qualifications (e.g., "MBBS, MD, DM")
        experience_years- Years of professional experience
        department_id   - Foreign key linking to the departments table
        email           - Doctor's contact email (optional)
        phone           - Doctor's contact phone (optional)
        bio             - Detailed biography / profile description
        consultation_fee- Consultation fee in local currency (optional)
        available_days  - Days the doctor is available (e.g., "Mon, Wed, Fri")
        created_at      - Timestamp when the record was created (auto-set)
        updated_at      - Timestamp when the record was last updated (auto-set)

    Relationships:
        department      - The Department this doctor belongs to
        appointments    - All appointments booked with this doctor
    """

    # The name of the database table this model maps to
    __tablename__ = "doctors"

    # --------------------------------------------------------------------------
    # PRIMARY KEY
    # WHY: Unique identifier for each doctor.
    # WHAT: Auto-incrementing integer primary key.
    # --------------------------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    # --------------------------------------------------------------------------
    # FULL NAME
    # WHY: The doctor's display name shown throughout the application.
    # WHAT: Required string with max 150 characters.
    # --------------------------------------------------------------------------
    full_name = Column(
        String(150),
        nullable=False,  # Required
        index=True       # Indexed for faster name-based searches
    )

    # --------------------------------------------------------------------------
    # SPECIALIZATION
    # WHY: Tells patients what medical area the doctor specializes in.
    # WHAT: Required string (e.g., "Cardiologist", "Neurologist").
    # --------------------------------------------------------------------------
    specialization = Column(
        String(150),
        nullable=False,  # Required
        index=True       # Indexed for filtering doctors by specialization
    )

    # --------------------------------------------------------------------------
    # QUALIFICATION
    # WHY: Displays the doctor's academic credentials to build patient trust.
    # WHAT: Optional string (e.g., "MBBS, MD, DM Cardiology").
    # --------------------------------------------------------------------------
    qualification = Column(
        String(255),
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # EXPERIENCE YEARS
    # WHY: Helps patients choose experienced doctors.
    # WHAT: Optional integer representing years of experience.
    # --------------------------------------------------------------------------
    experience_years = Column(
        Integer,
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # DEPARTMENT FOREIGN KEY
    # WHY: Links the doctor to their hospital department.
    #      This is a foreign key — it references the "departments" table's "id".
    # WHAT: If the department is deleted, this doctor is also deleted (CASCADE).
    # --------------------------------------------------------------------------
    department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",      # References the id column in departments table
            ondelete="CASCADE"     # If dept is deleted, delete this doctor too
        ),
        nullable=False,            # Every doctor must belong to a department
        index=True                 # Indexed for fast department-based filtering
    )

    # --------------------------------------------------------------------------
    # EMAIL
    # WHY: Provides a way to contact the doctor directly.
    # WHAT: Optional unique email address.
    # --------------------------------------------------------------------------
    email = Column(
        String(255),
        nullable=True,
        unique=True  # No two doctors can share the same email
    )

    # --------------------------------------------------------------------------
    # PHONE
    # WHY: Direct contact number for the doctor's clinic/office.
    # WHAT: Optional string (stored as text for international format support).
    # --------------------------------------------------------------------------
    phone = Column(
        String(20),
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # BIO
    # WHY: A detailed profile description used in the UI and also indexed
    #      into Qdrant as the text content for semantic/RAG search.
    # WHAT: Optional long text field.
    # --------------------------------------------------------------------------
    bio = Column(
        Text,
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # CONSULTATION FEE
    # WHY: Helps patients know the cost before booking an appointment.
    # WHAT: Optional string (stored as string to support currency formatting).
    # --------------------------------------------------------------------------
    consultation_fee = Column(
        String(50),
        nullable=True  # Optional (e.g., "500", "Free", "500-1000")
    )

    # --------------------------------------------------------------------------
    # AVAILABLE DAYS
    # WHY: Tells patients which days the doctor is available for consultation.
    # WHAT: Optional string (e.g., "Monday, Wednesday, Friday").
    # --------------------------------------------------------------------------
    available_days = Column(
        String(200),
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # TIMESTAMPS
    # WHY: Tracks when doctor records were created and last updated.
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
    # WHY: Links Doctor back to Department and forward to Appointments.
    #      Allows access like: doctor.department or doctor.appointments
    # --------------------------------------------------------------------------

    # Many doctors belong to one department
    # Access like: doctor.department → Department object
    department = relationship(
        "Department",
        back_populates="doctors",
        lazy="select"
    )

    # One doctor can have many appointments
    # Access like: doctor.appointments → list of Appointment objects
    appointments = relationship(
        "Appointment",
        back_populates="doctor",
        cascade="all, delete-orphan",  # Deleting doctor removes their appointments
        lazy="select"
    )

    # --------------------------------------------------------------------------
    # STRING REPRESENTATION
    # WHY: Useful for debugging — shows meaningful info when printing this object.
    # --------------------------------------------------------------------------
    def __repr__(self) -> str:
        return f"<Doctor id={self.id} name='{self.full_name}' specialization='{self.specialization}'>"
