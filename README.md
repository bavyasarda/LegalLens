# LegalLens

A personal legal document intelligence platform. Upload contracts, agreements, and PDFs. Ask plain-English questions, get streamed answers with citations to the source documents.

Built as an MVP that runs **$0/month** on Vercel Hobby (free tier) plus free tiers of Supabase, HuggingFace, and Groq.

---

## Architecture

```
┌──────────────────┐
│  Browser         │
│  - React UI      │
│  - Tesseract.js  │  ← OCR runs here
│  - pdfjs-dist    │  ← PDF text extraction here
│  - SSE reader    │  ← Reads streamed chat tokens
└────────┬─────────┘
         │ HTTPS (small payloads only)
         ▼
┌──────────────────────────────────────┐
│  Next.js 14 on Vercel (serverless)   │
│  ────────────────────────────────    │
│  /api/index-document  (chunk+embed)  │──→ HuggingFace (embeddings)
│  /api/chat            (RAG stream)   │──→ Groq (LLM)
│  /api/documents/[id]  (delete)       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Supabase                            │
│  - Auth (Google OAuth)               │
│  - Postgres + pgvector (chunks)      │
│  - Storage: legal-docs bucket        │
└──────────────────────────────────────┘
```

**Why is OCR in the browser?** Vercel's Hobby tier caps serverless functions at 10 seconds. Tesseract.js is ~30MB of language data and can take 10-20 seconds per page — too slow for serverless. Running it in the browser means the user only waits for their own machine, and the server only ever receives already-extracted text.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Serverless-ready, RSC, Vercel-native |
| Auth & DB & Storage | Supabase | Free tier, pgvector, Google OAuth, RLS |
| Embeddings | Google Gemini `gemini-embedding-001` | 768-dim, free tier 1500 req/day |
| LLM | Groq `llama-3.1-8b-instant` | Free dev tier, sub-second streaming |
| OCR (images) | Tesseract.js (browser) | No server cost, no upload needed |
| PDF text | pdfjs-dist (browser) | Extracts text layer client-side |
| Styling | Tailwind CSS | Dark theme with indigo/violet accents |

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is fine).
2. Once the project is up, go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (treat this as a secret)
3. Go to **SQL Editor → New query** and paste the contents of [`supabase/schema.sql`](supabase/schema.sql). Run it. This creates the `documents` and `document_chunks` tables, the `match_chunks` function, the `legal-docs` storage bucket, and the row-level security policies.
4. Go to **Authentication → Providers** and enable **Google**. You'll need OAuth credentials from Google Cloud Console (see below).

#### Google OAuth setup (in Google Cloud Console)

1. Visit [console.cloud.google.com](https://console.cloud.google.com/) and create a project.
2. **APIs & Services → OAuth consent screen** → External → fill in app name & support email.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. Authorized JavaScript origins: `http://localhost:3000` (and your Vercel URL later, e.g. `https://legallens.vercel.app`).
5. Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback` (find the exact URL in Supabase under **Authentication → Providers → Google**).
6. Copy the **Client ID** and **Client Secret** into Supabase's Google provider config and save.

### 2. Get a Google Gemini API key (free, for embeddings)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free).
2. Sign in with your Google account.
3. Click **"Create API key"** → choose a project (or create a new one).
4. Copy the key into `GEMINI_API_KEY` in your `.env.local`.

Free tier: 1500 embedding requests per day, more than enough for personal use.

### 3. Get a Groq API key (free)

1. Sign up at [console.groq.com](https://console.groq.com) (free).
2. Go to **API Keys → Create API Key**.
3. Copy the key into `GROQ_API_KEY` in your `.env.local`.

Free tier limits: thousands of requests per day, ~30 requests per minute — more than enough for personal use.

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in all five values:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HUGGINGFACE_API_KEY=
GROQ_API_KEY=
```

### 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Google, upload a PDF or image, then ask questions in the chat.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js. Click **Deploy** (it will fail the first time without env vars).
4. Go to **Project Settings → Environment Variables** and add all five variables from `.env.local`.
5. Add your Vercel deployment URL (e.g. `https://legallens.vercel.app`) to:
   - **Supabase → Authentication → URL Configuration → Site URL**
   - **Google Cloud Console → OAuth client → Authorized JavaScript origins**
6. Redeploy. The app should now be live and working end-to-end.

The default Hobby function timeout (10s) is enough for this app because all heavy work happens either in the browser (OCR, PDF parsing) or in fast network calls to HuggingFace and Groq.

---

## Project Structure

```
app/
  page.tsx                       Landing
  auth/callback/route.ts         OAuth callback
  dashboard/page.tsx             Document list
  chat/page.tsx                  Chat UI
  api/
    index-document/route.ts      POST: chunk + embed + insert
    chat/route.ts                POST: RAG → streamed answer
    documents/[id]/route.ts      DELETE
components/
  Navbar.tsx, SignInButton.tsx
  DocumentCard.tsx, UploadModal.tsx
  ChatMessage.tsx, SourceBadge.tsx
lib/
  supabase.ts                    browser, server, admin clients
  chunker.ts                     ~500 token chunks, 50 overlap
  embeddings.ts                  HuggingFace embed helper (batched, retry)
  llm.ts                         Groq streaming wrapper
  clientOcr.ts                   Browser-side OCR / PDF parsing
  types.ts
supabase/
  schema.sql                     Tables, RLS, match_chunks, storage policies
middleware.ts                    Auth gate for /dashboard, /chat
```

---

## Cost Analysis (free tiers, personal use)

| Resource | Free tier covers |
|---|---|
| Vercel Hobby | 100 GB bandwidth, 100 GB-hours function time |
| Supabase | 500 MB database, 1 GB storage, 50K MAU |
| Google Gemini API | 1500 requests/day for embeddings |
| Groq dev tier | ~thousands of requests/day |

A typical personal use case (50 documents, 100 chat questions/day) costs **$0/month** on all four providers.

---

## Known Limitations (MVP)

- First document upload after a long idle period may take 15-20s while the HuggingFace model warms up. The retry logic handles this, but a user-visible spinner helps.
- Multi-page PDF OCR via Tesseract fallback (for image-only PDFs) is **not** implemented — the current code uses pdfjs-dist's text layer only. If a PDF has no text layer (e.g. a scanned PDF), the extracted text will be empty and the user will be told to upload a clearer file. A future version could add client-side PDF→image rendering + Tesseract fallback.
- Chat history is kept in component state, not persisted to the database (matches the original spec).
- The system prompt and model are optimized for English legal/contract documents.

---

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # run production build
npm run lint       # next lint
npm run typecheck  # tsc --noEmit
```
