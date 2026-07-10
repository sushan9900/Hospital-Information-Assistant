# ==============================================================================
# Hospital Information Assistance — Backend Dockerfile
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This Dockerfile defines the container image for our FastAPI backend.
#   It package the application code, its environment, and dependencies so it
#   can be run consistently anywhere — locally via Docker Compose or deployed
#   to cloud platforms like Render.
#
# DESIGN CHOICES:
#   - Base Image: python:3.11-slim (small size, includes Debian package manager)
#   - Build tools: Installed temporary build dependencies to compile packages
#     like bcrypt and cryptography, then purged them to keep the image small.
#   - Port: Exposes port 8000, but binds to $PORT dynamically for Render.
# ==============================================================================

# Use official lightweight Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables:
# - PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disk
# - PYTHONUNBUFFERED: Prevents Python from buffering stdout and stderr
# - PORT: Default port (will be overridden by Render/Docker Compose)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Set the working directory inside the container
WORKDIR /code

# Install system dependencies needed for compiling cryptography, bcrypt, and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file first to leverage Docker's build cache
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies
# --no-cache-dir keeps the final image size smaller
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the application code
COPY ./app /code/app

# Expose the default port (documentation only, does not actually publish port)
EXPOSE 8000

# Command to run the application:
# We use uvicorn to serve the FastAPI app.
# We bind the port to the PORT environment variable dynamically (Render injects $PORT).
# If $PORT is not set, it defaults to 8000.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
