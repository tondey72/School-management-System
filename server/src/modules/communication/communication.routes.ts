import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const communicationRoutes = Router();

const announcementSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(2),
  audience: z.string().default("ALL")
});

communicationRoutes.get("/announcements", authenticate, async (req, res, next) => {
  try {
    const announcements = await prisma.notification.findMany({
      where: { schoolId: req.auth!.schoolId, channel: "ANNOUNCEMENT" },
      orderBy: { sentAt: "desc" },
      take: 50
    });
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

communicationRoutes.post("/announcements", authenticate, async (req, res, next) => {
  try {
    const payload = announcementSchema.parse(req.body);
    const announcement = await prisma.notification.create({
      data: {
        schoolId: req.auth!.schoolId,
        senderId: req.auth!.userId,
        title: payload.title,
        message: payload.message,
        channel: "ANNOUNCEMENT",
        audience: payload.audience
      }
    });
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
});

communicationRoutes.get("/overview", authenticate, async (req, res, next) => {
  try {
    const announcementCount = await prisma.notification.count({
      where: { schoolId: req.auth!.schoolId, channel: "ANNOUNCEMENT" }
    });

    res.json({
      announcements: announcementCount,
      parentMessaging: true,
      emergencyAlerting: true,
      smsAdapters: ["twilio", "africastalking", "custom"]
    });
  } catch (error) {
    next(error);
  }
});
