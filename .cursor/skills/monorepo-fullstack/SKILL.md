---
name: monorepo-fullstack
description: >
  Guides development of RentStar — a short-term rental (STR) properties platform —
  in a pnpm monorepo with Next.js, NestJS, Prisma/PostgreSQL, AWS S3, shadcn/ui,
  Tailwind, and Zustand. Use when adding features, modules, database models, API
  endpoints, pages, shared types, seed data, or fixing bugs in this repository.
  Always keep prisma/seed.ts in sync with schema changes.
---

# Monorepo Full-Stack Skill — RentStar STR Platform

RentStar is a **short-term rental properties platform** (Airbnb-style MVP). Core domains:

| Domain        | Models                                                     |
| ------------- | ---------------------------------------------------------- |
| Identity      | `User`, `UserProfile`, `OAuthAccount`                      |
| Hosts         | `HostProfile` (individual or company)                      |
| Listings      | `Property`, `PropertyPhoto`, `PropertyAmenity`             |
| Calendar      | `Availability`                                             |
| Bookings      | `Booking` (external payment refs — no in-app payments yet) |
| Messaging     | `Conversation`, `Message`                                  |
| Reviews       | `Review` (guest ↔ property/host, bidirectional)            |
| Notifications | `Notification`                                             |

Prices are stored in **minor currency units** (e.g. AMD, USD cents). S3 keys only — never store full URLs.

## Repository Map (always know where things live)

```
/
├── apps/
│   ├── web/                         # Next.js 14 — App Router, TypeScript
│   │   └── src/
│   │       ├── app/                 # Routes, layouts, pages (RSC by default)
│   │       ├── components/
│   │       │   └── ui/              # shadcn/ui components (CLI-generated, owned)
│   │       ├── lib/
│   │       │   ├── api.ts           # Typed fetch wrapper → api.get/post/patch/delete
│   │       │   └── utils.ts         # cn() and other helpers
│   │       ├── store/               # Zustand stores (index.ts; split by domain as app grows)
│   │       └── types/               # Frontend-only types
│   │
│   └── api/                         # NestJS — TypeScript, Swagger, class-validator
│       └── src/
│           ├── main.ts              # Bootstrap, global prefix api/v1, CORS, ValidationPipe
│           ├── app.module.ts        # Root module — imports all feature modules
│           ├── common/
│           │   ├── filters/         # Global exception filters
│           │   ├── guards/          # Auth guards
│           │   ├── interceptors/    # Response transform, logging
│           │   └── decorators/      # Custom parameter/method decorators
│           ├── config/
│           │   └── configuration.ts # Config factory — maps env vars to nested keys
│           ├── database/            # DatabaseModule — injects PRISMA token
│           ├── storage/             # StorageService — all S3 operations live here
│           └── <feature>/           # One folder per domain: users/, posts/, auth/, etc.
│               ├── <feature>.module.ts
│               ├── <feature>.controller.ts
│               ├── <feature>.service.ts
│               └── dto/             # CreateXDto, UpdateXDto — class-validator decorated
│
├── packages/
│   ├── database/                    # THE ONLY place Prisma lives
│   │   ├── prisma/
│   │   │   ├── schema/              # Multi-file Prisma schema (prismaSchemaFolder)
│   │   │   │   ├── base.prisma      # generator + datasource
│   │   │   │   ├── identity.prisma  # User, UserProfile, OAuthAccount
│   │   │   │   ├── host.prisma      # HostProfile
│   │   │   │   ├── property.prisma  # Property, photos, amenities, availability
│   │   │   │   ├── booking.prisma   # Booking
│   │   │   │   ├── messaging.prisma # Conversation, Message
│   │   │   │   ├── review.prisma    # Review
│   │   │   │   └── notification.prisma
│   │   │   ├── seed.ts              # ← MUST update when schema changes
│   │   │   └── migrations/
│   │   ├── scripts/
│   │   │   └── docker-init.sh       # migrate deploy + seed (runs on Docker start)
│   │   └── src/
│   │       ├── index.ts             # Exports PrismaClient singleton + all generated types
│   │       └── generated/           # Auto-generated — never edit manually
│   │
│   ├── shared/                      # Code imported by BOTH web and api
│   │   └── src/
│   │       ├── types/index.ts       # PaginationParams, ApiResponse, etc.
│   │       ├── constants/index.ts   # DEFAULT_PAGE_SIZE, S3_PRESIGNED_URL_EXPIRES, etc.
│   │       └── utils/index.ts       # slugify, paginate, etc.
│   │
│   ├── eslint-config/               # index.js (base), next.js, nest.js
│   ├── prettier-config/             # index.js — single source of formatting truth
│   └── tsconfig/                    # base.json, nextjs.json, nestjs.json
│
├── docker-compose.yml               # Production service definitions
├── docker-compose.dev.yml           # Dev override — hot reload + volume mounts
└── .husky/pre-commit                # Runs lint-staged on every commit
```

