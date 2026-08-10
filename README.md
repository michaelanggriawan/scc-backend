# SCC 2 — Backend API

Backend for the SCC venue booking app. Built with **NestJS + TypeORM + PostgreSQL + Zod + Swagger**, email via **Resend**.

It implements the exact business flow from the frontend wireframe (`../SCC 2/src/app/App.tsx`): customers submit an inquiry → admin negotiates and sets an agreed price → a tokenized payment link is issued → customer uploads proof of payment (via the link **or** their logged-in profile) → admin approves/rejects.

## Quick start

```bash
npm install
cp .env.example .env        # then edit values
# create a Postgres database named in DB_NAME
npm run seed                # creates admin user, sample rooms/add-ons/settings
npm run start:dev           # http://localhost:3000/api/v1
```

- **API base:** `http://localhost:3000/api/v1`
- **Swagger docs:** `http://localhost:3000/docs`
- **Uploaded files:** served at `/files/*`

### Email (Resend)
Leave `RESEND_API_KEY` empty during development — every email is **logged to the console** instead of sent, so the whole flow works without the key. Get a key at [resend.com](https://resend.com), set it in `.env` (and point `EMAIL_FROM` at a domain verified in Resend) to go live; no code changes needed.

### Seed admin
`npm run seed` creates an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults `admin@scc.example.com` / `admin12345`). Registration only ever creates **customers** — admins are seeded.

## Testing

```bash
npm run test:e2e
```

E2E tests run against an **in-memory sql.js** database (pure JS — no Postgres or native build needed) and cover: auth + role guards, room/add-on CRUD, the full inquiry→payment→confirm happy path, the payment-rejection auto-cancel after 3 attempts, ownership checks, and the dashboard. 27 tests, all green.

## Architecture

- **Auth:** JWT (Bearer). A global `JwtAuthGuard` protects everything except routes marked `@Public()`; a `RolesGuard` enforces `@Roles(Admin)`.
- **Validation:** Zod schemas (`nestjs-zod`) on every DTO, wired into Swagger.
- **Data:** entities in `src/entities`. Column types are DB-agnostic so tests run on sql.js while production uses Postgres.
- **State machine** (`InquiriesService`): `New Inquiry → Awaiting Payment → Payment Submitted → Confirmed`, with branches to `Payment Rejected` and `Cancelled`. Rules enforced server-side:
  - Terms editable only while `New Inquiry / Awaiting Payment / Payment Rejected`.
  - 3rd payment rejection auto-cancels (`MAX_PAYMENT_REJECTIONS`).
  - Past-due `Awaiting Payment` auto-cancels (hourly cron + checked on proof upload).
  - Payment links deactivate on confirm/cancel and expire at the due date.

## Endpoint reference

Base path `/api/v1`. 🌐 public · 👤 customer (JWT) · 🔑 admin (JWT + admin role).

### Auth & Users
| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | 🌐 |
| POST | `/auth/login` | 🌐 |
| GET | `/auth/me` | 👤🔑 |
| PATCH | `/auth/change-password` | 👤🔑 |
| POST | `/auth/forgot-password` | 🌐 |
| POST | `/auth/reset-password` | 🌐 |
| GET | `/users/me` | 👤🔑 |
| PATCH | `/users/me` | 👤 |

### Public content
| Method | Path | Access |
|---|---|---|
| GET | `/public/venue-info` | 🌐 |
| GET | `/public/rooms` · `/public/rooms/:id` | 🌐 |
| GET | `/public/addons` | 🌐 |
| GET | `/public/event-categories` | 🌐 |

### Inquiries
| Method | Path | Access |
|---|---|---|
| POST | `/public/inquiries` | 🌐 (guest submit) |
| POST | `/inquiries` | 👤 (linked submit) |
| GET | `/inquiries/mine` | 👤 |
| GET | `/inquiries/:ref` | 👤 |
| POST | `/inquiries/:ref/cancel` | 👤 |
| GET | `/admin/inquiries` (filter: status, search, dateFrom, dateTo, page, limit) | 🔑 |
| GET | `/admin/inquiries/:ref` | 🔑 |
| PATCH | `/admin/inquiries/:ref` (edit terms) | 🔑 |
| POST | `/admin/inquiries/:ref/awaiting-payment` (→ payment link) | 🔑 |
| POST | `/admin/inquiries/:ref/approve` | 🔑 |
| POST | `/admin/inquiries/:ref/reject` | 🔑 |
| POST | `/admin/inquiries/:ref/cancel` | 🔑 |

### Payments
| Method | Path | Access |
|---|---|---|
| GET | `/pay/:token` (pay page: amount + bank/QR) | 🌐 |
| POST | `/pay/:token/proof` (upload) | 🌐 |
| GET | `/inquiries/:ref/payment-info` | 👤 |
| POST | `/inquiries/:ref/proof` (upload) | 👤 |

### Rooms / Add-ons / Settings / Dashboard / Uploads (admin)
| Method | Path |
|---|---|
| GET/POST | `/admin/rooms`, GET/PATCH/DELETE `/admin/rooms/:id`, PATCH `/admin/rooms/:id/status` |
| GET/POST | `/admin/addons`, PATCH/DELETE `/admin/addons/:id`, PATCH `/admin/addons/:id/status` |
| GET/PUT | `/admin/settings/venue`, `/admin/settings/payment`, `/admin/settings/notifications` |
| GET | `/admin/dashboard/stats`, `/admin/dashboard/chart`, `/admin/dashboard/export` (CSV) |
| POST | `/admin/uploads/room-photo`, `/admin/uploads/qr` |

## Deploying to Postgres
Set `DB_TYPE=postgres` and the `DB_*` vars. Keep `DB_SYNCHRONIZE=true` only for early dev; switch to migrations before production.
