# Naveen Bharat - Educational Coaching Platform

## Project Overview
A full-featured educational coaching platform for Indian students preparing for NEET/JEE/Board exams (Classes 9-12). Built with React 18 + TypeScript + Vite frontend and Supabase backend. Features video lectures, live classes, quizzes, AI chatbot (Naveen Sarthi with RAG), Razorpay payments, Zoom doubt sessions, and a comprehensive admin CMS.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite (runs on port 5000)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend/Database**: Supabase (PostgreSQL with Row Level Security, pgvector for RAG)
- **Auth**: Supabase Auth (email/password, role-based: admin/teacher/student)
- **State**: TanStack Query for server state, React Context for app state (Auth, Theme, Batch)
- **Mobile**: Capacitor Android app (`com.naveenbharat.app`)
- **Routing**: HashRouter (required for Capacitor compatibility)

## Key Features
- Public landing page with course catalog
- Student signup/login with role-based access (admin, teacher, student)
- Course player with Bunny CDN video lessons, chapters, and lecture notes
- AI chatbot "Naveen Sarthi" with RAG (pgvector embeddings, Google Gemini 2.5 Flash via Lovable AI gateway)
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
supabase/
  migrations/     # Database migration SQL files (50+ migrations, 30+ tables)
  functions/      # Supabase Edge Functions (16 functions - chatbot, Razorpay, Zoom, AI, etc.)
android/          # Capacitor Android project
```

## Supabase Configuration
- **Project ID**: `cmbattmjwriiesibayfk`
- **Supabase URL** and **anon key** are stored as Replit environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- The client reads these via `import.meta.env` — no credentials are hardcoded in source code
- Database schema managed via migrations in `supabase/migrations/`
- Row Level Security enabled on all tables
- Role-based access: admin, teacher, student via `user_roles` table + `has_role()` SECURITY DEFINER function
- Admin user: `naveenbharatprism@gmail.com`

## Edge Functions (Supabase)
All 16 edge functions are deployed on Supabase and called from the frontend via `supabase.functions.invoke()`:
- `chatbot` — AI chatbot with RAG (Lovable AI gateway + pgvector)
- `create-razorpay-order` / `verify-razorpay-payment` — Payment processing
- `create-zoom-meeting` / `get-zoom-signature` — Zoom integration
- `bunny-cdn` — Bunny CDN file management
- `get-lesson-url` / `get-video-stream` — Secure lesson delivery
- `summarize-video` — AI video summarization
- `generate-embedding` / `seed-knowledge` — RAG knowledge base management
- `manage-session` — Concurrent session management (max 2 devices)
- `score-quiz` — Quiz scoring
- `notify-ai` — AI notifications
- `firecrawl-scrape` / `crawl4ai-bridge` / `deep-search-lecture` — Web scraping/search

## Running the App
- Development: `npm run dev` (starts Vite on port 5000)
- Build: `npm run build`
- Preview built files: `npx serve dist -p 5000 -s`

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key
- Edge function secrets (RAZORPAY, ZOOM, BUNNY, LOVABLE_API_KEY, etc.) are stored in Supabase's secret manager, NOT in this project

## Security Notes
- The Supabase anon key is safe to expose on the client (it is the publishable key)
- Sensitive operations are protected by Supabase RLS policies server-side
- All API keys for third-party services (Razorpay, Zoom, Bunny CDN, Lovable AI) are stored exclusively in Supabase edge function secrets
- No secrets are stored in the frontend source code
