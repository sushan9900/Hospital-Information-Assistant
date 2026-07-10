# ==============================================================================
# Hospital Information Assistance — Department Model
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines the "departments" table in our PostgreSQL database.
#   A hospital department is a unit like "Cardiology", "Neurology", "Pediatrics"
#   etc. Doctors belong to departments, and this model captures that structure.
#
# RELATIONSHIPS:
#   Department has many → Doctors (one department has many doctors)
#   Department has many → Appointments (indirectly, through doctors)
# ==============================================================================

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ------------------------------------------------------------------------------
# DEPARTMENT MODEL (DATABASE TABLE)
# WHY: Represents the "departments" table — stores all hospital departments.
# WHAT: Each row is one hospital department (e.g., Cardiology, Orthopedics).
# ------------------------------------------------------------------------------
class Department(Base):
    """
    SQLAlchemy model for the 'departments' database table.

    Columns:
        id           - Primary key, auto-incremented integer
        name         - Department name (e.g., "Cardiology") — must be unique
        description  - Detailed description of the department's services
        location     - Physical location in the hospital (e.g., "Floor 2, Wing B")
        phone        - Contact phone number for the department
        created_at   - Timestamp when the record was created (auto-set)
        updated_at   - Timestamp when the record was last updated (auto-set)

    Relationships:
        doctors      - All doctors who belong to this department
    """

    # The name of the database table this model maps to
    __tablename__ = "departments"

    # --------------------------------------------------------------------------
    # PRIMARY KEY
    # WHY: Unique identifier for each department.
    # WHAT: Auto-incrementing integer primary key.
    # --------------------------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    # --------------------------------------------------------------------------
    # DEPARTMENT NAME
    # WHY: The human-readable name of the department shown in the UI.
    # WHAT: Required, unique string. No two departments can share the same name.
    # --------------------------------------------------------------------------
    name = Column(
        String(150),
        nullable=False,  # Required
        unique=True,     # e.g., only one "Cardiology" department
        index=True       # Indexed for fast search by name
    )

    # --------------------------------------------------------------------------
    # DESCRIPTION
    # WHY: Gives patients and staff detailed information about the department.
    # WHAT: Optional longer text describing services offered.
    # --------------------------------------------------------------------------
    description = Column(
        Text,           # Text allows long content (unlike String which is limited)
        nullable=True   # Optional — can be left empty
    )

    # --------------------------------------------------------------------------
    # LOCATION
    # WHY: Helps patients physically find the department inside the hospital.
    # WHAT: Optional short string like "Block A, Floor 3".
    # --------------------------------------------------------------------------
    location = Column(
        String(200),
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # PHONE NUMBER
    # WHY: Allows patients to directly contact the department.
    # WHAT: Optional string (stored as text to support international formats).
    # --------------------------------------------------------------------------
    phone = Column(
        String(20),
        nullable=True  # Optional
    )

    # --------------------------------------------------------------------------
    # TIMESTAMPS
    # WHY: Tracks when department records were created and last changed.
    # WHAT:
    #   - created_at: Set once when the record is first inserted
    #   - updated_at: Automatically updated every time the record changes
    # --------------------------------------------------------------------------
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()  # Set by DB to current timestamp on INSERT
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),  # Set on INSERT
        onupdate=func.now()         # Automatically updated on UPDATE
    )

    # --------------------------------------------------------------------------
    # RELATIONSHIPS
    # WHY: Links Department to Doctor so we can access all doctors in a
    #      department easily: department.doctors → list of Doctor objects
    # WHAT: One department has many doctors (one-to-many relationship).
    # --------------------------------------------------------------------------

    # One department has many doctors
    # Access like: department.doctors → list of Doctor objects
    doctors = relationship(
        "Doctor",
        back_populates="department",
        cascade="all, delete-orphan",  # Deleting a department also removes its doctors
        lazy="select"
    )

    # --------------------------------------------------------------------------
    # STRING REPRESENTATION
    # WHY: Useful for debugging — shows meaningful info when printing this object.
    # --------------------------------------------------------------------------
    def __repr__(self) -> str:
        return f"<Department id={self.id} name='{self.name}'>"
