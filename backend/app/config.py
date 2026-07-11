

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


    # Name of the application
    APP_NAME: str = "Hospital Information Assistance"

    # Version of the application
    APP_VERSION: str = "1.0.0"

    # Whether to run in debug mode (shows extra error details)
    DEBUG: bool = False

    # The running environment: "development" or "production"
    ENVIRONMENT: str = "development"

    
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    def get_allowed_origins(self) -> List[str]:
        """
        WHY: FastAPI's CORS middleware expects a Python list, not a string.
        WHAT: Splits the comma-separated ALLOWED_ORIGINS string into a list.
        OUTPUT: List of allowed origin strings.
        """
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


    # Async database URL for SQLAlchemy (format: postgresql+asyncpg://...)
    DATABASE_URL: str

    # Sync database URL for Alembic migrations (format: postgresql+psycopg2://...)
    SYNC_DATABASE_URL: str


    SECRET_KEY: str

    # JWT signing algorithm (HS256 is the industry standard)
    ALGORITHM: str = "HS256"

    # How many minutes a token stays valid before expiring
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours


    # Your Groq API key (required for any AI feature to work)
    GROQ_API_KEY: str

    GROQ_MODEL: str = "llama3-8b-8192"

    # The URL of your Qdrant Cloud cluster
    QDRANT_URL: str

    # Your Qdrant API key
    QDRANT_API_KEY: str

    # The name of the collection where embeddings are stored
    QDRANT_COLLECTION_NAME: str = "hospital_info"


    # The embedding model name (used by FastEmbed)
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

    # Number of vector dimensions the model produces
    EMBEDDING_DIMENSIONS: int = 384


    class Config:
        # Read variables from the .env file in the same directory
        env_file = ".env"

        # Make variable names case-insensitive (DATABASE_URL == database_url)
        case_sensitive = False

        # Allow extra fields (won't crash if .env has extra variables)
        extra = "ignore"

settings = Settings()
