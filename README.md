# School Management System

Enterprise-grade, modular School Management System monorepo for primary schools, secondary schools, colleges, universities, and training institutions.

## Technology Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, ShadCN-ready setup, React Router, Axios, Chart.js, Framer Motion, Socket.IO client
- Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, JWT auth, RBAC, Swagger/OpenAPI, BullMQ
- Infrastructure: Docker, Docker Compose, CI-ready workflow template

## Monorepo Structure

```
client/
server/
docker/
docs/
scripts/
prisma/
shared/
```

Backend source structure:

```
server/src/
├── modules/
├── middleware/
├── services/
├── controllers/
├── routes/
├── utils/
├── config/
├── jobs/
├── sockets/
├── prisma/
└── tests/
```

## Implemented Enterprise Foundation

- Multi-school data model using `schoolId` tenancy boundaries
- Executive dashboard API and modern dashboard UI shell
- JWT authentication, refresh-token rotation, `/auth/me`, logout, and SSO-provider discovery endpoint
- Modular APIs for SIS, academics, attendance, exams, LMS, finance, HR, communications, workflows, reports, library, hostel, transport, inventory, integrations, portal, and optional AI features
- Socket.IO real-time channel setup
- Dependency-aware startup with Postgres and Redis readiness wait
- Redis queue setup for notifications and reporting
- Swagger docs at `http://localhost:4000/api/docs`
- Prisma schema covering users, roles, students, guardians, staff, classes, subjects, exams, results, attendance, fees/payments, payroll, timetables, notifications, workflow, library, hostel, transport, and assets
- Seed script for demo school data and default super admin

## Quick Start (Windows and Linux)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start everything with Docker Compose:

```bash
docker compose up --build -d
```

3. Open applications:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Swagger docs: `http://localhost:4000/api/docs`
- MailHog (email testing): `http://localhost:8025`

## Default Demo Credentials

- Email: `admin@demo-school.local`
- Password: `ChangeMe123!`

Credentials are configurable in `.env`:

- `DEFAULT_SUPER_ADMIN_EMAIL`
- `DEFAULT_SUPER_ADMIN_PASSWORD`

## Development Commands

```bash
npm ci
npm run dev
npm run build
npm run lint
npm run test
```

Useful scripts:

- `npm run docker:up`
- `npm run docker:down`
- `npm run seed`

Health and readiness endpoints:

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

Auth endpoints:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/sso/providers`

## Security Baseline

- Helmet hardening
- Rate limiting
- Input validation with Zod
- JWT access and refresh token flow
- RBAC middleware

## Documentation

- Architecture: `docs/architecture.md`
- Module matrix: `docs/module-matrix.md`

## Notes for Production Rollout

This project is structured for production hardening with clear extension points. Recommended next steps before internet exposure:

1. Add full unit/integration/e2e coverage for every domain module.
2. Add secret management and externalized key vault integration.
3. Add worker containers for BullMQ jobs.
4. Add observability stack (OpenTelemetry + metrics backend).
5. Add backup/restore automation and encrypted object storage for files.