---

## Rule 1 — Package Placement Decision Tree

Before creating any file, answer:

| Question                              | Answer → Location                                 |
| ------------------------------------- | ------------------------------------------------- |
| Used by both `web` and `api`?         | `packages/shared/src/`                            |
| TypeScript config shared across apps? | `packages/tsconfig/`                              |
| ESLint rules shared?                  | `packages/eslint-config/`                         |
| Prettier rules?                       | `packages/prettier-config/index.js`               |
| Database model, migration, or seed?   | `packages/database/prisma/schema/<domain>.prisma` |
| Backend business logic / endpoint?    | `apps/api/src/<feature>/`                         |
| Frontend page or UI component?        | `apps/web/src/`                                   |
| S3 upload/download/presign?           | `apps/api/src/storage/storage.service.ts`         |

**Never** put Prisma imports in `apps/web`. The frontend must not touch the database directly.

**Never** duplicate types between `web` and `api` — put shared shapes in `packages/shared`.

---

## Rule 2 — Database Changes (Prisma)

Every schema change follows this exact sequence. Do not skip steps.

```bash
# 1. Edit the relevant schema file(s)
#    Directory: packages/database/prisma/schema/
#    Add models to the matching domain file (identity, host, property, etc.)
#    Put new enums in the same file as the models that use them.

# 2. Update starter seed to match the schema change
#    File: packages/database/prisma/seed.ts
#    Add/update/remove seed records for new models, required fields, or relations.

# 3. Create and apply a migration (also regenerates the Prisma client)
pnpm db:migrate
# prompts for a migration name → use snake_case e.g. "add_property_tags"

# 4. (Optional) Regenerate client without migrating
pnpm db:generate

# 5. Verify seed still runs
pnpm db:seed

# 6. New types are available via @repo/database in apps/api
```

### Schema change = seed change (mandatory)

Whenever you **add**, **rename**, or **remove** a model or required field:

1. Update the relevant file(s) in `packages/database/prisma/schema/`
2. Update `packages/database/prisma/seed.ts` in the **same change**
3. Use `upsert` in seed so Docker re-runs are idempotent
4. Run `pnpm db:seed` locally to verify before finishing

Seed runs automatically on Docker API startup via `packages/database/scripts/docker-init.sh`.

### Starter seed accounts (dev/Docker)

| Email                 | Role              |
| --------------------- | ----------------- |
| `admin@rentstar.am`   | ADMIN             |
| `host@rentstar.am`    | HOST (individual) |
| `company@rentstar.am` | HOST (company)    |
| `guest@rentstar.am`   | GUEST             |

Also seeds: 2 properties, photos, amenities, 30-day availability, bookings, messages, reviews, notifications.

### Schema conventions

- All model IDs: `String @id @default(cuid())`
- All models get: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- S3 references: store the **object key** (e.g. `avatarKey String?`), never a full URL
- Use `@@map("snake_case_table_name")` on every model
- Add `@@index([foreignKeyField])` for every foreign key column
- Enums live in the domain `.prisma` file that owns them, not in application code

### Adding a new model — checklist

- [ ] Add model to the appropriate file in `packages/database/prisma/schema/`
- [ ] Add starter seed data to `packages/database/prisma/seed.ts`
- [ ] Run `pnpm db:migrate`
- [ ] Run `pnpm db:seed` and confirm it succeeds
- [ ] Create NestJS module/controller/service/DTOs in `apps/api/src/<feature>/`
- [ ] Register the new module in `apps/api/src/app.module.ts`
- [ ] If the model is needed in frontend types too, add an interface to `packages/shared/src/types/`

---

## Rule 3 — Adding a NestJS Feature Module

Every backend domain follows this structure. Always generate all four files.

```
apps/api/src/<feature>/
├── <feature>.module.ts      # imports DatabaseModule, StorageModule if needed
├── <feature>.controller.ts  # @Controller('feature'), @ApiTags, Swagger decorators
├── <feature>.service.ts     # business logic — inject PRISMA token (see below)
└── dto/
    ├── create-<feature>.dto.ts   # @IsString(), @IsEmail(), etc.
    └── update-<feature>.dto.ts   # PartialType(CreateDto) from @nestjs/swagger
```

Then register in `app.module.ts`:

```ts
imports: [...existingModules, FeatureModule];
```

### Prisma injection (use this pattern — not PrismaService)

