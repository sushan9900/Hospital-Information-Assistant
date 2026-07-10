# Vercel Deployment Guide — React Frontend

This guide outlines the step-by-step process of deploying the React + TypeScript frontend application of the **Hospital Information Assistant** portal to **Vercel**.

---

## 🛠️ Prerequisites
- A **GitHub Repository** containing the project files.
- A **Vercel Account** (linked to GitHub).
- The URL of your **deployed backend** on Render (e.g. `https://hospital-info-backend.onrender.com`).

---

## 🚀 Step-by-Step Deployment

1. **Log in to Vercel** and click **Add New** (top right) -> **Project**.
2. **Import Repository**: Connect and select the GitHub repository containing this project.
3. **Configure Project Settings**:
   - **Project Name**: `hospital-info-assistant`
   - **Framework Preset**: `Vite` (automatically detected).
   - **Root Directory**: Click *Edit* and select **`frontend`** (Crucial: tells Vercel that the React application is inside the `/frontend` subfolder).
4. **Build and Development Settings** (keep defaults):
   - Build Command: `npm run build` (runs `tsc -b && vite build`).
   - Output Directory: `dist` (Vite's default build output folder).
5. **Add Environment Variables**:
   Expand the *Environment Variables* section and add:
   - **Key**: `VITE_API_URL`
   - **Value**: Your hosted Render backend URL (e.g., `https://hospital-info-backend.onrender.com`).
   - *Note: Do not include a trailing slash at the end of the URL.*
6. Click **Deploy**.

---

## 📁 How Client-Side Routing is Handled (`vercel.json`)

Vite React templates build single page applications (SPAs).
When a user visits `https://your-app.vercel.app/dashboard` directly, Vercel will attempt to look for a physical file named `dashboard` and return a 404.

To solve this, our repository includes a root `vercel.json` file. Vercel reads this file during deployment and maps the following routing fallback rules:
```json
{
  "version": 2,
  "cleanUrls": true,
  "framework": "vite",
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```
This rule guarantees that Nginx/Vercel will redirect all URL paths to `/index.html`, allowing React Router inside the browser to parse the routes and render the correct pages safely.

---

## 🔍 Post-Deployment Verification

1. **Visit the URL**: Open the deployed URL provided by Vercel (e.g., `https://hospital-info-assistant.vercel.app`).
2. **Verify Public Pages**: Navigate to the *Doctors* and *Departments* directories. They should load and show mock or seeded database entries (verifying the connection to your Neon database via the backend API).
3. **Test Session Chat**: Log in and send a message on the *AI Chat* panel. Check if it returns LLM responses from Groq (verifying backend-to-AI connections).
4. **Inspect Console**: If pages are loading empty:
   - Open Chrome Developer Tools (`F12`).
   - Check the **Console** tab for CORS errors or blocked requests.
   - If CORS is blocking requests, make sure the Render backend's `BACKEND_CORS_ORIGINS` environment variable lists your Vercel URL:
     `["https://hospital-info-assistant.vercel.app"]`
