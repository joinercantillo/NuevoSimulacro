# Simulacro — Performance Assessment · NestJS

## Hotel reservations REST API — Arenosa Hotels S.A.S.

API to register and consult room reservations for the Barranquilla Carnival
season, with role control, a status lifecycle, API-key protection, JWT login,
Swagger documentation, PostgreSQL persistence, generated ER/MER diagrams and
reproducible evidence produced with `curl`.

---

## 1. Stack

| Technology | Use |
| --- | --- |
| Node.js 24 + TypeScript 6 (ESM, `nodenext`) | Runtime and language |
| NestJS 12 + Nest CLI | Framework (modules, controllers, services, guards, pipes, interceptors, filters) |
| PostgreSQL 16 (Docker Compose) · embedded PostgreSQL in the tests | Persistence |
| TypeORM 1 + `@nestjs/typeorm` | ORM and repositories |
| class-validator + class-transformer + global `ValidationPipe` | DTO validation through pipes |
| `@nestjs/jwt` + passport (JWT strategy) + bcrypt | Authentication |
| `@nestjs/swagger` | OpenAPI documentation |
| `@nestjs/config` + zod | Environment variables validated when the application boots |
| Jest 30 (ESM) + Supertest | Unit and end to end tests |
| oxlint + Prettier | Lint and formatting |
| Mermaid CLI + Node scripts | Diagrams generated from a single source of truth |

---

## 2. Requirements

- Node.js 20 or higher (tested with Node 24) and npm.
- Docker + Docker Compose **only** for the development database. The end to
  end suite boots its own PostgreSQL, so it runs without Docker.

---

## 3. Installation

```bash
npm install
Copy-Item .env.example .env      # macOS / Linux: cp .env.example .env
```

Then review `.env` (section 4). The application **does not start** when a
mandatory variable is missing: there are no default values in the source code.
The error tells you which key is absent.

---

## 4. Environment variables

Every port, credential, key and secret lives in `.env` (gitignored). Nothing is
hardcoded in `src/`, `test/` or `scripts/`.

