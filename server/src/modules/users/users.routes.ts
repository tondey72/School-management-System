import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const usersRoutes = Router();

const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "ACCOUNTANT",
  "LIBRARIAN",
  "HR_OFFICER",
  "REGISTRAR",
  "HOSTEL_WARDEN",
  "TRANSPORT_MANAGER"
] as const;

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(SYSTEM_ROLES),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional().default(true)
});

const bulkImportSchema = z.object({
  users: z.array(createUserSchema).min(1).max(500)
});

usersRoutes.get("/roles", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), (_req, res) => {
  res.json(SYSTEM_ROLES);
});

usersRoutes.get("/", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId: req.auth!.schoolId },
      include: {
        role: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    res.json(
      users.map((item) => ({
        id: item.id,
        email: item.email,
        fullName: item.fullName,
        role: item.role.name,
        isActive: item.isActive,
        createdAt: item.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
});

usersRoutes.post("/", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);
    const role = await prisma.role.findUnique({ where: { name: payload.role } });

    if (!role) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password ?? "ChangeMe123!", 12);
    const user = await prisma.user.create({
      data: {
        schoolId: req.auth!.schoolId,
        roleId: role.id,
        email: payload.email.toLowerCase(),
        fullName: payload.fullName,
        passwordHash,
        isActive: payload.isActive
      },
      include: {
        role: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      isActive: user.isActive,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
});

usersRoutes.post("/bulk-import", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const payload = bulkImportSchema.parse(req.body);
    const roleRecords = await prisma.role.findMany();
    const roleIdByName = new Map(roleRecords.map((role) => [role.name, role.id]));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of payload.users) {
      const roleId = roleIdByName.get(item.role);
      if (!roleId) {
        skipped += 1;
        errors.push(`${item.email}: role ${item.role} does not exist`);
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email: item.email.toLowerCase() } });
      if (existing) {
        skipped += 1;
        errors.push(`${item.email}: already exists`);
        continue;
      }

      const passwordHash = await bcrypt.hash(item.password ?? "ChangeMe123!", 12);
      await prisma.user.create({
        data: {
          schoolId: req.auth!.schoolId,
          roleId,
          email: item.email.toLowerCase(),
          fullName: item.fullName,
          passwordHash,
          isActive: item.isActive
        }
      });
      created += 1;
    }

    res.status(201).json({ created, skipped, errors });
  } catch (error) {
    next(error);
  }
});

usersRoutes.get("/export", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId: req.auth!.schoolId },
      include: {
        role: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5000
    });

    const header = "email,fullName,role,isActive,createdAt";
    const rows = users.map((item) => {
      const safeName = `"${item.fullName.replace(/"/g, '""')}"`;
      return [item.email, safeName, item.role.name, item.isActive ? "true" : "false", item.createdAt.toISOString()].join(",");
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=users-${req.auth!.schoolId}.csv`);
    res.send([header, ...rows].join("\n"));
  } catch (error) {
    next(error);
  }
});
