import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const academicsRoutes = Router();

const subjectSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional()
});

const classSchema = z.object({
  name: z.string().min(2),
  gradeLevel: z.string().min(1),
  stream: z.string().optional()
});

academicsRoutes.get("/subjects", authenticate, async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { name: "asc" }
    });
    res.json(subjects);
  } catch (error) {
    next(error);
  }
});

academicsRoutes.post("/subjects", authenticate, async (req, res, next) => {
  try {
    const payload = subjectSchema.parse(req.body);
    const subject = await prisma.subject.create({
      data: {
        schoolId: req.auth!.schoolId,
        code: payload.code,
        name: payload.name,
        description: payload.description
      }
    });
    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
});

academicsRoutes.get("/classes", authenticate, async (req, res, next) => {
  try {
    const classes = await prisma.classRoom.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { name: "asc" }
    });
    res.json(classes);
  } catch (error) {
    next(error);
  }
});

academicsRoutes.post("/classes", authenticate, async (req, res, next) => {
  try {
    const payload = classSchema.parse(req.body);
    const classRoom = await prisma.classRoom.create({
      data: {
        schoolId: req.auth!.schoolId,
        name: payload.name,
        gradeLevel: payload.gradeLevel,
        stream: payload.stream
      }
    });
    res.status(201).json(classRoom);
  } catch (error) {
    next(error);
  }
});

academicsRoutes.get("/overview", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [subjects, classes, timetableEntries] = await Promise.all([
      prisma.subject.count({ where: { schoolId } }),
      prisma.classRoom.count({ where: { schoolId } }),
      prisma.timetableEntry.count({ where: { schoolId } })
    ]);

    res.json({
      modules: ["subjects", "curriculum", "timetables", "lesson-plans", "gpa-config"],
      status: "active",
      subjects,
      classes,
      timetableEntries
    });
  } catch (error) {
    next(error);
  }
});
