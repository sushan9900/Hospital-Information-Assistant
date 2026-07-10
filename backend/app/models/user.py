# ==============================================================================
# Hospital Information Assistance — User Model
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines the "users" table in our PostgreSQL database using
#   SQLAlchemy ORM. Instead of writing raw SQL, we define Python classes
#   and SQLAlchemy translates them into database tables automatically.
#
# WHAT IS AN ORM MODEL:
#   An ORM model is a Python class where:
#     - The class represents a TABLE in the database
#     - Each class attribute represents a COLUMN in that table
#     - Each instance of the class represents a ROW in that table
#
# RELATIONSHIPS:
#   User has many → Appointments (one user can book many appointments)
#   User has many → ChatSessions (one user can have many chat sessions)
# ==============================================================================

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# ------------------------------------------------------------------------------
# USER ROLE ENUM
# WHY: We use an Enum to restrict the role to only allowed values.
#      This prevents invalid data like role="superadmin" from being stored.
# WHAT: Defines the possible roles a user can have in the system.
# ------------------------------------------------------------------------------
class UserRole(str, enum.Enum):
    """
    Defines the allowed roles for a user account.
    - admin: Can manage doctors, departments, all appointments
    - patient: Regular user who can book appointments and use AI features
    """
    admin = "admin"
    patient = "patient"


# ------------------------------------------------------------------------------
# USER MODEL (DATABASE TABLE)
# WHY: Represents the "users" table — stores all registered user accounts.
# WHAT: Each row in this table is one registered user.
# ------------------------------------------------------------------------------
class User(Base):
    """
    SQLAlchemy model for the 'users' database table.

    Columns:
        id              - Primary key, auto-incremented integer
        full_name       - User's full name (required)
        email           - Unique email address used for login (required)
        hashed_password - Bcrypt-hashed password (NEVER store plain passwords)
        role            - User role: 'admin' or 'patient'
        is_active       - Whether the account is active (soft delete support)
        created_at      - Timestamp when the account was created (auto-set)
        updated_at      - Timestamp when the account was last updated (auto-set)

    Relationships:
        appointments    - All appointments booked by this user
        chat_sessions   - All AI chat sessions belonging to this user
    """

    # The name of the database table this model maps to
    __tablename__ = "users"

    # --------------------------------------------------------------------------
    # PRIMARY KEY
    # WHY: Every table needs a unique identifier for each row.
    # WHAT: Auto-incrementing integer — SQLAlchemy handles this automatically.
    # --------------------------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,   # This is the primary key
        index=True,         # Creates a DB index for faster lookups by id
        autoincrement=True  # Auto-increments with each new user
    )

    # --------------------------------------------------------------------------
    # FULL NAME
    # WHY: Stores the user's display name shown in the UI.
    # WHAT: A required string with a max length of 100 characters.
    # --------------------------------------------------------------------------
    full_name = Column(
        String(100),
        nullable=False  # Required — cannot be empty
    )

    # --------------------------------------------------------------------------
    # EMAIL
    # WHY: Used as the login identifier (username).
    # WHAT: Must be unique across all users. Indexed for fast login lookups.
    # --------------------------------------------------------------------------
    email = Column(
        String(255),
        nullable=False,  # Required
        unique=True,     # No two users can share the same email
        index=True       # Indexed for fast login queries
    )

    # --------------------------------------------------------------------------
    # HASHED PASSWORD
    # WHY: We NEVER store plain text passwords — it's a security risk.
    #      Bcrypt hashing makes it impossible to reverse the password.
    # WHAT: The bcrypt hash of the user's password.
    # --------------------------------------------------------------------------
    hashed_password = Column(
        String(255),
        nullable=False  # Required — every user must have a password
    )

    # --------------------------------------------------------------------------
    # ROLE
    # WHY: Different roles have different permissions in the system.
    #      Admin can manage hospital data; patients can book and chat.
    # WHAT: An enum column that stores either "admin" or "patient".
    # --------------------------------------------------------------------------
    role = Column(
        SAEnum(UserRole, name="userrole"),  # Uses the UserRole enum defined above
        nullable=False,
        default=UserRole.patient,            # New users are "patient" by default
        server_default=UserRole.patient.value
    )

    # --------------------------------------------------------------------------
    # IS ACTIVE
    # WHY: Instead of permanently deleting users (which could break foreign keys),
    #      we "soft delete" by setting is_active=False. The user still exists
    #      in the database but cannot log in.
    # WHAT: Boolean flag — True means the account is active.
    # --------------------------------------------------------------------------
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,         # New users are active by default
        server_default="true"
    )

    # --------------------------------------------------------------------------
    # TIMESTAMPS
    # WHY: Useful for auditing — knowing when records were created/changed.
    # WHAT:
    #   - created_at: Set once when the record is first inserted
    #   - updated_at: Automatically updated every time the record changes
    # The server_default and onupdate use the database server's clock.
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
    # WHY: Defines how the User table connects to other tables.
    #      SQLAlchemy uses these to allow easy access like: user.appointments
    # WHAT: back_populates creates a two-way link between related models.
    # --------------------------------------------------------------------------

    # One user can have many appointments
    # Access like: user.appointments → list of Appointment objects
    appointments = relationship(
        "Appointment",
        back_populates="user",
        cascade="all, delete-orphan",  # Deleting user also deletes their appointments
        lazy="select"
    )

    # One user can have many chat sessions
    # Access like: user.chat_sessions → list of ChatSession objects
    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",  # Deleting user also deletes their chat history
        lazy="select"
    )

    # --------------------------------------------------------------------------
    # STRING REPRESENTATION
    # WHY: Makes debugging easier — when you print a User object,
    #      you'll see something meaningful instead of <User object at 0x...>
    # --------------------------------------------------------------------------
    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
