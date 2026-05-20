import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const settingsRoutes = Router();

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  timezone: z.string().min(2).default("UTC"),
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).default("YYYY-MM-DD"),
  compactMode: z.boolean().default(false)
});

const profileSchema = z.object({
  fullName: z.string().min(2),
  mfaEnabled: z.boolean().optional().default(false)
});

settingsRoutes.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: { select: { name: true } },
        mfaEnabled: true,
        preferencesJson: true
      }
    });

    const preferences = preferencesSchema.safeParse(user.preferencesJson ?? {}).success
      ? preferencesSchema.parse(user.preferencesJson ?? {})
      : preferencesSchema.parse({});

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      mfaEnabled: user.mfaEnabled,
      preferences
    });
  } catch (error) {
    next(error);
  }
});

settingsRoutes.put("/me/profile", authenticate, async (req, res, next) => {
  try {
    const payload = profileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        fullName: payload.fullName,
        mfaEnabled: payload.mfaEnabled
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        mfaEnabled: true
      }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

settingsRoutes.put("/me/preferences", authenticate, async (req, res, next) => {
  try {
    const payload = preferencesSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        preferencesJson: payload as Prisma.InputJsonValue
      },
      select: {
        id: true,
        preferencesJson: true
      }
    });

    res.json({
      id: user.id,
      preferences: preferencesSchema.parse(user.preferencesJson ?? {})
    });
  } catch (error) {
    next(error);
  }
});
