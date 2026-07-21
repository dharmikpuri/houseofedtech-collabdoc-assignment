# CollabDoc

A **local-first, collaborative document editor** with offline synchronization, deterministic
conflict resolution, and granular version control.

Built for the House of Edtech Fullstack Developer assignment by **Dharmik Puri Goswami**.

> 📁 The full planning + architecture write-up lives in [`/docs`](./docs). Start with
> [`docs/README.md`](./docs/README.md).

## Tech stack

| Layer               | Choice                                        |
| ------------------- | --------------------------------------------- |
| Framework           | Next.js 16 (App Router, React 19, TypeScript) |
| Styling             | Tailwind CSS v4 + shadcn/ui                   |
| Database            | PostgreSQL + Prisma _(Phase 3)_               |
| Auth                | Auth.js v5 _(Phase 2)_                        |
| Conflict resolution | Yjs (CRDT) _(Phase 4+)_                       |
| Real-time           | Yjs WebSocket server _(Phase 6)_              |
| AI                  | Vercel AI SDK + Google Gemini _(Phase 9)_     |
| Tests               | Vitest + Playwright _(Phase 10)_              |

Items marked with a phase are wired up when that phase is reached — the project is built
incrementally, not scaffolded all at once.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local   # then fill in values as phases require them

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script              | Description                |
| ------------------- | -------------------------- |
| `npm run dev`       | Start the dev server       |
| `npm run build`     | Production build           |
| `npm run start`     | Serve the production build |
| `npm run lint`      | ESLint                     |
| `npm run typecheck` | TypeScript, no emit        |
| `npm run format`    | Prettier write             |

## Project conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org), enforced by
  commitlint + Husky.
- **Branches**: one per phase (`feat/phase-N-name`), merged into `main` via PR — see
  [`docs/16-git-workflow.md`](./docs/16-git-workflow.md).
- **Code style** is enforced on commit via lint-staged (ESLint + Prettier).

## Roadmap

Ten phases from setup to deployment — see
[`docs/15-development-roadmap.md`](./docs/15-development-roadmap.md).
