# Naveen Bharat - Educational Coaching Platform

## Project Overview
A full-featured educational coaching platform for Indian students preparing for NEET/JEE/Board exams (Classes 9-12). Built with React 18 + TypeScript + Vite frontend and Supabase backend. Features video lectures, live classes, quizzes, AI chatbot "Sarathi" with RAG, Razorpay payments, Zoom doubt sessions, and a comprehensive admin CMS.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite (runs on port 5000)
- **Backend API**: Express.js server (runs on port 3001) — handles Razorpay, Zoom, quiz scoring, lesson URLs, Bunny CDN, chatbot/AI, session management
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database/Auth**: Supabase (PostgreSQL with Row Level Security, pgvector for RAG, Supabase Auth)
- **State**: TanStack Query for server state, React Context for app state (Auth, Theme, Batch)
- **Mobile**: Capacitor Android app (`com.naveenbharat.app`)
- **Routing**: HashRouter (required for Capacitor compatibility)

## Dev Command
```
npm run dev
```
Runs both servers concurrently:
- Express API server on port 3001
- Vite dev server on port 5000

## Key Features
- Public landing page with course catalog
- Student signup/login with role-based access (admin, teacher, student)
- Course player with Bunny CDN video lessons, chapters, and lecture notes
- AI chatbot "Sarathi" with RAG (pgvector embeddings, Lovable AI gateway / Google Gemini)
- Live classes with real-time chat (Supabase Realtime)
- Quiz system (NEET/JEE/Board exam prep)
- Razorpay payment integration for course enrollment
- Zoom integration for doubt sessions
- Admin CMS for managing content, courses, users
- Messaging system between users
- Attendance and student management
- Books, resource library, materials, syllabus
- Notice board and timetable
- Student notes with file uploads
- PWA support (manifest.json + service worker)

## Project Structure
```
src/
  components/     # Reusable UI components (admin/, course/, dashboard/, live/, quiz/, video/, ui/)
  contexts/       # React context providers (Auth, Theme, Batch)
  hooks/          # Custom React hooks (useCourses, useLessons, usePayments, etc.)
  integrations/   # Supabase client setup and generated types
  lib/            # Utility functions (bunnyCdn, indexedDB, utils)
  pages/          # Route-level page components (40+ pages)
  types/          # TypeScript type definitions
server/
  index.js        # Express API server — all secure backend routes
supabase/
  migrations/     # Database migration SQL files (50+ migrations, 30+ tables)
  functions/      # Supabase Edge Functions (legacy — main logic now in server/index.js)
android/          # Capacitor Android project
```

## Supabase Configuration
- **Project ID**: `wegamscqtvqhxowlskfm`
- **Supabase URL**: `https://wegamscqtvqhxowlskfm.supabase.co`
- URL and anon key stored as Replit environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- The client reads via `import.meta.env` — no hardcoded secrets in source
- Database schema managed via migrations in `supabase/migrations/`
- Row Level Security enabled on all tables
- Role-based access: admin, teacher, student via `user_roles` table + `has_role()` SECURITY DEFINER function
- Admin user: `naveenbharatprism@gmail.com`

## Express API Routes (server/index.js)
All sensitive operations go through the Express server — these replace the old Supabase Edge Functions:
- `POST /api/create-razorpay-order` — Create Razorpay payment order
- `POST /api/verify-razorpay-payment` — Verify payment signature & enroll student
- `POST /api/get-zoom-signature` — Generate Zoom SDK JWT signature
- `POST /api/create-zoom-meeting` — Create Zoom meeting (admin/teacher only)
- `POST /api/score-quiz` — Server-side quiz scoring with negative marks
- `POST /api/get-lesson-url` — Resolve secure lesson video/PDF URLs
- `POST /api/bunny-cdn` — Bunny CDN upload/list/stream operations
- `POST /api/chatbot` — AI chatbot Sarathi with RAG
- `POST /api/validate-email` — Block disposable email domains
- `POST /api/summarize-video` — AI video summarization (Lovable/Gemini)
- `POST /api/deep-search-lecture` — AI research assistant
- `POST /api/crawl4ai-bridge` — Web scraping via Firecrawl (admin only)
- `POST /api/manage-session` — Concurrent session management (max 2 devices)
- `GET  /api/health` — Health check

## Environment Variables
Set in Replit's environment (Secrets tab for sensitive values):
- `VITE_SUPABASE_URL` — Supabase project URL (public, safe in frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (public, safe in frontend)
- `SUPABASE_URL` — Same URL for server-side use
- `SUPABASE_ANON_KEY` — Same anon key for server-side use
- `SUPABASE_SERVICE_ROLE_KEY` — **Secret** — server-only, full DB access (set in Secrets)
- `RAZORPAY_KEY_ID` — Razorpay public key (set in Secrets)
- `RAZORPAY_KEY_SECRET` — **Secret** — Razorpay HMAC signing key (set in Secrets)
- `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` — Zoom OAuth (set in Secrets)
- `ZOOM_SDK_KEY` / `ZOOM_SDK_SECRET` — Zoom SDK credentials (set in Secrets)
- `BUNNY_API_KEY` / `BUNNY_STORAGE_ZONE` / `BUNNY_CDN_HOSTNAME` — Bunny CDN (set in Secrets)
- `LOVABLE_API_KEY` — AI gateway for Gemini (set in Secrets)
- `FIRECRAWL_API_KEY` — Web scraping (set in Secrets)
- `API_PORT` — Express server port (default: 3001)

## Security Notes
- The Supabase anon key is safe to expose on the client (it is the publishable key)
- Sensitive operations are protected by Supabase RLS policies AND Express auth middleware
- The Express server verifies Supabase JWTs before any sensitive operation
- All third-party API secrets (Razorpay, Zoom, Bunny CDN, Lovable AI) must be stored in Replit Secrets
- No secrets are hardcoded in source code
