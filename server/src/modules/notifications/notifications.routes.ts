import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const notificationsRoutes = Router();

const notificationSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(2),
  channel: z.string().default("IN_APP"),
  audience: z.string().default("ALL")
});

notificationsRoutes.get("/channels", authenticate, (_req, res) => {
  res.json({
    email: true,
    smsReady: true,
    pushReady: true,
    emergencyAlerts: true
  });
});

notificationsRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { sentAt: "desc" },
      take: 100
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

notificationsRoutes.post("/", authenticate, async (req, res, next) => {
  try {
    const payload = notificationSchema.parse(req.body);
    const notification = await prisma.notification.create({
      data: {
        schoolId: req.auth!.schoolId,
        senderId: req.auth!.userId,
        title: payload.title,
        message: payload.message,
        channel: payload.channel,
        audience: payload.audience
      }
    });
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});