| Variable | Meaning | Used by |
| --- | --- | --- |
| `HOST` | Interface the API binds to (`localhost`, or `0.0.0.0` for remote connections) | `src/main.ts`, Swagger |
| `PORT` | HTTP port of the API | `src/main.ts`, Swagger |
| `DB_HOST`, `DB_PORT` | Address of PostgreSQL | `src/config/env.config.ts` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database and credentials | `src/config/env.config.ts` |
| `DB_SYNCHRONIZE` | `true` lets TypeORM create/update the schema (development and tests) | `src/config/env.config.ts` |
| `API_KEYS` | Comma separated list of valid API keys, one per branch (RN-04) | `ApiKeyGuard` |
| `JWT_SECRET` | Secret used to sign and verify the tokens (32+ characters) | `auth.module.ts`, `jwt.strategy.ts` |
| `JWT_EXPIRES_IN` | Lifetime issued by `POST /auth/login` (for example `1h`) | `auth.service.ts` |
| `BCRYPT_ROUNDS` | Cost factor of the password hash | `users.service.ts`, `seed.service.ts` |
| `SEED_USER_PASSWORD` | Initial password of the accounts created by the seed | `seed.service.ts` |
| `TEST_PG_PORT`, `TEST_DB_HOST` | Disposable cluster used by the e2e suite and the evidence | `jest.e2e.config.js`, `scripts/evidence-db.mjs` |
| `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_SYNCHRONIZE` | Database of the e2e suite and the evidence | `jest.e2e.config.js`, `scripts/evidence.ps1` |
| `TEST_API_KEYS` | API keys used by the e2e suite and the evidence | `jest.e2e.config.js`, `scripts/evidence.ps1` |
| `MERMAID_BROWSER_PATH` | Optional Chrome/Edge path for the diagram renderer (empty → Puppeteer's own browser) | `scripts/render-diagrams.mjs` |

How the values are read:

- `src/config/env.validation.schema.ts` — zod schema. A missing or malformed
  variable aborts the boot with a specific message; **no `.default()` is used**.
- `src/config/env.config.ts` — `required('NAME')` throws when the variable is
  absent, instead of falling back to a hidden value.
- `src/main.ts` — `configService.getOrThrow<number>('port')` and
  `getOrThrow<string>('host')`, never `process.env.PORT ?? 3000`.
- `JwtModule.registerAsync` and `JwtStrategy` receive the secret through
  `ConfigService`; the previous hardcoded fallback was removed.
- `jest.e2e.config.js` and `test/global-setup.mjs` load `.env` and map the
  `TEST_*` keys to the variables the application validates.
- `scripts/evidence.ps1` parses `.env` and exports it to the API process.

---

## 5. Database

### Development

```bash
docker compose up -d
```

`docker-compose.yml` starts `postgres:16-alpine` on `${DB_PORT}` and takes
`DB_NAME`, `DB_USER` and `DB_PASSWORD` from `.env`. Start the API with
`npm run start:dev`.

### Tests and evidence

`npm run test:e2e` and `npm run evidence` boot a **disposable PostgreSQL**
cluster with the `embedded-postgres` package on `TEST_PG_PORT`, using the
credentials of the test section in `.env`. The cluster is created and destroyed
automatically, so no manual setup is required and the development data is never
touched.

### Schema and seed

- `DB_SYNCHRONIZE=true` creates the schema for this simulacro. Set it to
  `false` in a shared environment and use migrations instead.
- `src/database/seed.service.ts` is idempotent (it only inserts when the table
  is empty): 3 branches, 6 rooms, 2 receptionists and 4 users. The users are
  stored with a **bcrypt hash** of `SEED_USER_PASSWORD`, and after inserting the
  fixed ids the PostgreSQL sequences are advanced so later inserts do not
  collide.

---

## 6. Execution

```bash
npm run start:dev       # development with hot reload
npm run build           # compile to dist/
npm run start:prod      # node dist/main
```

- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`

---

## 7. Tests, evidence and diagrams

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests (Jest + ts-jest in ESM mode) |
| `npm run test:e2e` | End to end suite with Supertest against a disposable PostgreSQL |
| `npm run test:cov` | Unit tests with coverage |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | oxlint over `src/` and `test/` |
| `npm run build` | Production build |
| `npm run diagrams` | Regenerates `docs/diagrams/{der.mmd, mer.mmd, mer.dbml, schema.sql}` |
| `npm run diagrams:svg` | Renders `der.svg` and `mer.svg` with Mermaid CLI |
| `npm run evidence` | Runs the `curl` scenarios and writes `docs/evidencias/evidence.txt` |

Notes:

- The diagrams are generated from `scripts/generate-diagrams.mjs`, the single
  source of truth. Nothing inside `docs/diagrams` is edited by hand.
- The evidence script builds the project, boots a disposable PostgreSQL, starts
  the API, executes **69 curl scenarios** and compares each answer with the HTTP
  status required by the business rules. A difference is reported and makes the
  command fail.
- Jest needs `--experimental-vm-modules` (already wired in the npm scripts).

Current state of the repository:

| Check | Result |
| --- | --- |
| `npm run build` · `npm run typecheck` | 0 errors |
| `npm run lint` | 0 issues |
| `npm test` | 114 tests in 12 suites (all 7 services covered at 100% of statements) |
| `npm run test:e2e` | 63 tests against a disposable PostgreSQL |
| `npm run evidence` | 69/69 scenarios answered with the expected HTTP status |

---

## 8. Users of the seed (roles and identity)

The identity travels in the `x-user` header and is looked up in the `users`
table. **The role always comes from the database, never from the request.**

| `x-user` | Role | Linked receptionist | Initial password |
| --- | --- | --- | --- |
| `admin-1` | `admin` | — | `SEED_USER_PASSWORD` |
| `coordinator-1` | `coordinator` | — | `SEED_USER_PASSWORD` |
| `receptionist-1` | `receptionist` | `receptionists.id = 1` | `SEED_USER_PASSWORD` |
| `receptionist-2` | `receptionist` | `receptionists.id = 2` | `SEED_USER_PASSWORD` |

JWT flow (optional, the rest of the API works with the two headers):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "x-api-key: <key from .env>" -H "Content-Type: application/json" \
  -d '{"username":"admin-1","password":"<SEED_USER_PASSWORD>"}'

curl http://localhost:3000/auth/profile \
  -H "x-api-key: <key from .env>" -H "Authorization: Bearer <access_token>"
```

---

## 9. Endpoints

Guards run in this order on every request: `ApiKeyGuard` → `UserGuard` →
`RolesGuard`. The response is wrapped by `ResponseInterceptor`
(`{ success, data }`) and every error is normalised by `HttpExceptionFilter`
(RN-06).

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | public + API key | Exchanges credentials for a JWT |
| `GET` | `/auth/profile` | public + API key + JWT | Identity contained in the token |
| `GET` | `/hotels` | admin, coordinator, receptionist | Branches (read-only master data) |
| `GET` | `/rooms` | admin, coordinator, receptionist | Rooms with their branch |
| `GET` | `/receptionists` | admin, coordinator, receptionist | Receptionists referenced by the reservations |
| `POST` | `/reservations` | admin, coordinator, receptionist | Registers a reservation (RN-01), always `PENDING` |
| `GET` | `/reservations` | admin, coordinator, receptionist | Visible reservations + `?status=` (RN-02) |
| `GET` | `/reservations/summary` | admin, coordinator | Count per status for the chain |
| `GET` | `/reservations/:id` | admin, coordinator, receptionist | Detail respecting the ownership (RN-05) |
| `PATCH` | `/reservations/:id/status` | admin, coordinator, receptionist | Status transition (RN-03) |
| `GET` | `/users` | admin | Users without the password hash |
| `POST` | `/users` | admin | Creates a user (bcrypt hash) |
| `GET` | `/users/:id` | admin | User detail |
| `PATCH` | `/users/:id` | admin | Updates name, role, link or password (`username` is immutable) |
| `DELETE` | `/users/:id` | admin | Deletes a user |

Pipes used:

- Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) for
  every DTO — protected fields such as `id` or `status` are rejected with 400.
