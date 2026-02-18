# Spectra Voice (AI Recruiter)

Next.js 14 + TypeScript implementation of the Spectra Voice PRD for automated GTM/Sales screening.

## Features Implemented

- Candidate flow
- Landing + registration + CV upload
- PDF CV extraction + Gemini summary generation
- Interview room with ElevenLabs websocket bootstrap + dynamic variables
- Hiring manager dashboard
- Candidate table with status and score
- Candidate detail with CV summary, audio playback, transcript, and AI feedback
- Backend APIs per PRD + diagnostic endpoint
- SQLite/LibSQL persistence (Turso compatible)

## Tech

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (dark, glassmorphism styling)
- LibSQL client (`@libsql/client`) for SQLite/Turso
- Google Gemini (`gemini-1.5-flash`)
- ElevenLabs conversational websocket integration

## Environment

Copy `.env.example` to `.env` and set values:

- `DATABASE_URL` (`file:local.db` for local)
- `TURSO_DATABASE_URL` (preferred for Turso remote DBs)
- `TURSO_AUTH_TOKEN` (only for remote Turso)
- `GEMINI_API_KEY` (preferred) or `GOOGLE_API_KEY`
- `GEMINI_MODEL` (optional, default `gemini-2.5-flash`)
- `ELEVENLABS_AGENT_ID` (server diagnostic)
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` (client websocket)

## Run

```bash
npm install
npm run dev
```

Optional schema init:

```bash
npm run db:init
```

## API Endpoints

- `POST /api/register`
- `POST /api/upload-cv`
- `GET /api/candidates`
- `GET /api/candidates/[id]`
- `PATCH /api/candidates/[id]` (status updates)
- `POST /api/elevenlabs-webhook`
- `GET /api/diagnostic`

## Notes

- Webhook payload handling expects `dynamic_variables.candidate_id` (or `candidateId`) and transcript entries.
- Interview scoring is generated from CV summary + transcript and persisted as candidate `ai_score`.
