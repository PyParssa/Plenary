# Plenary Project

A decoupled, full-stack web application featuring an inquiry card deck and Socratic AI reflection engine:
- **Frontend**: Single Page Application built with React 19, Vite, Tailwind CSS, Motion, and Lucide React, configured for deployment on **Vercel**.
- **Backend**: High-performance asynchronous API built with **FastAPI** (Python), CORS middleware, multi-provider LLM clients (OpenAI, Anthropic, Gemini), and Supabase admin operations, configured for deployment on **Render**.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
  - [1. Backend Setup (FastAPI)](#1-backend-setup-fastapi)
  - [2. Frontend Setup (React + Vite)](#2-frontend-setup-react--vite)
- [Deployment Guide](#deployment-guide)
  - [Deploying the Backend to Render](#deploying-the-backend-to-render)
  - [Deploying the Frontend to Vercel](#deploying-the-frontend-to-vercel)
- [Environment Variables](#environment-variables)
- [License & Support](#license--support)

---

## Architecture

```
                 ┌─────────────────────────────┐
                 │       Client Browser        │
                 └──────────────┬──────────────┘
                                │
               ┌────────────────┴────────────────┐
               │                                 │
     (Direct Supabase Auth)           (API Calls: Reflection, OTP, Admin)
               │                                 │
               ▼                                 ▼
   ┌───────────────────────┐         ┌───────────────────────┐
   │    Supabase Cloud     │         │   FastAPI on Render   │
   │  (Postgres, Auth, RLS)│         │ (Python 3.11+, async) │
   └───────────────────────┘         └───────────┬───────────┘
                                                 │
                                ┌────────────────┼────────────────┐
                                ▼                ▼                ▼
                           OpenAI API      Anthropic API      Google Gemini
```

---

## Project Structure

```
Plenary/
├── backend/                  # FastAPI Application (for Render)
│   ├── main.py               # API endpoints, CORS, LLM handlers, Supabase admin
│   ├── requirements.txt      # Python dependencies (fastapi, uvicorn, httpx, supabase)
│   ├── render.yaml           # Render Blueprint specification
│   └── .env.example          # Backend environment variables template
├── frontend/                 # React + Vite Application (for Vercel)
│   ├── src/                  # React source components, pages, hooks, styles
│   │   ├── lib/api.ts        # API client helper resolving VITE_API_URL or dev proxy
│   │   └── ...
│   ├── package.json          # Client dependencies and build scripts
│   ├── vite.config.ts        # Vite config with /api proxy to localhost:8000
│   ├── vercel.json           # Vercel SPA routing rewrite rules
│   └── .env.example          # Frontend environment variables template
├── render.yaml               # Root Render blueprint file for one-click setup
└── README.md
```

---

## Local Development

You can run commands directly from the root using npm convenience scripts, or navigate into each directory individually.

### Quick Start (from Repository Root)

```bash
# Run frontend dev server (runs on http://localhost:5173 with proxy to backend):
npm run dev:frontend

# Build frontend for production:
npm run build:frontend

# Run frontend type-check:
npm run lint:frontend

# Run backend dev server (port 8000 with hot reload):
npm run dev:backend
```

---

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables template and configure your secrets:
   ```bash
   cp .env.example .env
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The API will be available at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup (React + Vite)

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template and fill in your Supabase keys:
   ```bash
   cp .env.example .env
   ```
   *(Note: Leave `VITE_API_URL` empty in local development to let Vite automatically proxy `/api` requests to `http://127.0.0.1:8000`)*.

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Deployment Guide

### Deploying the Backend to Render

1. Log in to [Render](https://render.com) and click **New +** > **Web Service**.
2. Connect your GitHub repository (`PyParssa/Plenary`).
3. Configure the service:
   - **Name**: `plenary-backend`
   - **Root Directory**: `backend`
   - **Environment / Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. In **Environment Variables**, add:
   - `SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (from Supabase Settings > API)
   - `ALLOWED_ORIGINS`: Comma-separated allowed origins (e.g. `http://localhost:5173,https://your-frontend.vercel.app`)
   - `RESEND_API_KEY`: *(Optional)* Your Resend API key for verification emails
   - `RESEND_FROM_EMAIL`: *(Optional)* Verified sender email (e.g. `Plenary <noreply@yourdomain.com>`)
   - `GOOGLE_SHEETS_WEBHOOK_URL`: *(Optional)* Apps Script webhook URL for signups
   - `GOOGLE_SHEETS_WEBHOOK_SECRET`: *(Optional)* Apps Script shared secret
5. Click **Create Web Service**. Once deployed, copy your Render URL (e.g., `https://plenary-backend.onrender.com`).

*(Alternative: You can also use Render's **Blueprints** feature; Render will automatically detect `render.yaml` at the root).*

---

### Deploying the Frontend to Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** > **Project**.
2. Import your GitHub repository (`PyParssa/Plenary`).
3. In project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Public Anon Key
   - `VITE_API_URL`: The URL of your deployed Render backend (e.g., `https://plenary-backend.onrender.com`)
5. Click **Deploy**. Vercel will build and deploy the React application with automatic SPA routing.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin operations |
| `ALLOWED_ORIGINS` | Comma-delimited list of origins permitted by CORS |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `RESEND_FROM_EMAIL` | Verified sending email address |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Google Apps Script webhook for storing signups |
| `GOOGLE_SHEETS_WEBHOOK_SECRET`| Shared authentication secret for Apps Script |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Public Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anonymous key |
| `VITE_API_URL` | Render backend URL (e.g. `https://plenary-backend.onrender.com`). In local development, leave unset to use Vite proxy. |

---

## License & Support

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](LICENSE.md).

**Support the Creator:**
- **Solana Wallet:** `ExHycmN3JJH2S3MuLjVLsGigz6PaaEkwsnb3KSxi9dQJ`
- **Website:** [parssa.pro](https://parssa.pro)