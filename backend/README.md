# Hospital Information Assistance — Backend API

This is the FastAPI backend application for the **Hospital Information Assistance** platform. It provides REST API services for user accounts, doctor directory, department information, appointment scheduling, and a conversational RAG-based AI assistant.

---

## 🚀 Technology Stack

- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (Neon Cloud) with SQLAlchemy ORM (async I/O)
- **Authentication**: JWT tokens & OAuth2 Password Bearer (Passlib + Bcrypt)
- **Conversational AI**: LangChain & Groq API (`llama3-8b-8192`)
- **Semantic RAG**: Qdrant Cloud (vector storage) & FastEmbed (`BAAI/bge-small-en-v1.5` local embedding model)
- **Containerization**: Docker & Docker Compose

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── core/              # Security and Hashing helper modules
│   │   ├── hashing.py
│   │   └── security.py
│   ├── models/            # SQLAlchemy database ORM models
│   │   ├── __init__.py
│   │   ├── appointment.py
│   │   ├── chat_session.py
│   │   ├── department.py
│   │   ├── doctor.py
│   │   └── user.py
│   ├── routers/           # FastAPI path controllers
│   │   ├── auth.py
│   │   ├── appointments.py
│   │   ├── chatbot.py
│   │   ├── departments.py
│   │   ├── doctors.py
│   │   ├── rag.py
│   │   └── users.py
│   ├── schemas/           # Pydantic data validation schemas
│   │   ├── appointment.py
│   │   ├── auth.py
│   │   ├── chatbot.py
│   │   ├── department.py
│   │   ├── doctor.py
│   │   ├── rag.py
│   │   └── user.py
│   ├── services/          # Services containing core business logic
│   │   ├── ai_service.py
│   │   ├── appointment_service.py
│   │   ├── auth_service.py
│   │   ├── department_service.py
│   │   ├── doctor_service.py
│   │   ├── qdrant_service.py
│   │   ├── rag_service.py
│   │   └── user_service.py
│   ├── config.py          # Settings and env variables configuration
│   ├── database.py        # Database engine & session generator setup
│   ├── dependencies.py    # Common FastAPI route dependencies
│   └── main.py            # API entrypoint and bootstrap setup
├── .dockerignore
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## ⚙️ Initial Setup

### 1. Prerequisites
- Python 3.11+
- Docker & Docker Compose (optional, for containerization)
- Cloud accounts for:
  - **Neon DB** (PostgreSQL)
  - **Qdrant Cloud** (Vector DB)
  - **Groq Console** (LLM API key)

### 2. Configure Environment Variables
Copy `.env.example` to a new file named `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your cloud database credentials and API keys:
- `SECRET_KEY`: Generate a random hex string.
- `DATABASE_URL`: Your Neon PostgreSQL async connection string.
- `GROQ_API_KEY`: Your Groq Cloud API key.
- `QDRANT_URL`: Your Qdrant Cloud Cluster URL.
- `QDRANT_API_KEY`: Your Qdrant Cloud API key.

---

## 🏃 Running Locally

### Option A: Standard Local Setup (Recommended)
1. **Create a Virtual Environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Start the API Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will start running at **`http://localhost:8000`**.

### Option B: Docker Container Setup
If you want to run using Docker:
```bash
docker-compose up --build
```
This builds the backend image and runs it locally on port `8000` with hot-reloading enabled.

---

## 🔍 Key Endpoints & APIs

Once the server is running, visit **`http://localhost:8000/docs`** to interact with the full Swagger UI documentation.

### 1. Authentication (`/auth`)
- `POST /auth/register` — Create a new patient or admin account.
- `POST /auth/login` — Log in and receive a JWT Bearer token.
- `GET /auth/me` — Retrieve the currently logged-in user's profile.

### 2. Appointments (`/appointments`)
- `POST /appointments/` — Book a new appointment (defaults to `pending`).
- `GET /appointments/my` — View your own booked appointments (Patient only).
- `GET /appointments/` — List all bookings (Admin only).
- `PATCH /appointments/{appt_id}/status` — Confirm, complete, or cancel a booking (Admin only).
- `DELETE /appointments/{appt_id}/cancel` — Cancel your own booking (Patient only).

### 3. Chatbot (`/chat`)
- `POST /chat/` — Send a query to the AI Assistant. Use a consistent `session_id` to maintain conversation memory.
- `GET /chat/sessions` — View history of your chat sessions.
- `GET /chat/sessions/{session_id}/history` — Reload past messages for a specific session.

### 4. RAG Vector Storage (`/rag`)
- `POST /rag/embed` — Seed Qdrant Vector database with doctors and departments data (Admin only).
- `POST /rag/search` — Perform semantic vector search on database profiles.
- `POST /rag/ask` — Ask a hospital question. Performs semantic search first, feeds matching records as context, and runs it through Groq LLM.

---

## 🛠️ Data Ingestion Setup (Critical Step)

For the **AI Chatbot** and **RAG Search** to have information about your hospital's doctors and departments:

1. **Log in as an Admin** (or register an account with `role: "admin"`).
2. **Create Departments** (e.g. Cardiology, Pediatrics) using `POST /departments`.
3. **Create Doctors** linked to those departments using `POST /doctors`.
4. **Seed Qdrant** by calling **`POST /rag/embed`** (using the Admin token).
   - This reads your Postgres records, vectorizes them, and syncs them to your Qdrant Cloud cluster.
5. You can now use **`POST /rag/ask`** or the chatbot to get grounded, accurate answers!
