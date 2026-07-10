# ==============================================================================
# Hospital Information Assistance — Database Configuration
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file sets up the connection between our FastAPI application and the
#   PostgreSQL database hosted on Neon Cloud.
#
# HOW IT WORKS:
#   - SQLAlchemy creates an "engine" (the actual database connection pool)
#   - A "SessionLocal" factory is used to create individual DB sessions
#   - The "Base" class is the parent class that all SQLAlchemy models inherit
#   - We use ASYNC mode so the app can handle many requests simultaneously
#     without blocking (better performance)
#
# USAGE:
#   - Import `Base` in models to define database tables
#   - Import `get_db` in routers/dependencies for database access
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings


# ------------------------------------------------------------------------------
# DATABASE ENGINE
# WHY: The engine is the core connection to the database.
#      It manages the connection pool (reuses connections for performance).
# WHAT: Creates an async engine using the DATABASE_URL from .env
# ------------------------------------------------------------------------------
engine = create_async_engine(
    # The database URL from our config (e.g., postgresql+asyncpg://user:pass@host/db)
    url=settings.DATABASE_URL,

    # echo=True prints all SQL queries to the console (useful for debugging)
    # Set to False in production to keep logs clean
    echo=settings.DEBUG,

    # pool_pre_ping=True checks if the connection is still alive before using it
    # This prevents errors when the database connection drops (common with Neon)
    pool_pre_ping=True,

    # pool_size: Number of connections to keep open at all times
    pool_size=5,

    # max_overflow: Extra connections allowed when pool is full
    max_overflow=10,

    # Pass driver-specific configurations inside connect_args
    connect_args={
        # Disable prepared statement cache to support Supabase connection pooler (pgBouncer)
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0
    }
)


# ------------------------------------------------------------------------------
# SESSION FACTORY
# WHY: Instead of one global database connection, we create a new "session"
#      for each API request and close it when the request is done.
#      This is safer and prevents data from leaking between requests.
# WHAT: async_sessionmaker creates session objects from the engine.
# ------------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    # Use the engine we created above
    bind=engine,

    # The class to use for sessions
    class_=AsyncSession,

    # autocommit=False means we must manually call session.commit()
    # This gives us full control over when data is saved
    autocommit=False,

    # autoflush=False means SQLAlchemy won't automatically sync changes to DB
    # We control this manually for predictability
    autoflush=False,

    # expire_on_commit=False keeps objects usable after commit
    # Without this, accessing an object after commit would cause a DB query
    expire_on_commit=False,
)


# ------------------------------------------------------------------------------
# DECLARATIVE BASE
# WHY: All SQLAlchemy models (User, Doctor, etc.) must inherit from this Base.
#      SQLAlchemy uses Base to know which classes represent database tables.
# WHAT: A base class for all ORM models in the application.
#
# USAGE in models:
#   from app.database import Base
#
#   class User(Base):
#       __tablename__ = "users"
#       ...
# ------------------------------------------------------------------------------
class Base(DeclarativeBase):
    """
    Base class for all database models.
    Every model (User, Doctor, Department, etc.) must inherit from this.
    """
    pass


# ------------------------------------------------------------------------------
# DATABASE SESSION DEPENDENCY
# WHY: FastAPI uses "dependency injection" to provide a DB session to each
#      router function. This function opens a session, gives it to the router,
#      and automatically closes it when the request finishes — even on errors.
# WHAT: An async generator that yields a database session.
# INPUT: None (called automatically by FastAPI)
# OUTPUT: Yields an AsyncSession object for database operations
#
# USAGE in routers:
#   from app.database import get_db
#   from sqlalchemy.ext.asyncio import AsyncSession
#   from fastapi import Depends
#
#   async def my_endpoint(db: AsyncSession = Depends(get_db)):
#       result = await db.execute(...)
# ------------------------------------------------------------------------------
async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides a database session per request.
    Automatically closes the session when the request is complete.
    """
    # Open a new database session for this request
    async with AsyncSessionLocal() as session:
        try:
            # Yield the session to the router function
            # Everything inside the router runs here
            yield session

            # If everything went well, commit the transaction
            await session.commit()

        except Exception:
            # If anything went wrong, rollback all changes
            # This ensures the database stays in a consistent state
            await session.rollback()

            # Re-raise the exception so FastAPI can handle it properly
            raise

        finally:
            # Always close the session when the request is done
            # This returns the connection back to the pool
            await session.close()


# ------------------------------------------------------------------------------
# DATABASE HEALTH CHECK
# WHY: Used to verify the database connection is working.
#      Called during application startup to catch misconfigurations early.
# WHAT: Runs a simple "SELECT 1" query — the simplest possible DB operation.
# INPUT: None
# OUTPUT: True if connected, raises an exception if not
# ------------------------------------------------------------------------------
async def check_database_connection() -> bool:
    """
    Verifies that the database connection is working.
    Runs a simple SELECT 1 query to test connectivity.
    Returns True on success, raises an exception on failure.
    """
    async with AsyncSessionLocal() as session:
        # Execute a minimal query to test the connection
        result = await session.execute(text("SELECT 1"))

        # If we reach here, the connection is working
        return True


# ------------------------------------------------------------------------------
# CREATE ALL TABLES
# WHY: During development, we can auto-create database tables from our models.
#      This is a quick alternative to running Alembic migrations.
# WHAT: Creates all tables defined in SQLAlchemy models (that imported Base).
# INPUT: None
# OUTPUT: Creates tables in the database if they don't exist
#
# NOTE: Call this in main.py during startup (lifespan event).
#       In production, use Alembic migrations instead.
# ------------------------------------------------------------------------------
async def create_all_tables():
    """
    Creates all database tables defined in our SQLAlchemy models.
    Uses the metadata from Base to find all model definitions.
    Should only be called during application startup.
    """
    async with engine.begin() as conn:
        # Import all models here so Base knows about their table definitions
        # This must be done before create_all() is called
        from app.models import user, doctor, department, appointment, chat_session  # noqa: F401

        # Create all tables that don't already exist
        # If a table already exists, it will NOT be dropped or modified
        await conn.run_sync(Base.metadata.create_all)
