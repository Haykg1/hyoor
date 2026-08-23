# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

RentStar — a short-term rental (STR) properties platform (Airbnb-style MVP). pnpm monorepo (Turborepo) with Next.js 14 (App Router) frontend, NestJS backend, Prisma/PostgreSQL, AWS S3, shadcn/ui, Tailwind, Zustand.

## Commands

```bash
pnpm dev            # Docker Compose — postgres + api + web, hot reload (primary way to run everything)
pnpm dev:web        # Next.js only, :3000
pnpm dev:api        # NestJS only, :3001

pnpm db:migrate     # prisma migrate dev (prompts for snake_case migration name)
pnpm db:generate    # regenerate Prisma client without migrating
pnpm db:seed        # run packages/database/prisma/seed.ts
pnpm db:studio      # Prisma Studio

pnpm lint           # lint all workspaces
pnpm format         # format all workspaces
pnpm typecheck      # typecheck all workspaces
pnpm build          # build all workspaces

pnpm e2e:tests      # bash scripts/e2e-tests.sh — spins up isolated Postgres (docker-compose.e2e.yml, port 5434), migrates, runs Jest e2e specs, tears down
```

Per-workspace (always prefer scoping to the workspace you touched):

```bash
pnpm --filter web lint --fix && pnpm --filter web format && pnpm --filter web typecheck
pnpm --filter api lint --fix && pnpm --filter api format && pnpm --filter api typecheck
pnpm --filter database format        # + pnpm db:generate if schema changed
pnpm --filter web ui:add <name>      # add a shadcn/ui component into apps/web/src/components/ui/
```

Backend tests (Jest, run from `apps/api`):

```bash
pnpm --filter api test                                  # unit specs (*.spec.ts under src/)
pnpm --filter api test -- path/to/file.spec.ts           # single unit test file
pnpm --filter api test:e2e                               # e2e specs (*.e2e-spec.ts), maxWorkers 1
pnpm --filter api test:e2e -- path/to/file.e2e-spec.ts   # single e2e spec (needs the e2e Postgres up — use pnpm e2e:tests for the full lifecycle, or docker-compose -f docker-compose.e2e.yml up -d first)
```

### Quality gate — run after every code change, before considering a task done

