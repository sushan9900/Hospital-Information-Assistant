# Hospital Information Assistant (HIA) — Academic Project Report

**Title**: Hospital Information Assistant: A Full-Stack AI-Powered Scheduling and Retrieval-Augmented Generation (RAG) Portal  
**Domain**: Health Informatics, Full-Stack Web Development, Applied Natural Language Processing  

---

## 📄 Abstract
In the modern healthcare environment, patients often encounter friction when attempting to navigate hospital divisions, locate specialized physicians, check appointment availabilities, and retrieve grounded medical information. This project introduces the **Hospital Information Assistant (HIA)**, an integrated full-stack web application designed to solve these navigation and scheduling challenges. 

HIA features a secure **FastAPI backend** connected to a **PostgreSQL database (Neon Cloud)**, a responsive **React client (TypeScript & Tailwind)**, and a **Retrieval-Augmented Generation (RAG) conversational agent** using **Qdrant Cloud** vector storage and the **Groq API** (`llama3-8b-8192` model). The system facilitates role-based access control (RBAC), enabling patients to manage appointments and consult the assistant while empowering administrators to coordinate directory records and rebuild vector indexes in real-time.

---

## 1. Introduction & Problem Statement
Patient registration and administrative coordination in traditional clinics often rely on legacy tools, leading to scheduling conflicts, phone line congestions, and poor patient navigation. Additionally, public patients seeking general hospital information (such as floor plans, specialists on shift, or consulting hours) are forced to read through complex static pages. 

HIA addresses these gaps by creating:
1. **An Interactive Doctor Directory**: Allowing patients to search by doctor names or filter by departments with pagination.
2. **An Online Booking Center**: A structured booking lifecycle where patients book, reschedule, or cancel appointments, while admins verify and transition booking statuses (Pending → Confirmed → Completed/Cancelled).
3. **A Conversational RAG Assistant**: A chatbot that retrieves validated hospital records (specialists, fees, hours, floor locations) via vector similarity search, injecting them into the LLM prompt to return factual, grounded answers.

---

## 2. Technology Stack & Architecture

The application adopts a decoupled **Clean Architecture** split into distinct layers:

### 2.1 Backend Layer (FastAPI)
- **FastAPI**: Serves as the web framework. Chosen for its performance (async/await support), auto-generated Swagger UI (`/docs`), and standard Pydantic request-response schemas.
- **SQLAlchemy ORM**: Implements database interactions asynchronously via connection pools.
- **Passlib & python-jose**: Handles password encryption (bcrypt) and JWT session generation.

### 2.2 Vector Storage & AI Layer (Qdrant & Groq)
- **Qdrant Cloud**: A managed vector database. Stores 384-dimensional dense vectors representing doctor/department profiles.
- **FastEmbed**: A local embedding model (`BAAI/bge-small-en-v1.5`) that generates vector representations of hospital text files offline (saving API costs).
- **LangChain**: Orchestrates LLM chains, connecting prompts, models, and session memory buffers.
- **Groq API**: Serves the Llama-3 model with high speed and low latency.

### 2.3 Frontend Layer (React + TS)
- **Vite**: Rapid compiler and development server mapped to port `3000`.
- **TypeScript**: Enforces static type safety across forms and response layouts.
- **Tailwind CSS**: A utility-first CSS framework configured with HSL brand tones.
- **Axios**: HTTP client equipped with custom request/response interceptors to attach JWT headers and handle session expiration (401 errors).

---

## 3. Database Schema Design (Entity-Relationship)

HIA maps five core tables inside PostgreSQL. Database integrity constraints (foreign keys, uniques, cascade deletions) are enforced:

### 3.1 Entity Schemas
1. **User Table (`users`)**:
   - `id` (Serial, Primary Key)
   - `full_name` (Varchar, Not Null)
   - `email` (Varchar, Unique, Index, Not Null)
   - `hashed_password` (Varchar, Not Null)
   - `role` (Enum: `admin`, `patient`)
   - `is_active` (Boolean, Default True)
   - `created_at` / `updated_at` (DateTime)

2. **Department Table (`departments`)**:
   - `id` (Serial, Primary Key)
   - `name` (Varchar, Unique, Index, Not Null)
   - `description` (Text, Nullable)
   - `location` (Varchar, Nullable)
   - `phone` (Varchar, Nullable)

