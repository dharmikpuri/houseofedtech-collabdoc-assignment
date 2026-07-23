# CollabDoc

A **local-first, collaborative document editor** with offline editing, deterministic conflict
resolution, and granular version control.

Built for the House of EdTech Full-Stack Developer assignment by **Dharmik Puri Goswami**.

---

## How the graded requirements are met

| Requirement                           | Where it lives                                                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Local-first / offline sync**        | Every keystroke is written to a local Yjs document persisted in **IndexedDB** (`y-indexeddb`). A **service worker** caches pages/assets so a document opens with no network, and edits made offline sync automatically on reconnect. |
| **Deterministic conflict resolution** | The document is a **Yjs CRDT**. Concurrent edits from any number of clients converge to the same state regardless of order or timing — no last-write-wins clobbering, no manual merge.                                               |
| **Granular version control**          | Named snapshots (stored as editor JSON) with author + timestamp. **Restore is non-destructive**: it saves the current state first, then applies the old content as a _forward edit_, so live collaborators are never overwritten.    |

## Features

- Real-time collaboration with live presence cursors
- Works fully offline; syncs on reconnect
- Email/password auth (Auth.js v5)
- Per-document roles — **Owner / Editor / Viewer** — enforced in the API, the collab server, and the database
- Share a document with other users by email
- Version history with safe restore
- AI "What changed since?" summaries between a version and the current draft (Google Gemini)
- Security hardening: Postgres **row-level security**, rate limiting, CSP, request-size caps

## Tech stack

| Layer               | Choice                                                      |
| ------------------- | ----------------------------------------------------------- |
| Framework           | Next.js 16 (App Router, React 19, TypeScript)               |
| Styling             | Tailwind CSS v4                                             |
| Database            | PostgreSQL (Supabase) + Prisma 6                            |
| Auth                | Auth.js v5 (Credentials, JWT sessions)                      |
| Editor              | TipTap 3 (ProseMirror)                                      |
| Conflict resolution | Yjs (CRDT) + `y-indexeddb` for local persistence            |
| Real-time transport | Hocuspocus (Yjs WebSocket server) — a separate Node process |
| AI                  | Google Gemini (REST)                                        |

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  Next.js app (:3000)     │        │  Collab server (:1234)   │
│  - UI + REST API         │        │  Hocuspocus / Yjs WS     │
│  - Auth, roles, versions │        │  - verifies collab JWT   │
│  - Prisma (app_user role)│        │  - relays CRDT updates   │
└───────────┬─────────────┘        └────────────┬─────────────┘
            │                                    │
            │  short-lived JWT (role-scoped)     │
            └──────────────┬─────────────────────┘
                           ▼
                 ┌───────────────────┐
                 │  PostgreSQL       │
                 │  - app tables     │
                 │  - RLS policies   │
                 │  - CRDT state blob│
                 └───────────────────┘
```

The Next app and the collaboration server are **separate processes** because a Next.js server
can't hold long-lived WebSocket connections. The browser edits a local Yjs doc; the Hocuspocus
server relays CRDT updates between clients and persists the merged state to Postgres so documents
survive restarts and new joiners load the current content.

Access is gated the same way everywhere by one capability matrix (`src/lib/authz/roles.ts`): the
REST API checks it, the collab server marks Viewer connections read-only, and **Postgres RLS policies
are a backstop** — every request runs with the caller's id in `app.user_id`, and the policies scope
each row to it. The app connects as the database owner (which bypasses RLS), so the policies sit as
defense-in-depth behind the app-layer checks and enforce for any non-owner access path.

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (a free [Supabase](https://supabase.com) project works)

### 1. Install dependencies

```bash
npm install               # app
npm run collab:install    # collaboration server
```

### 2. Configure environment

```bash
cp .env.example .env       # then fill in the values (see the comments in the file)
```

At minimum set `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `COLLAB_TOKEN_SECRET`.
`GEMINI_API_KEY` is optional — the AI summary feature hides itself when it's absent.

> **Connection note:** use the **direct/session** Postgres connection (port `5432`), not the
> transaction pooler. The app uses Prisma interactive transactions, which need a session-mode
> connection.

### 3. Apply the database schema

```bash
npx prisma migrate deploy
```

This creates the tables **and** the RLS role + policies. The app expects the `app_user` role to
exist, so this step is required before it will run.

### 4. Run it

```bash
npm run dev       # app  → http://localhost:3000
npm run collab    # collaboration server → ws://localhost:1234  (separate terminal)
```

Open two browser windows on the same document to see live collaboration. Go offline (DevTools →
Network → Offline) and keep typing to see local-first editing; reconnect to watch it sync.

## Security

- **Row-level security** — policies scope every read/write to documents the user has a permission
  row for, using the caller's id set per transaction; a backstop behind the app-layer authz checks.
- **Role-based authorization** — one capability matrix enforced across the REST API and the collab
  server (Viewers connect read-only).
- **Rate limiting** — auth, sharing, version, collab-token, and AI endpoints are throttled per IP.
- **Request-size caps** — oversized bodies are rejected before buffering (OOM protection).
- **Security headers** — CSP (production), `X-Frame-Options`, `X-Content-Type-Options`, and more.

## Deployment

The two processes deploy separately.

### App → Vercel

1. Import the repo into Vercel (root directory: `collabdoc`).
2. Set env vars: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `COLLAB_TOKEN_SECRET`,
   `NEXT_PUBLIC_COLLAB_WS_URL` (the deployed collab-server URL, `wss://…`), and optionally
   `GEMINI_API_KEY`.
3. Deploy. `prisma generate` runs on install; run `npx prisma migrate deploy` against the prod DB once.

### Collaboration server → a host that allows persistent WebSockets

Vercel can't run a long-lived WebSocket server, so deploy `collab-server/` to **Railway**, **Render**,
or **Fly.io**:

1. Root directory `collab-server`, start command `npm start`.
2. Set env vars: `DATABASE_URL` (same DB), `COLLAB_TOKEN_SECRET` (must match the app), `PORT`.
3. Expose it over TLS and point the app's `NEXT_PUBLIC_COLLAB_WS_URL` at the resulting `wss://` URL.

### Database → Supabase

Use the direct/session connection string for `DATABASE_URL` and `DIRECT_URL` (see the connection
note above). Run `npx prisma migrate deploy` to apply migrations, including RLS.

## Project structure

```
collabdoc/
├─ src/
│  ├─ app/            # routes: auth, dashboard, document, REST API
│  ├─ components/     # editor, documents, layout, ui
│  ├─ lib/
│  │  ├─ authz/       # roles + document/version/sharing access (RLS-scoped)
│  │  ├─ ai/          # Gemini client + text extraction
│  │  ├─ security/    # rate limiting + request guards
│  │  ├─ collab/      # collab-token signing
│  │  └─ validation/  # Zod schemas
│  └─ middleware.ts   # Auth.js route protection
├─ collab-server/     # Hocuspocus Yjs WebSocket server (separate process)
├─ prisma/            # schema + migrations (incl. row_level_security)
└─ public/            # service worker, static assets
```

## Scripts

| Command             | What it does                   |
| ------------------- | ------------------------------ |
| `npm run dev`       | Start the Next.js app          |
| `npm run collab`    | Start the collaboration server |
| `npm run build`     | Production build               |
| `npm run lint`      | ESLint                         |
| `npm run typecheck` | TypeScript, no emit            |
| `npm run format`    | Prettier write                 |
