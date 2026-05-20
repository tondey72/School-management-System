import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const workflowsRoutes = Router();

const instanceSchema = z.object({
  workflowKey: z.string().min(2),
  title: z.string().min(2),
  currentStep: z.string().default("submitted")
});

workflowsRoutes.get("/templates", authenticate, (_req, res) => {
  res.json([
    "admission-approval",
    "leave-approval",
    "procurement-approval",
    "fee-adjustment-approval",
    "staff-onboarding",
    "exam-publishing"
  ]);
});

workflowsRoutes.get("/instances", authenticate, async (req, res, next) => {
  try {
    const instances = await prisma.workflowInstance.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    res.json(instances);
  } catch (error) {
    next(error);
  }
});

workflowsRoutes.post("/instances", authenticate, async (req, res, next) => {
  try {
    const payload = instanceSchema.parse(req.body);
    const instance = await prisma.workflowInstance.create({
      data: {
        schoolId: req.auth!.schoolId,
        workflowKey: payload.workflowKey,
        title: payload.title,
        currentStep: payload.currentStep,
        historyJson: [{ action: "created", by: req.auth!.email, at: new Date().toISOString() }]
      }
    });
    res.status(201).json(instance);
  } catch (error) {
    next(error);
  }
});
