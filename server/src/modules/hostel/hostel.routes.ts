import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const hostelRoutes = Router();

const roomSchema = z.object({
  roomNumber: z.string().min(1),
  capacity: z.number().int().positive()
});

hostelRoutes.get("/rooms", authenticate, async (req, res, next) => {
  try {
    const rooms = await prisma.hostelRoom.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { roomNumber: "asc" }
    });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

hostelRoutes.post("/rooms", authenticate, async (req, res, next) => {
  try {
    const payload = roomSchema.parse(req.body);
    const room = await prisma.hostelRoom.create({
      data: {
        schoolId: req.auth!.schoolId,
        roomNumber: payload.roomNumber,
        capacity: payload.capacity
      }
    });
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
});

hostelRoutes.get("/occupancy", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const stats = await prisma.hostelRoom.aggregate({
      where: { schoolId },
      _sum: { capacity: true, occupied: true }
    });
    const capacity = stats._sum.capacity ?? 0;
    const occupied = stats._sum.occupied ?? 0;
    const occupancyRate = capacity > 0 ? Number(((occupied / capacity) * 100).toFixed(2)) : 0;

    res.json({
      occupancyRate,
      visitorsToday: 0,
      maintenanceRequests: 0,
      occupied,
      capacity
    });
  } catch (error) {
    next(error);
  }
});
