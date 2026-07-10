# ==============================================================================
# Hospital Information Assistance — Models Package Init
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This __init__.py file turns the "models" folder into a Python package.
#   It also imports all models in the correct order so that:
#
#   1. SQLAlchemy's Base.metadata knows about ALL tables before create_all()
#   2. Relationships between models are registered correctly
#   3. Any file can import models cleanly with one line:
#      from app.models import User, Doctor, Department, Appointment, ChatSession
#
# IMPORT ORDER MATTERS:
#   Models with no foreign keys must be imported FIRST.
#   Models that depend on others (via FK) must be imported AFTER.
#
#   Correct Order:
#     1. User          — no foreign keys
#     2. Department    — no foreign keys
#     3. Doctor        — FK to Department
#     4. Appointment   — FK to User, Doctor
#     5. ChatSession   — FK to User
# ==============================================================================

# Import all models so SQLAlchemy Base.metadata registers their tables
from app.models.user import User, UserRole                          # noqa: F401
from app.models.department import Department                        # noqa: F401
from app.models.doctor import Doctor                                # noqa: F401
from app.models.appointment import Appointment, AppointmentStatus   # noqa: F401
from app.models.chat_session import ChatSession                     # noqa: F401

# List all public exports from this package
# This controls what gets imported when someone writes: from app.models import *
__all__ = [
    "User",
    "UserRole",
    "Department",
    "Doctor",
    "Appointment",
    "AppointmentStatus",
    "ChatSession",
]