```ts
import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@repo/database";

import { PRISMA } from "../database/database.module";

@Injectable()
export class FeatureService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}
}
```

`DatabaseModule` is `@Global()` — feature modules do not need to import it unless you prefer explicit imports.

### DTO rules

- Always use `class-validator` decorators (`@IsString`, `@IsEmail`, `@IsOptional`, etc.)
- `UpdateDto` extends `PartialType(CreateDto)` — import from `@nestjs/swagger`, never duplicate fields
- Use `@ApiProperty()` / `@ApiPropertyOptional()` for Swagger docs on every field

### Controller rules

- Global prefix is `api/v1` (set in `main.ts`) — do not re-add it to `@Controller`
- Always add `@ApiTags('feature-name')`
- Add `@ApiBearerAuth()` on protected routes once auth is implemented (not required on public endpoints)
- Return types should use `ApiResponse<T>` from `@repo/shared`

---

## Rule 4 — Adding a Next.js Page or Component

### Pages (App Router)

```
apps/web/src/app/<route>/
├── page.tsx       # default export — Server Component unless "use client" needed
├── layout.tsx     # optional route-level layout
└── loading.tsx    # optional Suspense fallback
```

### Components

- Generic/reusable UI → `apps/web/src/components/ui/` (shadcn/ui pattern)
- Feature-specific → `apps/web/src/components/<feature>/`
- Keep `"use client"` boundaries as deep as possible — prefer RSC at the page level

### Adding a shadcn/ui component

```bash
pnpm --filter web ui:add <component-name>
# e.g.: pnpm --filter web ui:add dialog table select
```

This copies the component source into `apps/web/src/components/ui/` — it is then yours to modify.

### Zustand store conventions

- Stores live in `apps/web/src/store/` — currently `index.ts` exports all hooks
- Export named hooks: `useUserStore`, `useUIStore`
- Split into `<domain>.store.ts` files once a domain store grows beyond ~50 lines
- Wrap with `devtools()` always; wrap with `persist()` only for data that should survive page refresh
- Never put server-only data (raw DB records) in Zustand — use API response types from `@repo/shared`

### API calls from frontend

Use the typed client in `apps/web/src/lib/api.ts`:

```ts
import { api } from "@/lib/api";
const user = await api.get<User>("/users/me");
const post = await api.post<Post>("/posts", { title, content });
```

Never call `fetch` directly in components — always go through `api.*`.

---

## Rule 5 — Adding to Shared Packages

Add to `packages/shared` when the same type, constant, or utility is needed in both `web` and `api`.

```ts
// packages/shared/src/types/index.ts   — interfaces and type aliases
// packages/shared/src/constants/index.ts — string/number constants
// packages/shared/src/utils/index.ts   — pure functions (no Node or browser APIs)
```

All exports must flow through `packages/shared/src/index.ts`.
Import in consuming apps as: `import { MyType } from '@repo/shared'`

---

## Rule 6 — S3 Storage

All S3 operations go through `apps/api/src/storage/storage.service.ts`. Never call the AWS SDK directly from a feature service — inject `StorageService`.

```ts
// In a feature service:
constructor(private readonly storage: StorageService) {}

// Upload
const key = await this.storage.uploadFile(key, buffer, 'image/jpeg');

// Generate a presigned read URL (expires in 1h by default)
const url = await this.storage.getPresignedUrl(key);

// Delete
await this.storage.deleteFile(key);
```

Store only the S3 **object key** in the database (e.g. `users/abc123/avatar.jpg`).
Generate presigned URLs at request time — never store full S3 URLs.

---

## Rule 7 — Environment Variables

| Variable                | Used in                         | Notes                                        |
| ----------------------- | ------------------------------- | -------------------------------------------- |
| `DATABASE_URL`          | `packages/database`, `apps/api` | Never in `apps/web`                          |
| `AWS_REGION`            | `apps/api`                      | Mapped to `aws.region` in config             |
| `AWS_ACCESS_KEY_ID`     | `apps/api`                      | Never commit real values                     |
| `AWS_SECRET_ACCESS_KEY` | `apps/api`                      | Never commit real values                     |
| `AWS_S3_BUCKET`         | `apps/api`                      | Mapped to `aws.s3Bucket` in config           |
| `NEXT_PUBLIC_API_URL`   | `apps/web`                      | Prefixed `NEXT_PUBLIC_` = exposed to browser |
| `FRONTEND_URL`          | `apps/api`                      | Used for CORS origin                         |
| `PORT`                  | `apps/api`                      | Default 3001                                 |

### Adding a new env var — checklist

