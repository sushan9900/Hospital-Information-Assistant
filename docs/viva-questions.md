# Academic Project Defense / Viva Questions & Answers

This guide compiles common questions and suggested answers for academic project defenses or viva-voce examinations regarding the **Hospital Information Assistant (HIA)** portal.

---

## 🎓 Part 1: Project Overview & Motivation

### Q1: What is the main objective of your project, and what is your contribution?
**Answer**:
- **Objective**: To develop a secure, full-stack medical directory and scheduling assistant that allows patients to book checkup slots and get accurate, grounded information about hospital departments, floor locations, and doctor availabilities.
- **My Contribution**: I implemented the entire decoupled system from scratch: the async FastAPI backend (PostgreSQL ORM), the React frontend client (TypeScript/Tailwind CSS), and the semantic RAG chatbot utilizing Qdrant Cloud and Groq APIs.

---

### Q2: Why did you choose PostgreSQL (Relational) instead of MongoDB (NoSQL) for HIA?
**Answer**:
HIA is a transactional system where relational integrity is critical:
1. **Relationships**: Appointments bind users (patients) directly to doctors on a specific date/time. If a doctor or user is deleted, we need atomic cascading deletes to prevent corrupted, orphaned bookings.
2. **ACID Compliance**: Scheduling transactions require strict ACID guarantees (Atomicity, Consistency, Isolation, Durability) to prevent race conditions (such as double-booking the same doctor at the same slot).
PostgreSQL excels at relational integrity, foreign key enforcement, and ACID compliance compared to document databases like MongoDB.

---

## 🛡️ Part 2: Backend, Security & API

### Q3: Explain how User Registration and Password Encryption work in your database.
**Answer**:
1. When a patient registers (`POST /auth/register`), the Pydantic schema validates the fields.
2. The password is never stored as plain text. We pass it through a **Bcrypt Hashing** function in `security/hashing.py` (using `passlib`), which generates a secure, one-way hash string.
3. This hash string is written to the `hashed_password` column in PostgreSQL.
4. During login, we fetch this hash and call Bcrypt's comparison utility to verify the input password matches the hash.

---

### Q4: Why did you use JSON Web Tokens (JWT) for authentication? What are its benefits over standard Sessions?
**Answer**:
- **Statelessness**: JWT is a stateless authentication method. The session state is stored entirely in the client-side token (inside the browser's `localStorage`), not on the server.
- **Scalability**: Because the backend does not need to store session states in a database or memory table, it scales horizontally across multiple servers easily.
- **Decoupled Architecture**: It works perfectly for separate backend/frontend deployments. The backend simply verifies the cryptographic signature of the token on each request.

---

## ⚛️ Part 3: Frontend & Client Operations

### Q5: How does the frontend communicate with the backend? Explain the role of Axios.
**Answer**:
- Communication is handled via HTTP REST requests.
- **Axios** is used as the client library. We configured a base client instance (`api.ts`) pointing to the backend host.
- We set up **Request Interceptors** to automatically grab the JWT token from local storage and append it in the headers as `Authorization: Bearer <token>` for all requests.
- We set up **Response Interceptors** to intercept `401 Unauthorized` responses. If a request throws a 401 (e.g. token expired), it clears storage and redirects the user back to the login page.

---

### Q6: What is React Context, and why did you use it for the AuthProvider?
**Answer**:
- **React Context** allows sharing state variables globally down the component tree without manually passing props through every intermediate level (props drilling).
- We created `AuthContext` to share user profile details (`user`), active token state (`token`), and session actions (`login()`, `logout()`) with all components. The Navbar can read the logged-in status to show profile avatars, and routing guards can inspect roles dynamically.

---

## 🧠 Part 4: AI & Vector Embeddings (RAG)

### Q7: Explain the concept of RAG (Retrieval-Augmented Generation). How does it prevent AI Hallucinations?
**Answer**:
- **Concept**: RAG combines search retrieval with language model generation. Instead of asking the LLM to write an answer using only its general pre-trained weights, we search our own database first to find the relevant information, and feed it directly into the prompt as "context".
- **Prevention of Hallucinations**: We explicitly instruct the LLM in the system prompt: *"Answer the user's question ONLY based on the provided context. If the context does not contain the answer, state that you do not have enough information."* This confines the LLM to our validated hospital records.

---

### Q8: What embedding model did you use, and where does it run?
**Answer**:
- **Model**: `BAAI/bge-small-en-v1.5` (generates 384-dimensional dense vectors).
- **Execution**: It runs **locally on the server** using the **FastEmbed** library. It does not make external API requests (unlike OpenAI embeddings), which:
  - Saves API costs.
  - Ensures patient and hospital profile descriptions are embedded securely within our system boundaries.
