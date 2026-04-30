# Lead Management System Frontend

Production-grade LMS frontend scaffold built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, React Query, React Hook Form, and Zod.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Zustand (auth + UI state)
- TanStack Query (server state)
- React Hook Form + Zod (form validation)

## FRONTEND HLD
                ┌──────────────────────────┐
                │        End Users         │
                │ (Admin / Assistant User)│
                └──────────┬──────────────┘
                           │ Browser
                           ▼
                ┌──────────────────────────┐
                │      Next.js App         │
                │   (React + App Router)  │
                └──────────┬──────────────┘
                           │ HTTPS / REST API
                           ▼
                ┌──────────────────────────┐
                │        Backend API       │
                │   (FastAPI / Node.js)   │
                └──────────────────────────┘

## FRONTEND LLD

                   ┌──────────────────────────────┐
                   │         Next.js App          │
                   │     (App Router + TS)        │
                   └─────────────┬────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼

┌───────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│    UI Layer       │   │   State Layer      │   │    API Layer       │
│ (Components)      │   │ (Zustand / Query)  │   │ (Services)         │
└─────────┬─────────┘   └─────────┬──────────┘   └─────────┬──────────┘
          │                       │                        │
          ▼                       ▼                        ▼

┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Reusable Components  │   │ Global State         │   │ API Services         │
│ - Sidebar            │   │ - authStore          │   │ - auth.service       │
│ - Header             │   │ - leadStore          │   │ - lead.service       │
│ - Cards              │   │ - uiStore            │   │ - activity.service   │
│ - Tables             │   └──────────────────────┘   └──────────────────────┘
│ - Forms              │
└──────────────────────┘

        ┌────────────────────────────────────────────────────────┐
        ▼                                                        ▼

┌──────────────────────────────┐                  ┌──────────────────────────────┐
│       Feature Modules        │                  │        Utility Layer         │
│                              │                  │                              │
│ - Auth (Login)               │                  │ - helpers                   │
│ - Dashboard (Admin/Assistant)│                  │ - constants                 │
│ - Leads Module               │                  │ - validators (Zod)          │
│ - Activity (Notes Timeline)  │                  │ - formatters                │
│ - Upload (Excel UI)          │                  └──────────────────────────────┘
│ - Filters & Search           │
└──────────────────────────────┘

## Features (Phase 1)

- JWT-style frontend auth flow
- Login form with schema validation
- Role-based dashboards:
  - Admin dashboard
  - Assistant dashboard
- Role-based route protection using middleware
- Light/Dark theme toggle
- Reusable dashboard/UI components

## Project Structure

```text
src/
  app/
    (auth)/login
    (dashboard)/admin
    (dashboard)/assistant
  components/
    auth/
    dashboard/
    layout/
    ui/
  hooks/
  lib/
    validators/
  services/
  store/
  types/
  utils/
middleware.ts
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

If port `3000` is busy, Next.js automatically runs on the next available port (for example `3001`).

### 3) Type check

```bash
npm run typecheck
```

## Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Create production build
- `npm run start` - Run production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

## Auth (Mock Credentials)

Current auth service supports mock users:

- Admin:
  - Email: `admin@lms.com`
  - Password: `admin123`
- Assistant:
  - Email: `assistant@lms.com`
  - Password: `assistant123`

Defined in: `src/services/auth-service.ts`

## Route Access Control

Middleware enforces:

- `/admin/*` -> admin only
- `/assistant/*` -> assistant only
- `/sales/*` -> redirected to `/assistant`
- unauthenticated users -> redirected to `/login`

Defined in: `middleware.ts`

## Environment Notes

Optional env vars:

- `NEXT_PUBLIC_API_URL` - backend base URL (if set, service calls use real API endpoints)
- `NEXT_PUBLIC_USE_MOCK_AUTH` - defaults to mock auth unless explicitly set to `false`

## Next Steps

- Connect `services/` to real backend APIs
- Add lead listing, lead detail, and assignment modules
- Add activity timeline and Excel upload flows
- Add unit/integration tests (Vitest/RTL or Playwright)
