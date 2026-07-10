# Hospital Information Assistance — Frontend Client

This is the React + TypeScript frontend web application for the **Hospital Information Assistance** portal. It provides interactive, responsive dashboards for patients and administrators, scheduling views, and a dedicated session-based AI chatbot grounded in hospital records using RAG.

---

## 🚀 Technology Stack

- **Core**: React 18 & TypeScript
- **Styling**: Tailwind CSS (v3) with custom HSL health themes (Emerald)
- **API Client**: Axios (configured with auto-JWT Request interceptors & 401 response guards)
- **Icons**: Lucide React
- **Build Tool**: Vite (configured with `@/` path aliasing)
- **Routing**: React Router DOM (v6) with login status validation guards

---

## 📁 Directory Structure

```
frontend/
├── public/                 # Static public assets
├── src/
│   ├── components/         # Reusable global UI components
│   │   ├── ConfirmDialog.tsx
│   │   ├── Footer.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Modal.tsx
│   │   ├── Navbar.tsx
│   │   ├── Pagination.tsx
│   │   ├── SearchBar.tsx
│   │   └── Toast.tsx
│   ├── contexts/           # Global State Contexts
│   │   └── AuthContext.tsx
│   ├── hooks/              # Custom React Hooks
│   │   └── useAuth.ts
│   ├── layouts/            # Page layouts
│   │   ├── AuthLayout.tsx  # Auth view shell (Split screen)
│   │   └── MainLayout.tsx  # General view shell (Header + Footer)
│   ├── pages/              # Routing pages / viewports
│   │   ├── AppointmentsPage.tsx
│   │   ├── ChatbotPage.tsx # Conversation assistant panel
│   │   ├── DashboardPage.tsx
│   │   ├── DepartmentsPage.tsx
│   │   ├── DoctorsPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── RAGPage.tsx     # Admin embedding controller
│   │   └── RegisterPage.tsx
│   ├── services/           # Axios HTTP API services
│   │   ├── api.ts
│   │   ├── appointmentService.ts
│   │   ├── authService.ts
│   │   ├── departmentService.ts
│   │   ├── doctorService.ts
│   │   ├── chatService.ts
│   │   └── ragService.ts
│   ├── types/              # TypeScript interface types
│   │   └── index.ts
│   ├── App.tsx             # Route configurations
│   ├── index.css           # Tailwind base styles and imports
│   └── main.tsx            # DOM mount point
├── .dockerignore
├── .env.example
├── Dockerfile
├── nginx.conf              # SPA routing fallback config
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## ⚙️ Initial Setup

### 1. Prerequisites
- Node.js (v18 or v20+)
- npm / yarn
- Running Backend API (local or hosted on Render)

### 2. Configure Environment Variables
Copy `.env.example` to a new file named `.env`:
```bash
cp .env.example .env
```
Ensure `VITE_API_URL` points to your backend instance:
- Local development: `http://localhost:8000`
- Render production: `https://your-backend-app.onrender.com`

---

## 🏃 Running Locally

### Option A: Standard Local Setup
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The local server will start running at **`http://localhost:3000`** (pre-configured in `vite.config.ts`).

### Option B: Docker Container Setup
To build and run the frontend inside a lightweight Nginx web container:
1. **Build the image**:
   ```bash
   docker build -t hospital-frontend .
   ```
2. **Run the container**:
   ```bash
   docker run -p 80:80 hospital-frontend
   ```
   The application will be served at **`http://localhost`**.

---

## 🔒 Route Security Guards

Client-side routes are protected inside `src/App.tsx` using the custom `ProtectedRoute` wrapper:
- **Private Routes** (`/dashboard`, `/profile`, `/appointments`, `/chat`): If a guest attempts access, they are automatically redirected to `/login`.
- **Admin-only Routes** (`/rag`): If a standard user (Patient) attempts access, they are automatically redirected to `/dashboard`.
- **Auth Routes** (`/login`, `/register`): If an already-authenticated user lands on these pages, they are redirected to `/dashboard`.
- **401 Token Expiry**: If a token expires during usage, Axios intercepts the error, clears browser storage, and redirects to `/login?expired=true`.
