# Render Deployment Guide — FastAPI Backend

This guide outlines the step-by-step process of deploying the FastAPI backend application of the **Hospital Information Assistant** portal to **Render** using Docker.

---

## 🛠️ Prerequisites
- A **GitHub Repository** containing the project files.
- A **Render Account** (linked to GitHub).
- Active database/API keys:
  - **Neon PostgreSQL async string** (`postgresql+asyncpg://...`).
  - **Qdrant Cloud endpoint & API key**.
  - **Groq Console API key**.

---

## 🚀 Option A: Deploying via Render Blueprints (Recommended)

We provide a pre-configured `render.yaml` file at the project root which automatically maps all server configurations.

1. **Log in to Render** and go to your [Dashboard](https://dashboard.render.com/).
2. Click **New** (top right) and select **Blueprint**.
3. Connect your GitHub repository containing this project.
4. Render will read the `render.yaml` file and parse the setup:
   - It will identify the backend Docker service `hospital-info-backend`.
   - It will auto-generate a secure `SECRET_KEY` for JWT.
5. Fill in the required environment variables:
   - `DATABASE_URL` (Neon PostgreSQL async connection string).
   - `GROQ_API_KEY` (Groq API Key).
   - `QDRANT_URL` (Qdrant endpoint).
   - `QDRANT_API_KEY` (Qdrant key).
6. Click **Approve** to deploy the service.

---

## 📝 Option B: Deploying Manually as a Web Service

If you prefer not to use Blueprints, you can configure the service manually:

1. On the Render Dashboard, click **New +** and select **Web Service**.
2. Connect your GitHub repository.
3. Configure the Web Service settings:
   - **Name**: `hospital-info-backend`
   - **Region**: Select a region close to your database (e.g. `US Oregon`).
   - **Branch**: `main`
   - **Root Directory**: `backend` (Crucial: points Render to compile inside `/backend`).
   - **Runtime**: `Docker` (Render automatically builds the `backend/Dockerfile`).
   - **Instance Type**: `Free`.
4. Click **Advanced** and add the following **Environment Variables**:
   - `PORT`: `10000` (Render's default port).
   - `DEBUG`: `false`.
   - `DATABASE_URL`: Your async PostgreSQL connection string.
   - `SECRET_KEY`: A random hex string (for JWT hashing).
   - `GROQ_API_KEY`: Your Groq Cloud API key.
   - `QDRANT_URL`: Your Qdrant Cloud URL.
   - `QDRANT_API_KEY`: Your Qdrant Cloud API key.
   - `BACKEND_CORS_ORIGINS`: `["*"]` (starts open; restrict to your Vercel URL post-deploy).
5. Click **Create Web Service**.

---

## 🔍 Post-Deployment Verification

### 1. Check Build Logs
Render will trigger a build:
- It downloads the base `python:3.11-slim` image.
- Installs dependencies from `requirements.txt`.
- Launches Uvicorn.
Verify the logs show:
```
INFO:app.main:Starting up Hospital Information Assistance...
INFO:app.main:Database connection verified successfully.
INFO:app.main:Database tables initialized successfully.
```

### 2. Ping Health Endpoint
Once live, verify the deploy by visiting:
`https://your-backend-app.onrender.com/health`

It should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "services": {
    "embeddings": "FastEmbed (local model initialized)",
    "ai": "Groq Cloud API configured"
  }
}
```

### 3. Access API Documentation
Visit `https://your-backend-app.onrender.com/docs` to view the interactive Swagger UI.
