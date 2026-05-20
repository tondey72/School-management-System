# School Management System Architecture

## Overview

This monorepo is organized for a modular, multi-tenant school platform with clear service boundaries.

- `client`: React + Vite + TypeScript + Tailwind UI shell
- `server`: Express + Prisma + Redis + Socket.IO + Swagger API
- `shared`: Shared types and role constants
- `docker`: Runtime images for local deployment
- `scripts`: Operational automation scripts

## Patterns

- Service layer and module boundaries per domain
- Repository ownership through Prisma access in each module service
- RBAC + JWT claims in middleware
- Event-capable architecture using Socket.IO + BullMQ queues
- API-first model with OpenAPI docs at `/api/docs`

## Multi-School Model

All business entities are scoped by `schoolId` to support primary, secondary, tertiary, and training institutions.

## Security Baseline

- Helmet hardening
- CORS restriction to client origin
- Rate limiting
- Validation with Zod
- JWT access and refresh strategy

## Local Observability

- Structured logs with Pino
- Access logs with Morgan
- Queue hooks ready for background workers
