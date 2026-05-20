import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const integrationsRoutes = Router();

const integrationSchema = z.object({
  provider: z.string().min(2),
  clientId: z.string().min(2),
  encryptedSecret: z.string().min(8),
  webhookUrl: z.string().url().optional(),
  active: z.boolean().default(true)
});

integrationsRoutes.get("/keys", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const keys = await prisma.integrationKey.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { provider: "asc" }
    });
    res.json(keys);
  } catch (error) {
    next(error);
  }
});

integrationsRoutes.post("/keys", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const payload = integrationSchema.parse(req.body);
    const key = await prisma.integrationKey.upsert({
      where: {
        schoolId_provider: {
          schoolId: req.auth!.schoolId,
          provider: payload.provider
        }
      },
      update: payload,
      create: {
        schoolId: req.auth!.schoolId,
        ...payload
      }
    });
    res.status(201).json(key);
  } catch (error) {
    next(error);
  }
});

integrationsRoutes.get("/connectors", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const configured = await prisma.integrationKey.count({
      where: { schoolId: req.auth!.schoolId, active: true }
    });

    res.json({
      connectors: [
        "microsoft-outlook",
        "microsoft-teams",
        "google-classroom",
        "zoom",
        "moodle",
        "azure-ad",
        "payment-gateways",
        "sms-providers",
        "smtp"
      ],
      configured,
      oauth2: true,
      webhooks: true,
      scheduledSyncJobs: true
    });
  } catch (error) {
    next(error);
  }
});
