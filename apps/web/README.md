# RentStar Web

Next.js 14 (App Router) frontend for RentStar (short-term rental platform). TypeScript, Tailwind CSS, shadcn/ui, Zustand, next-intl.

See the repo-root [`CLAUDE.md`](../../CLAUDE.md) for full monorepo architecture and conventions.

## Development

Run from the repo root (this app is part of a pnpm workspace):

```bash
pnpm dev            # Docker Compose — postgres + api + web, hot reload
pnpm dev:web        # this app only, on :3000 (needs the API reachable separately)
```

Copy `.env.local.example` to `.env.local` before running standalone: `NEXT_PUBLIC_API_URL` (backend base URL, defaults to `http://localhost:3001/api/v1`), `NEXT_PUBLIC_SITE_URL`. Only `NEXT_PUBLIC_*` vars are exposed to the browser.

## Commands

```bash
pnpm --filter web lint --fix
pnpm --filter web format
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web start
pnpm --filter web ui:add <component-name>   # add a shadcn/ui component, e.g. dialog, table, select
```

## Architecture

- `src/app/` — routes, layouts, pages (App Router). Server Components by default; default exports for pages/layouts.
- `src/components/ui/` — shadcn/ui components, CLI-generated then owned/edited freely.
- `src/components/<feature>/` — feature-specific components.
- `src/lib/api.ts` — typed fetch client (`api.get/post/patch/delete`). Always go through this instead of calling `fetch` directly in components.
- `src/lib/utils.ts` — `cn()` and other helpers.
- `src/store/` — Zustand stores for client state only (never raw DB records — use API response types from `@repo/shared`).
- `src/types/` — frontend-only types.
- `src/i18n/` — `next-intl` setup.
- `src/middleware.ts` — request middleware (locale routing, etc).
- The frontend never imports Prisma or talks to the database directly.

## Conventions

- `kebab-case` directories, `PascalCase` React components.
- Server Components by default; `"use client"` only where hooks/interactivity are needed, kept as deep in the tree as possible.
- Tailwind CSS for styling; avoid global CSS.
- Server Actions for mutations; fetch in Server Components for reads.
- Shared types/constants/utils that both `web` and `api` need belong in `packages/shared`, imported as `@repo/shared` — never duplicate them locally.
