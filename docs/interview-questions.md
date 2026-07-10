# Technical Interview Questions & Answers — HIA Project

This document lists key technical interview questions and answers based on the architecture, stack, and implementation patterns used in the **Hospital Information Assistant (HIA)** project.

---

## 🐍 Part 1: Backend & Database (FastAPI, SQLAlchemy, PostgreSQL)

### Q1: Why did you choose FastAPI over Flask or Django for this project?
**Answer**:
FastAPI was selected for three primary reasons:
1. **Performance**: FastAPI is built on top of Starlette and Uvicorn, making it one of the fastest Python frameworks available, with speeds comparable to Node.js and Go. It fully supports asynchronous programming (`async/await`) out of the box, which is ideal for I/O-bound tasks like database queries or AI API requests.
2. **Auto-Documentation**: It automatically generates interactive OpenAPI documentation (Swagger UI at `/docs` and ReDoc at `/redoc`) from Pydantic schemas.
3. **Data Validation**: It leverages Pydantic for data validation. Incoming request payloads are parsed and validated against schemas, returning descriptive `422 Unprocessable Entity` errors automatically if types mismatch.

---

### Q2: How did you implement database session management in HIA? Explain the role of `get_db`.
**Answer**:
Database session management is implemented asynchronously using SQLAlchemy's `async_sessionmaker` bound to a PostgreSQL engine.
To inject database sessions into FastAPI routes safely, we use a dependency injector function named `get_db`:
```python
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```
**Why it's structured this way**:
- It utilizes the **Generator Pattern** (`yield`). When a request enters a route, FastAPI calls `get_db`, opens a session, and yields it to the route function.
- Once the route function completes, execution returns to `get_db`. If no exceptions occurred, the transaction commits. If any error was raised, it rollbacks to prevent partial commits.
- The `finally` block ensures the session is closed and returned to the connection pool, preventing connection leaks.

---

### Q3: What is the N+1 query problem, and how did you prevent it in the SQLAlchemy queries?
**Answer**:
The N+1 query problem occurs when querying a parent record and its related child records. 
For example, if you query all departments (1 query) and then access the `doctors` relationship for each department in a loop, the ORM will make an extra query for *each* department to fetch its doctors (N queries). This results in N+1 database roundtrips, which degrades performance.

**Prevention in HIA**:
We use **Eager Loading** with `selectinload` to fetch the related entities in a single batch query.
For example, in `DepartmentService.get_department_by_id`:
```python
result = await db.execute(
    select(Department)
    .where(Department.id == dept_id)
    .options(selectinload(Department.doctors))
)
```
`selectinload` runs exactly two queries: one to fetch the department and one to fetch *all* doctors linked to that department ID in a single `IN` clause. This completely eliminates the N+1 problem.

---

## 🔒 Part 2: Security & Session Management (JWT, Bcrypt)

### Q4: How does JWT-based authorization work in this application, and how are route permissions (RBAC) enforced?
**Answer**:
1. **Generation**: When a user logs in, the server generates a token containing a payload (user ID, email, role, expiration timestamp) signed with a secret key using the HS256 algorithm.
2. **Injection**: The React frontend saves this token in `localStorage` and uses an Axios interceptor to append it to the `Authorization` header (`Bearer <token>`) of all outgoing API requests.
3. **Verification**: On the backend, routes use dependencies like `get_current_user` to extract, decode, and verify the token.
4. **RBAC**: Role-Based Access Control is enforced by creating specialized dependencies. For example, `get_current_admin` calls `get_current_user` first. If the returned user's role is not `admin`, it immediately throws an `HTTP 403 Forbidden` error:
```python
async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user
```

---

## ⚛️ Part 3: Frontend (React, Axios, Routing)

### Q5: Explain the role of Axios Interceptors in HIA. How do you handle expired tokens?
**Answer**:
Axios Interceptors run globally before requests are sent or after responses are received.
- **Request Interceptor**: Reads the token from `localStorage` and appends `Authorization: Bearer <token>` to the headers of every outgoing request. This avoids repeating authorization headers in individual service files.
- **Response Interceptor**: Monitors API errors globally. If the backend returns a `401 Unauthorized` status (meaning the token has expired or is invalid), the response interceptor catches it, clears the token from `localStorage`, resets the user context, and redirects the browser window to `/login?expired=true`.

---

### Q6: Why do React Single Page Applications (SPAs) throw 404 errors on refresh when hosted in Docker/Vercel? How did you solve this?
**Answer**:
React SPAs use client-side routing. When you navigate to `/dashboard` inside the app, the browser does not make a request to the server; React Router simply updates the URL and changes the DOM.
However, if you hit refresh while on `/dashboard`, the browser requests the page directly from Nginx or Vercel. Since there is no physical file or folder named `dashboard` on the server, a 404 Not Found error is returned.

**Solution**:
We configured routing fallbacks that route all paths back to `index.html`, allowing the client-side router to handle path parsing:
- **Vercel**: Added a root `vercel.json` file mapping all paths (`/(.*)`) to `/index.html`.
- **Nginx (Docker)**: Configured the `default.conf` using:
  `try_files $uri $uri/ /index.html;`
This redirects all missing path queries back to `/index.html` safely.

---

## 🧠 Part 4: AI & Vector Database (RAG, Qdrant, Groq)

### Q7: What is RAG, and why is it useful in this hospital application?
**Answer**:
RAG stands for **Retrieval-Augmented Generation**. It is an architectural pattern that improves LLM responses by grounding them in external factual data.

**Why HIA uses RAG**:
If you ask a raw LLM (like Llama 3) *"Who is on duty in the cardiology ward on Monday?"*, it will either hallucinate or state it doesn't have access to this real-time data.
With RAG, when a user asks a question, HIA:
1. Converts the query into a vector embedding.
2. Queries the **Qdrant vector database** to retrieve the most semantically similar doctor and department profiles.
3. Formats these profiles into a text context.
4. Injects this context into the prompt sent to Groq.
5. The LLM answers based *only* on the provided context, guaranteeing a highly accurate, factual reply.

---

### Q8: What are Vector Embeddings, and how are they generated and matched in this project?
**Answer**:
- **What they are**: A vector embedding is a list of floating-point numbers (in this project, 384 dimensions) that captures the semantic meaning of a text block.
- **Generation**: We use the **FastEmbed** library running locally with the `BAAI/bge-small-en-v1.5` model. This model converts doctor and department profiles (compiled as strings) into vectors.
- **Storage**: Vectors are stored in a **Qdrant Cloud** collection with cosine similarity configuration.
- **Matching**: When a user queries the index, their search string is vectorized. Qdrant compares this query vector against the stored vectors using **Cosine Similarity** (which calculates the angle between vectors). The vectors closest to the query (highest similarity score) represent the most relevant documents and are returned.