- Custom `ParsePositiveIdPipe` (`src/common/pipes/positive-id.pipe.ts`) for the
  `:id` path parameters.
- Class-level custom validator `StayDatesValidator` (check-out after check-in,
  check-in not in the past) registered on the DTO through `@Validate`.

---

## 10. Business rules and where they live

| Rule | Requirement | Implementation |
| --- | --- | --- |
| RN-01 | Register a reservation: valid room, valid receptionist, stay dates | `reservations.service.ts → create()`, `dto/create-reservation.dto.ts`, `rules/stay-rules.ts` |
| RN-02 | A receptionist only lists their own reservations; the `status` filter combines with that restriction | `reservations.service.ts → findAll()` (the role condition is part of the query) |
| RN-03 | Status lifecycle: no jumps, no changes in final states, only admin/coordinator cancel | `reservations.service.ts → updateStatus()` + `rules/status-rules.ts` (`VALID_TRANSITIONS`, `canCancel`) |
| RN-04 | API key + valid user + role verification | `common/guards/api-key.guard.ts`, `common/guards/user.guard.ts`, `common/guards/roles.guard.ts`, `common/enums/role.enum.ts`, the seed |
| RN-05 | Knowing the id is not enough: the receptionist only reads their own reservation | `reservations.service.ts → findOne() + assertOwnership()` |
| RN-06 | Every answer uses the same format | `common/interceptors/response.interceptor.ts` + `common/filters/http-exception.filter.ts` |

State machine (RN-03):

```
PENDING ──> CONFIRMED ──> IN_PROGRESS ──> FINISHED
   │            │              │
   └────────────┴──────────────┴────────> CANCELLED
```

`FINISHED` and `CANCELLED` are final. A jump such as `PENDING → IN_PROGRESS`
answers **409 Conflict**.

---

## 11. SOLID principles in this codebase

| Principle | Where it is applied |
| --- | --- |
| **S — Single responsibility** | One class per reason to change: `ApiKeyGuard` (key), `UserGuard` (identity), `RolesGuard` (permissions), `ResponseInterceptor` (success envelope), `HttpExceptionFilter` (error envelope), `SeedService` (master data), each controller only transports HTTP, each service only its use case, and the rules are pure functions in `reservations/rules/`. |
| **O — Open/closed** | The status lifecycle is a table (`VALID_TRANSITIONS`) and the roles of an endpoint are declared with `@Roles(...)`: adding a status or a role does not modify the guards. `@Public()` opens an endpoint to anonymous access without touching `UserGuard`. The validation rules are decorators on the DTOs, not `if` chains inside the service. |
| **L — Liskov substitution** | Every guard implements `CanActivate` and can replace another in the `APP_GUARD` chain; every pipe implements `PipeTransform`; `UsersService` honours the `UserDirectory` contract, so the guard behaves the same with any implementation (an in-memory double in the unit tests, PostgreSQL in production). |
| **I — Interface segregation** | Consumers depend on narrow contracts: `UserDirectory` exposes only `findByUsername` and `findReceptionistByReceptionistId`; `PublicUser = Omit<User, 'passwordHash'>` hides the hash from every caller; each operation has its own DTO (`CreateUserDto`, `UpdateUserDto`, `FilterReservationsDto`, `LoginDto`, `UserResponseDto`). |
| **D — Dependency inversion** | `ReservationsService` and `UserGuard` receive the `USER_DIRECTORY` token (abstraction) instead of the concrete class — `UsersModule` binds it with `useExisting`. The configuration is injected through `ConfigService`, so no module reads `process.env` directly, and the persistence is consumed through TypeORM `Repository<T>` interfaces. |

