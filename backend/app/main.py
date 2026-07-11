# ==============================================================================
# Hospital Information Assistance — Main Application Entrypoint
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This is the bootstrap entrypoint of our FastAPI application.
#   It initializes the FastAPI app, configures middleware (CORS), connects the
#   lifespan event handlers (database seeding and health checks), and registers
#   all API routers.
#
# HOW IT BOOTSTRAPS:
#   1. Read settings (debug, CORS origins, API keys)
#   2. Define a lifespan context (starts up DB connection and creates tables)
#   3. Create the FastAPI instance
#   4. Add CORS middleware to allow the frontend to access endpoints
#   5. Add root/health endpoints
#   6. Register all routers with prefixes and tags for Swagger docs
# ==============================================================================

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, check_database_connection, create_all_tables

# Setup basic logging to monitor startup events
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# APPLICATION LIFESPAN
# WHY: Lifespan is the modern FastAPI way to run setup and teardown code.
#      It runs BEFORE the server starts accepting requests, and AFTER it stops.
# WHAT:
#   - Startup: Checks DB connection and creates tables if they don't exist.
#   - Shutdown: Cleans up resources.
# ------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting up Hospital Information Assistance application...")
    
    try:
        # Step 1: Check database connectivity to Neon Cloud postgres
        logger.info("Checking database connection...")
        await check_database_connection()
        logger.info("Database connection verified successfully.")

        # Step 2: Auto-create tables if they don't exist
        # Replaces running manual SQL scripts on first run
        logger.info("Initializing database tables...")
        await create_all_tables()
        logger.info("Database tables initialized successfully.")

        # Step 3: Pre-load FastEmbed embedding model to avoid first-request latency
        logger.info("Pre-loading FastEmbed embedding model...")
        import asyncio
        from app.services.qdrant_service import get_embedding_model
        await asyncio.to_thread(get_embedding_model)
        logger.info("FastEmbed embedding model loaded successfully.")
        
    except Exception as e:
        logger.error(f"Startup database initialization failed: {str(e)}")
        # In a real environment, you might want to raise and halt, 
        # but we continue so the API can at least run and return health errors.

    yield  # Application runs here

    # Shutdown actions
    logger.info("Shutting down Hospital Information Assistance application...")


# ------------------------------------------------------------------------------
# FASTAPI INSTANCE CREATION
# WHY: Sets up the main API application.
# WHAT: Configures metadata, OpenAPI doc paths, and ties in the lifespan.
# ------------------------------------------------------------------------------
app = FastAPI(
    title="Hospital Information Assistance API",
    description="""
    Backend API for the Hospital Information Assistance system.
    Supports user registration, authentication, appointment scheduling,
    hospital department/doctor lookups, and AI chatbot (RAG + conversation memory).
    """,
    version="1.0.0",
    docs_url="/docs",      # Swagger UI endpoint
    redoc_url="/redoc",    # ReDoc alternative UI
    lifespan=lifespan       # Lifespan manager defined above
)


# ------------------------------------------------------------------------------
# CORS MIDDLEWARE
# WHY: Cross-Origin Resource Sharing (CORS) allows the web browser to make
#      API requests from a different origin (e.g. localhost:5173 frontend
#      connecting to localhost:8000 backend).
# WHAT: Configures CORS headers to allow frontend access.
# ------------------------------------------------------------------------------
# Default allow-all for development if BACKEND_CORS_ORIGINS is empty
# ------------------------------------------------------------------------------
# CORS MIDDLEWARE
# ------------------------------------------------------------------------------
origins = settings.get_allowed_origins()
# Ensure standard development and production origins are also allowed
fallback_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://hospital-information-assistant.vercel.app",
]
for origin in fallback_origins:
    if origin not in origins:
        origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# ROOT ENDPOINT
# WHY: A basic landing page when visiting the server root (e.g., http://localhost:8000).
# WHAT: Returns status and documentation links.
# ------------------------------------------------------------------------------
@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    tags=["Root"],
    summary="Root landing page"
)
async def root():
    return {
        "project": "Hospital Information Assistance",
        "version": "1.0.0",
        "status": "Running",
        "documentation": "/docs",
        "alternative_documentation": "/redoc"
    }


# ------------------------------------------------------------------------------
# HEALTH CHECK ENDPOINT
# WHY: Monitoring tools (like Render or Docker health checks) ping this route
#      to verify the application is fully operational and connected to the DB.
# WHAT: Performs a database connection test and returns status.
# ------------------------------------------------------------------------------
@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    tags=["Health"],
    summary="API Health Check"
)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Performs a health check on the API and database.
    Returns 200 OK if healthy, 500 if database connection fails.
    """
    try:
        # Check connection using our helper
        await check_database_connection()
        return {
            "status": "healthy",
            "database": "connected",
            "services": {
                "embeddings": "FastEmbed (local model initialized)",
                "ai": "Groq Cloud API configured"
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


# ------------------------------------------------------------------------------
# REGISTER ROUTERS
# WHY: Separating routers into different files keeps the codebase modular.
#      We import each router and mount it to a specific URL prefix.
# ------------------------------------------------------------------------------
# 1. Authentication Router (register, login, me)
from app.routers.auth import router as auth_router
app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"]
)

# 2. Users Router (profile management, deactivate, admin list)
from app.routers.users import router as users_router
app.include_router(
    users_router,
    prefix="/users",
    tags=["Users"]
)

# 3. Departments Router (list, details, admin CRUD)
from app.routers.departments import router as departments_router
app.include_router(
    departments_router,
    prefix="/departments",
    tags=["Departments"]
)

# 4. Doctors Router (list, details, admin CRUD)
from app.routers.doctors import router as doctors_router
app.include_router(
    doctors_router,
    prefix="/doctors",
    tags=["Doctors"]
)

# 5. Appointments Router (booking, rescheduling, cancel, status updates)
from app.routers.appointments import router as appointments_router
app.include_router(
    appointments_router,
    prefix="/appointments",
    tags=["Appointments"]
)

# 6. Chatbot Router (session-based AI conversational assistant)
from app.routers.chatbot import router as chatbot_router
app.include_router(
    chatbot_router,
    prefix="/chat",
    tags=["Chatbot"]
)

# 7. RAG Router (vector indexing and search queries)
from app.routers.rag import router as rag_router
app.include_router(
    rag_router,
    prefix="/rag",
    tags=["RAG"]
)