1. Add to `.env.example` (root) with a blank or example value
2. Backend-only → also add to `apps/api/.env.example`
3. Frontend/browser → also add to `apps/web/.env.local.example` with `NEXT_PUBLIC_` prefix
4. Backend → map in `apps/api/src/config/configuration.ts`, then read via nested key

### Access patterns

```ts
// NestJS — read via ConfigService using nested keys from configuration.ts
this.config.getOrThrow<string>("aws.region");
this.config.getOrThrow<number>("port");
// Do not read process.env directly in services/controllers

// Next.js — browser-safe vars only
process.env.NEXT_PUBLIC_API_URL;
```

---

## Rule 8 — Quality Gate (run after every code change)

**Mandatory.** After any edit, run lint + format + typecheck for **each affected workspace only**:

| Changed in             | Run                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `apps/api/**`          | `pnpm --filter api lint --fix && pnpm --filter api format && pnpm --filter api typecheck` |
| `apps/web/**`          | `pnpm --filter web lint --fix && pnpm --filter web format && pnpm --filter web typecheck` |
| `packages/database/**` | `pnpm --filter database format` (+ `pnpm db:generate` if schema changed)                  |
| Multiple apps/packages | Run each affected row above                                                               |

**If any check fails, fix before considering the task done.**

Husky lint-staged on commit (changed files only):
| Files | Commands |
|---|---|
| `apps/web/**/*.{ts,tsx}` | `eslint --fix` → `prettier --write` |
| `apps/api/**/*.ts` | `eslint --fix` → `prettier --write` |
| `packages/database/**/*.{prisma,ts}` | `prettier --write` |
| `packages/**/*.{ts,tsx,js}` | `prettier --write` |
| `**/*.{json,md,yml,yaml}` | `prettier --write` |

---

## Rule 9 — Dev Start

```bash
pnpm dev          # Docker Compose — postgres + api + web (hot reload)
pnpm dev:web      # Next.js only on :3000
pnpm dev:api      # NestJS only on :3001
pnpm db:migrate   # Create + apply Prisma migration
pnpm db:generate  # Regenerate Prisma client (without migrating)
pnpm db:seed      # Run starter seed manually
pnpm db:studio    # Open Prisma Studio
```

`pnpm dev` runs Docker Compose. The **api** container runs `docker-init.sh` first:

1. `prisma migrate deploy`
2. `prisma db seed`
3. Starts the API server

- **postgres** on port 5432
- **api** on port 3001
- **web** on port 3000

If port 5432 is already in use (local Postgres), either stop the local instance or change the port mapping in `docker-compose.yml`.

---

## Rule 10 — Workspace Dependency Conventions

Always reference internal packages with `workspace:*`:

```json
"dependencies": {
  "@repo/database": "workspace:*",
  "@repo/shared": "workspace:*"
}
```

After adding a new workspace dep or a new `packages/*` package:

```bash
pnpm install   # re-links workspace packages
```

Never copy code between packages — if two apps need the same logic, it belongs in `packages/shared`.

---

## Common Task Recipes

### Add a new database model + API endpoint

1. Edit the relevant file(s) in `packages/database/prisma/schema/`
2. Update `packages/database/prisma/seed.ts` with starter records
3. `pnpm db:migrate` → name the migration
4. `pnpm db:seed` → verify seed succeeds
5. Create `apps/api/src/<feature>/` with module, controller, service, DTOs
6. Inject `@Inject(PRISMA) private readonly prisma: PrismaClient` in the service
7. Register in `app.module.ts`
8. `pnpm --filter api lint && pnpm --filter api typecheck`

### Add a new frontend page with data fetching

1. Create `apps/web/src/app/<route>/page.tsx` (RSC)
2. Fetch via `api.*` from `@/lib/api` in a Server Component, or via Zustand action in a Client Component
3. Add any new shared types to `packages/shared/src/types/`
4. `pnpm --filter web lint && pnpm --filter web typecheck`

### Add a shared type or utility

1. Add to the appropriate file in `packages/shared/src/`
2. Export from `packages/shared/src/index.ts`
3. Import in either app as `import { X } from '@repo/shared'`
4. `pnpm lint && pnpm typecheck`

### Add a shadcn/ui component

```bash
pnpm --filter web ui:add <name>
# Component is now in apps/web/src/components/ui/<name>.tsx — edit freely
```

### Add a new environment variable

1. Add to `.env.example` (root)
2. Backend-only → `apps/api/.env.example` + `apps/api/src/config/configuration.ts`
3. Frontend/browser → `apps/web/.env.local.example` with `NEXT_PUBLIC_` prefix
4. Read in NestJS: `this.config.getOrThrow('nested.key')` matching `configuration.ts`
5. Read in Next.js: `process.env.NEXT_PUBLIC_*` for browser-safe vars only