---

## 12. Why these HTTP status codes

| Code | Justification |
| --- | --- |
| `200 OK` | Successful read or update of an existing resource. |
| `201 Created` | A reservation or a user was created; the body contains the new resource. |
| `400 Bad Request` | The data does not satisfy the contract: DTO errors (pipes), unknown `roomId`/`receptionistId`, dates out of range, `receptionistId` missing for admin/coordinator, id that is not a positive number. The client can fix the request. |
| `401 Unauthorized` | The caller could **not be identified**: missing/invalid API key, missing/unknown `x-user`, wrong credentials or an invalid/expired token. (RN-04) |
| `403 Forbidden` | The caller **was identified** but the role or the ownership does not allow the action: a receptionist reading another receptionist's reservation, a receptionist cancelling, a coordinator on `/reservations/summary`, a non-admin on `/users`. |
| `404 Not Found` | The resource does not exist (`/reservations/99999`, `/users/99999`). |
| `409 Conflict` | The request contradicts the current state of the resource: an invalid status transition in the lifecycle (RN-03). |
| `500 Internal Server Error` | Anything unexpected, captured and normalised by `HttpExceptionFilter` (RN-06). |

---

## 13. Model: from the original ER diagram to this project

| Original assignment (Spanish) | English in this project | Notes |
| --- | --- | --- |
| `hoteles_sedes` | `hotels` | Branches of the chain |
| `habitaciones` | `rooms` | `hotel_id` → `hotels.id` |
| `recepcionistas` | `receptionists` | Master data referenced by the reservations |
| `reservas` | `reservations` | `receptionist_id` → `receptionists.id`, `room_id` → `rooms.id` |
| `usuarios` (in memory in the assignment) | `users` (persisted) | The identity and the roles are validated against PostgreSQL, so the table exists in the real schema and in the generated diagrams |
| `tipo_habitacion` (`sencillo`, `doble`, `suite`) | `room_type` (`SINGLE`, `DOUBLE`, `SUITE`) | Enum |
| `estado_habitacion` (`disponible`, `ocupada`, `mantenimiento`) | `status` (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`) | Enum |
| `estado_reserva` (`pendiente`, `confirmada`, `en_curso`, `finalizada`, `cancelada`) | `status` (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`) | Enum |
| `rol` (`administrador`, `coordinador`, `recepcionista`) | `role` (`admin`, `coordinator`, `receptionist`) | Enum, stored in `users.role` |

All the code, messages, documentation and comments of the project are in
English.

---

## 14. Project structure

```
├── docker-compose.yml          PostgreSQL for development
├── .env.example                Template of every environment variable
├── jest.config.js              Unit tests (ESM)
├── jest.e2e.config.js          E2E tests: loads .env and points to the test database
├── scripts/
│   ├── generate-diagrams.mjs   DER / MER / DBML / SQL from one model
│   ├── render-diagrams.mjs     SVG rendering (browser from MERMAID_BROWSER_PATH)
│   ├── evidence-db.mjs         Disposable PostgreSQL for the evidence
│   └── evidence.ps1            curl scenarios → docs/evidencias/evidence.txt
├── src/
│   ├── common/                 Guards, decorators, pipes, interceptor, filter, shared DTOs
│   ├── config/                 Env validation, env mapping, Swagger
│   ├── database/               Seed of the master data
│   └── modules/
│       ├── auth/               login, JWT strategy, profile
│       ├── users/              CRUD (admin) + UserDirectory contract
│       ├── hotels/ rooms/ receptionists/   read-only master data
│       └── reservations/       RN-01 … RN-06 with pure rules
├── test/                       E2E suite + embedded PostgreSQL lifecycle
└── docs/
    ├── diagrams/               Generated DER/MER (mmd, svg, dbml, schema.sql)
    └── evidencias/evidence.txt Generated curl evidence
```

---

## 15. Commands cheat sheet

```bash
npm install
Copy-Item .env.example .env
docker compose up -d            # development database
npm run start:dev               # http://localhost:3000/api/docs

npm run typecheck && npm run lint
npm test                        # unit
npm run test:e2e                # end to end with its own PostgreSQL
npm run diagrams && npm run diagrams:svg
npm run evidence                # curl evidence with 69 scenarios
```
