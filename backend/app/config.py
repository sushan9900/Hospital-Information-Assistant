# ==============================================================================
# Hospital Information Assistance — Application Configuration
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file reads all environment variables from the .env file and makes them
#   available as a typed Python object throughout the entire application.
#   Using pydantic-settings ensures all required values are present at startup.
#
# HOW IT WORKS:
#   - pydantic-settings reads the .env file automatically
#   - Every variable is type-checked (e.g., int, str, bool)
#   - If a required variable is missing, the app will crash with a clear error
#   - Import `settings` anywhere in the app to access configuration values
# ==============================================================================

from dotenv import load_dotenv
load_dotenv(override=True)

from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All fields here must be present in your .env file.
    pydantic-settings will automatically read from .env.
    """

    # --------------------------------------------------------------------------
    # Application Settings
    # Basic metadata about the application shown in Swagger UI and logs.
    # --------------------------------------------------------------------------

    # Name of the application
    APP_NAME: str = "Hospital Information Assistance"

    # Version of the application
    APP_VERSION: str = "1.0.0"

    # Whether to run in debug mode (shows extra error details)
    DEBUG: bool = False

    # The running environment: "development" or "production"
    ENVIRONMENT: str = "development"

    # --------------------------------------------------------------------------
    # CORS (Cross-Origin Resource Sharing) Settings
    # Controls which frontend URLs are allowed to call this backend.
    # In development: usually http://localhost:5173 (Vite dev server)
    # In production: your Vercel frontend URL
    # --------------------------------------------------------------------------

    # List of allowed frontend origins, separated by commas in .env
    # Example: "http://localhost:5173,https://your-app.vercel.app"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    def get_allowed_origins(self) -> List[str]:
        """
        WHY: FastAPI's CORS middleware expects a Python list, not a string.
        WHAT: Splits the comma-separated ALLOWED_ORIGINS string into a list.
        OUTPUT: List of allowed origin strings.
        """
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # --------------------------------------------------------------------------
    # Database Settings
    # Connection URLs for PostgreSQL hosted on Neon.
    # Two URLs are needed:
    #   - Async URL (asyncpg driver) — used by SQLAlchemy for API requests
    #   - Sync URL (psycopg2 driver) — used by Alembic for DB migrations
    # --------------------------------------------------------------------------

    # Async database URL for SQLAlchemy (format: postgresql+asyncpg://...)
    DATABASE_URL: str

    # Sync database URL for Alembic migrations (format: postgresql+psycopg2://...)
    SYNC_DATABASE_URL: str

    # --------------------------------------------------------------------------
    # JWT Authentication Settings
    # Used to create and verify secure login tokens.
    # --------------------------------------------------------------------------

    # Secret key used to sign JWT tokens — must be long and random
    SECRET_KEY: str

    # JWT signing algorithm (HS256 is the industry standard)
    ALGORITHM: str = "HS256"

    # How many minutes a token stays valid before expiring
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # --------------------------------------------------------------------------
    # Groq AI Settings
    # Used for both the AI chatbot and the RAG pipeline.
    # Get your key at: https://console.groq.com
    # --------------------------------------------------------------------------

    # Your Groq API key (required for any AI feature to work)
    GROQ_API_KEY: str

    # The Groq language model to use
    # Options: "llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"
    GROQ_MODEL: str = "llama3-8b-8192"

    # --------------------------------------------------------------------------
    # Qdrant Vector Database Settings
    # Used to store and search document embeddings for RAG.
    # Get your cluster at: https://cloud.qdrant.io
    # --------------------------------------------------------------------------

    # The URL of your Qdrant Cloud cluster
    QDRANT_URL: str

    # Your Qdrant API key
    QDRANT_API_KEY: str

    # The name of the collection where embeddings are stored
    QDRANT_COLLECTION_NAME: str = "hospital_info"

    # --------------------------------------------------------------------------
    # Embedding Model Settings
    # FastEmbed runs locally — no API key needed.
    # Model: BAAI/bge-small-en-v1.5 (384-dimensional, cosine similarity)
    # --------------------------------------------------------------------------

    # The embedding model name (used by FastEmbed)
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

    # Number of vector dimensions the model produces
    EMBEDDING_DIMENSIONS: int = 384

    # --------------------------------------------------------------------------
    # Pydantic Settings Configuration
    # Tells pydantic-settings WHERE to read the environment variables from.
    # --------------------------------------------------------------------------

    class Config:
        # Read variables from the .env file in the same directory
        env_file = ".env"

        # Make variable names case-insensitive (DATABASE_URL == database_url)
        case_sensitive = False

        # Allow extra fields (won't crash if .env has extra variables)
        extra = "ignore"


# ------------------------------------------------------------------------------
# Create a single global instance of Settings.
# Import this `settings` object anywhere in the app to access configuration.
#
# Usage Example:
#   from app.config import settings
#   print(settings.APP_NAME)
#   print(settings.DATABASE_URL)
# ------------------------------------------------------------------------------
settings = Settings()
