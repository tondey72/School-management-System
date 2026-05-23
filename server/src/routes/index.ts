import { Router } from "express";
import { z } from "zod";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes.js";
import { studentsRoutes } from "../modules/students/students.routes.js";
import { academicsRoutes } from "../modules/academics/academics.routes.js";
import { attendanceRoutes } from "../modules/attendance/attendance.routes.js";
import { examsRoutes } from "../modules/exams/exams.routes.js";
import { workflowsRoutes } from "../modules/workflows/workflows.routes.js";
import { notificationsRoutes } from "../modules/notifications/notifications.routes.js";
import { lmsRoutes } from "../modules/lms/lms.routes.js";
import { hrRoutes } from "../modules/hr/hr.routes.js";
import { libraryRoutes } from "../modules/library/library.routes.js";
import { hostelRoutes } from "../modules/hostel/hostel.routes.js";
import { transportRoutes } from "../modules/transport/transport.routes.js";
import { inventoryRoutes } from "../modules/inventory/inventory.routes.js";
import { communicationRoutes } from "../modules/communication/communication.routes.js";
import { integrationsRoutes } from "../modules/integrations/integrations.routes.js";
import { portalRoutes } from "../modules/portal/portal.routes.js";
import { organizationRoutes } from "../modules/organization/organization.routes.js";
import { aiRoutes } from "../modules/ai/ai.routes.js";
import { usersRoutes } from "../modules/users/users.routes.js";
import { settingsRoutes } from "../modules/settings/settings.routes.js";
import { classroomsRoutes } from "../modules/classrooms/classrooms.routes.js";
import receiptingRoutes from "../modules/finance/receipting/receipting.routes.js";
import invoicingRoutes from "../modules/finance/invoicing/invoicing.routes.js";
import duePaymentRoutes from "../modules/finance/due-payment/duePayment.routes.js";
import remindersRoutes from "../modules/finance/reminders/reminders.routes.js";

// Finance routes
import { billingRoutes } from "../modules/billing/billing.routes.js";
import { paymentRoutes } from "../modules/payments/payments.routes.js";
import { accountingRoutes } from "../modules/accounting/accounting.routes.js";
import { bankReconciliationRoutes } from "../modules/bank/bank.routes.js";
import { reportingRoutes } from "../modules/reporting/reporting.routes.js";
import { prisma } from "../prisma/client.js";
import { redis } from "../config/redis.js";

export const apiRoutes = Router();

const createCommentSchema = z.object({
  comment: z.string().trim().min(1).max(1000)
});

apiRoutes.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRoutes.get("/health/live", (_req, res) => {
  res.json({ status: "live", timestamp: new Date().toISOString() });
});

apiRoutes.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (redis) {
      const redisStatus = await redis.ping();

      if (redisStatus !== "PONG") {
        throw new Error("Redis not ready");
      }
    }

    res.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      message: error instanceof Error ? error.message : "Dependency check failed",
      timestamp: new Date().toISOString()
    });
  }
});

apiRoutes.get("/comments", async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ comment: string }>>`SELECT comment FROM comments ORDER BY ctid DESC LIMIT 100`;
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

apiRoutes.post("/comments", async (req, res, next) => {
  try {
    const payload = createCommentSchema.parse(req.body);
    await prisma.$executeRaw`INSERT INTO comments (comment) VALUES (${payload.comment})`;
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/dashboard", dashboardRoutes);
apiRoutes.use("/students", studentsRoutes);
apiRoutes.use("/academics", academicsRoutes);
apiRoutes.use("/attendance", attendanceRoutes);
apiRoutes.use("/exams", examsRoutes);
apiRoutes.use("/workflows", workflowsRoutes);
apiRoutes.use("/notifications", notificationsRoutes);
apiRoutes.use("/lms", lmsRoutes);
apiRoutes.use("/hr", hrRoutes);
apiRoutes.use("/library", libraryRoutes);
apiRoutes.use("/hostel", hostelRoutes);
apiRoutes.use("/transport", transportRoutes);
apiRoutes.use("/inventory", inventoryRoutes);
apiRoutes.use("/communication", communicationRoutes);
apiRoutes.use("/integrations", integrationsRoutes);
apiRoutes.use("/portal", portalRoutes);
apiRoutes.use("/organization", organizationRoutes);
apiRoutes.use("/ai", aiRoutes);
apiRoutes.use("/users", usersRoutes);
apiRoutes.use("/settings", settingsRoutes);
apiRoutes.use("/classrooms", classroomsRoutes);

// Finance routes - all registered under /finance
apiRoutes.use("/finance/billing", billingRoutes);
apiRoutes.use("/finance/invoicing", invoicingRoutes);
apiRoutes.use("/finance/payments", paymentRoutes);
apiRoutes.use("/finance/accounting", accountingRoutes);
apiRoutes.use("/finance/bank", bankReconciliationRoutes);
apiRoutes.use("/finance/reports", reportingRoutes);
apiRoutes.use("/finance/receipting", receiptingRoutes);
apiRoutes.use("/finance/invoicing", invoicingRoutes);
apiRoutes.use("/finance/due-payment", duePaymentRoutes);
apiRoutes.use("/finance/reminders", remindersRoutes);
