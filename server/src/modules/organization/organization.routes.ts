import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const organizationRoutes = Router();

const pngDataUrlRegex = /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/;

const updateOrganizationSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().optional().refine((value) => {
    if (!value || value === "") {
      return true;
    }

    const standardUrl = z.string().url().safeParse(value).success;
    const pngDataUrl = pngDataUrlRegex.test(value);
    return standardUrl || pngDataUrl;
  }, "Logo must be a valid URL or PNG data URL").or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal(""))
});

organizationRoutes.get("/profile", authenticate, async (req, res, next) => {
  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { id: req.auth!.schoolId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        contactEmail: true,
        schoolType: true,
        timezone: true,
        country: true,
        currency: true
      }
    });

    res.json(school);
  } catch (error) {
    next(error);
  }
});

organizationRoutes.put(
  "/profile",
  authenticate,
  authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]),
  async (req, res, next) => {
    try {
      const payload = updateOrganizationSchema.parse(req.body);

      const school = await prisma.school.update({
        where: { id: req.auth!.schoolId },
        data: {
          name: payload.name,
          logoUrl: payload.logoUrl || null,
          contactEmail: payload.contactEmail || null
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          contactEmail: true,
          schoolType: true,
          timezone: true,
          country: true,
          currency: true
        }
      });

      res.json(school);
    } catch (error) {
      next(error);
    }
  }
);
