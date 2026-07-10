# Hospital Information Assistant (HIA) — Full Stack AI Portal

A comprehensive Full-Stack AI-powered web platform designed for modern hospital directory management, online medical scheduling, and grounded conversational support.

---

## 🏗️ Architecture & Features

This platform is split into two major sections:

### 1. Backend (`/backend`) — FastAPI
- **Database**: PostgreSQL (Neon Cloud) with SQLAlchemy (async database operations).
- **Security**: JWT token generation, password hashing (bcrypt), and authorization guards.
- **AI Chatbot**: LangChain & Groq API (`llama3-8b-8192`) with in-memory session thread history.
- **RAG System**: Qdrant Cloud vector search grounded in PostgreSQL doctor & department profiles.

### 2. Frontend (`/frontend`) — React & TypeScript
- **State**: React Context API (`AuthContext`) and custom hooks (`useAuth`).
- **Styling**: Tailwind CSS (emerald health themes) with fully responsive drawers, cards, and modals.
- **API Client**: Axios configured with token injections and 401 token expiry redirects.
- **Routing**: React Router DOM (v6) with page level authorization guards.

---

## ⚙️ Project Setup & Configurations

Before running the application, make sure to copy and configure the environment variables for both layers:

1. **Configure Backend**:
   - Go to `backend/.env.example` and follow the instructions to create `backend/.env`.
   - You need active credentials for **Neon DB** (PostgreSQL), **Qdrant Cloud**, and a **Groq API key**.

2. **Configure Frontend**:
   - Go to `frontend/.env.example` and follow the instructions to create `frontend/.env`.
   - Set `VITE_API_URL` to point to the backend URL (local default: `http://localhost:8000`).

---

## 🏃 Running Locally

### Option A: Running with Docker Compose (Recommended)
You can run the entire full-stack application (frontend + backend) in one command from the project root:
```bash
docker-compose up --build
```
- **Frontend App**: served at [http://localhost](http://localhost) (port 80)
- **Backend API Docs**: served at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

### Option B: Running Individually (No Docker)
1. **Start the Backend**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
2. **Start the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## ☁️ Cloud Deployments

### Backend Deployment (Render)
The backend is configured for deployment to **Render** as a **Docker Web Service**:
- Point Render to your GitHub repository.
- Select the Blueprint file `render.yaml` at the root, or create a Web Service targeting the `backend/` directory.
- Fill in the required secret keys (`DATABASE_URL`, `GROQ_API_KEY`, etc.) inside the Render dashboard.

### Frontend Deployment (Vercel)
The frontend is configured for deployment to **Vercel**:
- Create a new project on Vercel pointing to your GitHub repository.
- Set the **Root Directory** to `frontend`.
- Set the **Build Command** to `npm run build` and **Output Directory** to `dist`.
- Add `VITE_API_URL` pointing to your hosted Render backend URL in the Environment Variables.
- Vercel automatically reads the root `vercel.json` to handle client-side routing redirects.