# RentStar API

NestJS backend for RentStar (short-term rental platform). TypeScript, Prisma/PostgreSQL, AWS S3, Swagger, JWT + Google/Apple OAuth.

See the repo-root [`CLAUDE.md`](../../CLAUDE.md) for full monorepo architecture and conventions.

## Development

Run from the repo root (this app is part of a pnpm workspace):

```bash
pnpm dev            # Docker Compose — postgres + api + web, hot reload
pnpm dev:api        # this app only, on :3001 (needs Postgres/Redis reachable separately)
```

Copy `.env.example` to `.env` and fill in values before running standalone. Key vars: `DATABASE_URL`, `AWS_*` (S3, LocalStack-friendly), `JWT_SECRET`/`JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_*`, `REDIS_URL`, `RESEND_API_KEY` (leave empty to log emails to console in dev), `OPENAI_API_KEY` (AI property search, optional).

## Commands

```bash
pnpm --filter api lint --fix
pnpm --filter api format
pnpm --filter api typecheck
pnpm --filter api build
pnpm --filter api test                                # unit specs (*.spec.ts)
pnpm --filter api test -- path/to/file.spec.ts         # single unit test
pnpm --filter api test:e2e                             # e2e specs (*.e2e-spec.ts)
pnpm --filter api test:e2e -- path/to/file.e2e-spec.ts # single e2e spec
```

Full e2e lifecycle (isolated Postgres on port 5434, migrate, run specs, tear down) — run from repo root:

```bash
pnpm e2e:tests
```

## Architecture

- `src/main.ts` — bootstrap, global route prefix `api/v1`, CORS, `ValidationPipe`, Helmet.
- `src/app.module.ts` — root module, imports every feature module.
- `src/common/` — global filters, guards, interceptors, decorators.
- `src/config/configuration.ts` — maps env vars to nested keys; read via `ConfigService`, never `process.env` directly in services/controllers.
- `src/database/` — `DatabaseModule` (`@Global()`), exports the `PRISMA` injection token. Inject it directly instead of a `PrismaService` class:
  ```ts
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}
  ```
- `src/storage/` — `StorageService`, the only place S3 calls happen. Only S3 object keys are persisted, never full URLs; presigned read URLs are generated at request time.
- Feature domains, one folder each with `module`/`controller`/`service`/`dto`: `admin`, `ai-search`, `auth`, `availability`, `bookings`, `compare-share`, `favorites`, `geocoding`, `health`, `host-profiles`, `mail`, `messaging`, `notifications`, `payments`, `poi`, `promotions`, `properties`, `redis`, `reviews`, `scheduling`, `users`.
- Database schema and migrations live in `packages/database` (the only place Prisma lives in the monorepo) — this app never edits Prisma files directly.

## Conventions

- `kebab-case` filenames (`user-profile.service.ts`), `PascalCase` classes, `camelCase` methods, constructor injection with `private readonly`.
- DTOs are `class-validator`-decorated; `UpdateDto` extends `PartialType(CreateDto)` from `@nestjs/swagger`; no `any`, explicit return types.
- Controllers stay thin — business logic belongs in services. Global prefix `api/v1` is already applied — don't re-add it per-controller. Add `@ApiTags()`/`@ApiBearerAuth()` for Swagger.
- Prices are stored in minor currency units (e.g. AMD/USD cents).
- Add/update `*.e2e-spec.ts` under `test/e2e/` in the same change whenever a route, auth rule, or validation changes. See `apps/api/test/helpers/` for `createTestApp()`, `resetE2eDatabase()`, and data helpers like `registerUser`.
