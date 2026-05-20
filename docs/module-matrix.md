# Module Coverage Matrix

## Core Domains

- Executive Dashboard: KPI and analytics endpoint, chart-ready UI
- Authentication and User Management: JWT login, RBAC middleware, refresh-token model field
- Student Information System: student lifecycle entities and endpoints
- Academic Management: module route and schema primitives
- Attendance Management: attendance records with analytics endpoint
- Examinations: exam and results models with scheduling API
- Finance and Billing: invoice/payment/payroll models and summary API
- HR Management: staff and HR workflow overview endpoint
- Parent and Student Portal: secure summary endpoint
- Communication: notifications and channel readiness endpoint
- Library: catalog model and route
- Hostel: room/allocation model and occupancy route
- Transport: bus/assignment model and status route
- Inventory and Asset Management: asset model and endpoint
- Workflow Automation: workflow instance model and templates endpoint
- API and Integration Layer: connector catalogue endpoint, webhook-ready design
- Reporting and Analytics: export format endpoint and queue-ready reporting channel
- AI Features: optional capability endpoint for prediction, risk, and assistants

## Non-Functional Capabilities

- Multi-school architecture using `schoolId` scoping
- Swagger documentation at `/api/docs`
- Redis-backed queue plumbing via BullMQ
- Socket.IO real-time channel support
- Docker Compose local stack
- Seeded demo tenant and admin user
- CI template and lint/test/build scripts
