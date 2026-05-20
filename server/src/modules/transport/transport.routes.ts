import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const transportRoutes = Router();

const busSchema = z.object({
  plateNumber: z.string().min(2),
  routeName: z.string().min(2),
  capacity: z.number().int().positive(),
  gpsEnabled: z.boolean().default(false)
});

transportRoutes.get("/buses", authenticate, async (req, res, next) => {
  try {
    const buses = await prisma.transportBus.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { routeName: "asc" }
    });
    res.json(buses);
  } catch (error) {
    next(error);
  }
});

transportRoutes.post("/buses", authenticate, async (req, res, next) => {
  try {
    const payload = busSchema.parse(req.body);
    const bus = await prisma.transportBus.create({
      data: {
        schoolId: req.auth!.schoolId,
        ...payload
      }
    });
    res.status(201).json(bus);
  } catch (error) {
    next(error);
  }
});

transportRoutes.get("/status", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [activeRoutes, assignedStudents, gpsEnabled] = await Promise.all([
      prisma.transportBus.count({ where: { schoolId } }),
      prisma.studentTransport.count({ where: { bus: { schoolId } } }),
      prisma.transportBus.count({ where: { schoolId, gpsEnabled: true } })
    ]);

    res.json({
      gpsReady: true,
      activeRoutes,
      assignedStudents,
      gpsEnabledBuses: gpsEnabled
    });
  } catch (error) {
    next(error);
  }
});