| Changed in             | Run                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/**`          | `pnpm --filter api lint --fix && pnpm --filter api format && pnpm --filter api typecheck` (+ `pnpm e2e:tests` if routes/auth/validation changed) |
| `apps/web/**`          | `pnpm --filter web lint --fix && pnpm --filter web format && pnpm --filter web typecheck`                                                        |
| `packages/database/**` | `pnpm --filter database format` (+ `pnpm db:generate` if schema changed)                                                                         |
| `packages/shared/**`   | `pnpm lint && pnpm typecheck`                                                                                                                    |

Husky + lint-staged also runs on commit (changed files only), so the above should already be clean before committing.

## Architecture

### Repository map

```
apps/
  web/src/
    app/                 # Next.js App Router routes, layouts, pages (Server Components by default)
    components/ui/        # shadcn/ui components — CLI-generated, then owned/edited freely
    components/<feature>/ # feature-specific components
    lib/api.ts             # typed fetch client — api.get/post/patch/delete (never call fetch directly)
    lib/utils.ts            # cn() and helpers
    store/                 # Zustand stores (client state only, never raw DB records)
    types/                  # frontend-only types
    i18n/                   # next-intl setup

  api/src/
    main.ts               # bootstrap, global prefix api/v1, CORS, ValidationPipe
    app.module.ts           # root module, imports every feature module
    common/                 # filters/, guards/, interceptors/, decorators/
    config/configuration.ts # maps env vars to nested keys, read via ConfigService
    database/               # DatabaseModule (@Global) — exports PrismaService
    storage/                # StorageService — the only place S3 calls happen
    <feature>/              # one folder per domain (see below), each with module/controller/service/dto

packages/
  database/               # THE ONLY place Prisma lives
    prisma/schema/          # multi-file schema (prismaSchemaFolder): base, identity, host, property, booking, messaging, review, notification, promotion
    prisma/seed.ts          # MUST stay in sync with schema changes (upsert-based, idempotent)
    scripts/docker-init.sh  # migrate deploy + seed, runs on Docker API startup
    src/index.ts            # exports PrismaClient singleton + generated types
    src/generated/          # auto-generated, never edit
  shared/src/              # code imported by BOTH web and api: types/, constants/, utils/ — all re-exported from index.ts
  eslint-config/, prettier-config/, tsconfig/  # shared tooling config
```

Feature domains currently in `apps/api/src/`: `admin`, `ai-search`, `auth`, `availability`, `bookings`, `cancellation-claims`, `compare-share`, `contact`, `currency`, `deposit-claims`, `favorites`, `geocoding`, `health`, `host-analytics`, `host-profiles`, `mail`, `messaging`, `notifications`, `payment-failures`, `payments`, `poi`, `promotions`, `properties`, `redis`, `reviews`, `scheduling`, `users`.

Core Prisma domains: Identity (`User`, `UserProfile`, `OAuthAccount`), Hosts (`HostProfile`), Listings (`Property`, `PropertyPhoto`, `PropertyAmenity`), Calendar (`Availability`), Bookings (`Booking` — Stripe Checkout + Connect; `SecurityDepositClaim`, `CancellationFeeClaim`, `PaymentFailure`), Messaging (`Conversation`, `Message`), Reviews (bidirectional guest ↔ property/host), Notifications, Promotions (`PropertyPromotion`).

### Conventions that don't show up from a single file

- **Prices** are stored in minor currency units (e.g. AMD/USD cents) everywhere.
- **S3**: only the object key is ever persisted (e.g. `users/abc123/avatar.jpg`) — never a full URL. Presigned read URLs are generated at request time via `StorageService`. All S3 calls go through `apps/api/src/storage/storage.service.ts`; never call the AWS SDK directly from a feature service.
- **Prisma access in NestJS**: inject `PrismaService` from `DatabaseModule` (global) — not a `PRISMA` token:
  ```ts
  constructor(private readonly prisma: PrismaService) {}
  ```
- **Frontend never imports Prisma** and never talks to the database directly — everything goes through `apps/web/src/lib/api.ts`.
- **No duplicated types** between `web` and `api` — shared shapes belong in `packages/shared/src/types`.
- Every Prisma model: `id String @id @default(cuid())`, `createdAt`/`updatedAt`, `@@map("snake_case_table_name")`, `@@index` on every FK. Enums live in the domain `.prisma` file that owns them.
- Config in NestJS is read via `ConfigService` nested keys from `configuration.ts` — never `process.env` directly in services/controllers. In Next.js, only `NEXT_PUBLIC_*` vars are browser-safe.
- Docker Postgres is mapped to host port **5433** (not 5432, to avoid clashing with a local Postgres); the e2e Postgres runs on **5434**.
- Starter seed accounts (dev/Docker): `admin@rentstar.am` (ADMIN), `host@rentstar.am` (HOST individual), `company@rentstar.am` (HOST company), `guest@rentstar.am` (GUEST) — plus sample properties, photos, availability, bookings, messages, reviews, notifications.

### Schema changes (Prisma) — required sequence

1. Edit the relevant file(s) in `packages/database/prisma/schema/` (add new models to the matching domain file; put new enums alongside the models that use them).
2. Update `packages/database/prisma/seed.ts` in the same change (use `upsert`).
3. `pnpm db:migrate` (snake_case migration name) — also regenerates the Prisma client.
4. `pnpm db:seed` to verify.
5. New types become available via `@repo/database` in `apps/api`.

### Adding a NestJS feature module

Always create all four: `<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`, `dto/create-<feature>.dto.ts` + `update-<feature>.dto.ts` (via `PartialType(CreateDto)` from `@nestjs/swagger`), then register the module in `app.module.ts`. Controllers stay thin; DTOs are `class-validator`-decorated; no `any`, explicit return types; global route prefix `api/v1` is already applied in `main.ts` — don't re-add it per-controller.

### Integration (e2e) tests for `apps/api`

- Files: `apps/api/test/e2e/*.e2e-spec.ts`, helpers in `apps/api/test/helpers/`, required env fails fast in `apps/api/test/setup/e2e-env.ts`.
- Use `createTestApp()` (mirrors production pipes/filters/interceptors, mocks `StorageService`); reset with `resetE2eDatabase()` in `beforeEach`; build test data with helpers (`registerUser`, `uniqueEmail`) rather than raw Prisma or the seed script.
- Cover happy path + main error cases (401, 409, 400) per endpoint. Add/update specs in the same change as any API route/auth/validation change.

### Legal & policy sync

When a change affects what guests, hosts, or regulators must be told, update the **live** markdown under `apps/web/src/content/legal/` in the same change (`en` / `hy` / `ru`). Cursor rule: `.cursor/rules/legal-policy-sync.mdc`.

| Topic                  | Files                                                       |
| ---------------------- | ----------------------------------------------------------- |
| Terms                  | `terms-of-service.{en,hy,ru}.md`                            |
| Privacy                | `privacy-policy.{en,hy,ru}.md`                              |
| Cancellation / refunds | `cancellation-refund-policy.{en,hy,ru}.md`                  |
| Cookies / consent      | `cookie-policy.{en,hy,ru}.md`, consent UI, `cookies.*` i18n |

Identity placeholders stay `[SQUARE BRACKETS]` in markdown; fill values in `packages/shared/src/constants/company.ts` (rendered via `apps/web/src/lib/legal/placeholders.ts`). Triggers include cookies/localStorage, payments/fees/payouts, cancellations, auth/identity, and new personal data.

### SEO — public pages

New **public, indexable** pages must be added to `STATIC_PATHS` in `apps/web/src/app/sitemap.ts` in the same change, with `generateMetadata` via `buildPageMetadata`. Private prefixes go in `apps/web/src/app/robots.ts` (`PRIVATE_PATH_PREFIXES`). Cursor rule: `.cursor/rules/seo-sitemap.mdc`. Do not sitemap `/admin`, `/dashboard`, `/auth`, `/host`, compare-share tokens, or query-only URLs.

## Code style

- English only for code and documentation.
- Early returns over nested conditionals; no blank lines inside function bodies.
- Comments only for non-obvious business logic or deep technical details — code should read on its own. JSDoc only for public methods/complex logic.
- NestJS: `kebab-case` filenames (`user-profile.service.ts`), `PascalCase` classes, `camelCase` methods, constructor injection with `private readonly`.
- Next.js: `kebab-case` directories, `PascalCase` components, Server Components by default (`"use client"` only where interactivity/hooks are needed), Tailwind for styling, Server Actions for mutations.
- Always validate inputs and check permissions (RBAC/guards) before sensitive operations.