3. **Doctor Table (`doctors`)**:
   - `id` (Serial, Primary Key)
   - `full_name` (Varchar, Not Null)
   - `specialization` (Varchar, Not Null)
   - `qualification` (Varchar, Nullable)
   - `experience_years` (Integer, Nullable)
   - `department_id` (ForeignKey `departments.id` on delete CASCADE)
   - `email` (Varchar, Unique, Nullable)
   - `phone` (Varchar, Nullable)
   - `bio` (Text, Nullable)
   - `consultation_fee` (Decimal, Nullable)
   - `available_days` (Varchar, Nullable)

4. **Appointment Table (`appointments`)**:
   - `id` (Serial, Primary Key)
   - `user_id` (ForeignKey `users.id` on delete CASCADE)
   - `doctor_id` (ForeignKey `doctors.id` on delete CASCADE)
   - `appointment_date` (Date, Not Null)
   - `appointment_time` (Varchar, Not Null)
   - `status` (Enum: `pending`, `confirmed`, `completed`, `cancelled`)
   - `reason` (Text, Nullable)
   - `notes` (Text, Nullable)

5. **Chat Session Table (`chat_sessions`)**:
   - `id` (Serial, Primary Key)
   - `user_id` (ForeignKey `users.id` on delete CASCADE)
   - `session_id` (Varchar, Unique, Index, Not Null)
   - `title` (Varchar)
   - `message_count` (Integer)
   - `last_message` (Varchar)

---

## 4. Module-Wise Implementation

### 4.1 Role-Based Authentication & Guarding
Authentication relies on JWT Bearer tokens. When a user submits credentials via `/auth/login`, the server hashes and compares the password, returning a JWT token containing the user ID and role payload. 

On the client side, routes are wrapped inside the `ProtectedRoute` component:
- Visitors are redirected to `/login` if attempting access to private paths.
- Patients are redirected to `/dashboard` if trying to access the RAG console (`/rag`).

### 4.2 Booking Lifecycle
1. **Creation**: Patients select a doctor and submit a date/time. The backend verifies the doctor exists and creates a record with status `pending`.
2. **Rescheduling**: Patients can modify dates/times of `pending` or `confirmed` bookings. Completed/Cancelled bookings are protected from edits.
3. **Auditing**: Admins review bookings and transition statuses.
4. **Cascade Safety**: Deleting a doctor or department cascade-deletes linked appointments, preventing orphaned records.

### 4.3 RAG Pipeline & LLM Grounding
The RAG pipeline operates in two phases:

1. **Ingestion (Admin-Only)**:
   Admins click "Sync / Seed" on the RAG dashboard. The server reads all doctor/department records, constructs descriptive text structures (e.g. *"Doctor: Dr. Jane Doe | Specialty: Pediatrics | Floor: Block A..."*), vectorizes them using FastEmbed, and pushes them to Qdrant Cloud.

2. **Grounding (Conversational QA)**:
   When a user asks: *"Where is the pediatrics division and what doctors are available there?"*:
   - HIA embeds the query.
   - Searches Qdrant for similar records.
   - Converts matched points into a context string.
   - Injects the context into the Groq LLM prompt.
   - The LLM returns a factual answer citing sources. If no matching records are retrieved, the LLM politely declines to answer, preventing hallucinations.

---

## 5. Security & Containment Guardrails
- **Password Encryption**: Stored passwords are encrypted using Bcrypt (rounds=12). Raw passwords are never exposed.
- **Cross-Origin Resource Sharing (CORS)**: Backend locks down origins to the specific Vercel URL, protecting the system from CSRF attacks.
- **SQL Injection Prevention**: All queries use SQLAlchemy parameter binding, preventing malicious string injection.
- **Prompt Isolation**: System prompts enforce constraint grounding, ensuring the chatbot does not answer queries unrelated to the hospital.

---

## 6. Project Verification & Testing Summary
Testing was conducted manually according to our testing checklist across multiple staging environments:
- **Authentication**: Verified token flushes, session expiration, and role boundaries.
- **Scheduling**: Tested boundaries on past dates, status updates, and cascading deletes.
- **Vector Indexing**: Verified Qdrant metrics, semantic query matches, and metadata JSON structures.
- **SPA Routing**: Verified `nginx.conf` and `vercel.json` configurations prevent 404 errors during page refreshes on sub-routes.

---

## 7. Conclusion & Future Scope
The **Hospital Information Assistant** delivers a secure, modern, and AI-powered portal for hospital directory indexing and scheduling. The integration of local text embeddings and cloud vector indexes shows the viability of RAG architectures in public informatics.

### Future Scope:
1. **Real-time SMS/Email alerts**: Sending notification alerts using Twilio/SendGrid on status confirmations.
2. **Interactive Calendars**: Grid slot selections displaying real-time bookings to prevent overlaps.
3. **Multi-lingual support**: Localizing the AI chatbot to translate queries into local languages.
