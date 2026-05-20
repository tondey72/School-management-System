import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const attendanceRoutes = Router();

const attendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  method: z.string().default("MANUAL")
});

const recordsQuerySchema = z.object({
  studentId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

attendanceRoutes.get("/records", authenticate, async (req, res, next) => {
  try {
    const query = recordsQuerySchema.parse(req.query);
    const where = {
      schoolId: req.auth!.schoolId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {})
            }
          }
        : {})
    };

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100
    });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

attendanceRoutes.post("/records", authenticate, async (req, res, next) => {
  try {
    const payload = attendanceSchema.parse(req.body);
    const record = await prisma.attendanceRecord.upsert({
      where: {
        studentId_date: {
          studentId: payload.studentId,
          date: new Date(payload.date)
        }
      },
      update: {
        status: payload.status,
        method: payload.method
      },
      create: {
        schoolId: req.auth!.schoolId,
        studentId: payload.studentId,
        date: new Date(payload.date),
        status: payload.status,
        method: payload.method
      }
    });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

attendanceRoutes.get("/analytics", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [present, absent, late, excused] = await Promise.all([
      prisma.attendanceRecord.count({ where: { schoolId, status: "PRESENT" } }),
      prisma.attendanceRecord.count({ where: { schoolId, status: "ABSENT" } }),
      prisma.attendanceRecord.count({ where: { schoolId, status: "LATE" } }),
      prisma.attendanceRecord.count({ where: { schoolId, status: "EXCUSED" } })
    ]);

    const total = present + absent + late + excused;
    const attendanceRate = total > 0 ? Number((((present + late + excused) / total) * 100).toFixed(2)) : 0;

    res.json({
      qrReady: true,
      rfidReady: true,
      absenteeNotifications: "enabled",
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate
    });
  } catch (error) {
    next(error);
  }
});

attendanceRoutes.get("/export/csv", authenticate, async (req, res, next) => {
  try {
    const query = recordsQuerySchema.parse(req.query);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {})
              }
            }
          : {})
      },
      orderBy: { date: "desc" }
    });

    const csvRows = ["id,studentId,date,status,method"];
    for (const record of records) {
      csvRows.push([record.id, record.studentId, record.date.toISOString(), record.status, record.method].join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance-export.csv");
    res.send(csvRows.join("\n"));
  } catch (error) {
    next(error);
  }
});
