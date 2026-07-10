# Hospital Information Assistant — Documentation Index

Welcome to the documentation folder for the **Hospital Information Assistant (HIA)** platform. 
Here you will find deployment guides, testing checklists, architectural overviews, and academic presentation reports.

---

## 📁 Documentation Structure

```
docs/
├── deployment/
│   ├── render-deployment.md   # Hosting the FastAPI backend via Docker on Render
│   └── vercel-deployment.md   # Hosting the React client on Vercel
├── testing/
│   └── manual-testing-checklist.md  # Comprehensive QA manual testing checklist
├── project-report.md          # 15-page academic project thesis report
├── interview-questions.md     # Backend/Frontend interview questions & answers
├── viva-questions.md          # Academic project viva/defense questions & answers
├── presentation-guide.md      # PowerPoint slide layouts & presentation pointers
└── README.md                  # Documentation map (this file)
```

---

## 🔍 Key Documents

### 1. [Render Deployment Guide](deployment/render-deployment.md)
Detailed setup instructions for hosting the backend on Render's Docker environments. It maps database configurations, JWT secret generation, CORS, and Groq API variables.

### 2. [Vercel Deployment Guide](deployment/vercel-deployment.md)
Step-by-step process for hosting the frontend application on Vercel, including setting build presets, Root Directories, routing fallbacks (to prevent 404s), and environment parameters.

### 3. [Manual QA Testing Checklist](testing/manual-testing-checklist.md)
A comprehensive manual test plan covering authentication states, search directories, appointment lifecycles, chat memories, and the RAG indexing console.

### 4. [Project Thesis Report](project-report.md)
A complete 15-page project report matching academic thesis templates (Abstract, Chapter-wise descriptions, DB schemas, UI flows, and Conclusions).

### 5. [Interview Prep & Viva Guides](viva-questions.md)
A series of interview and viva/defense question catalogs covering full-stack web architecture, React states, JWT security, FastAPI async database execution, and RAG semantic matching.
