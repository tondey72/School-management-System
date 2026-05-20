import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const lmsRoutes = Router();

lmsRoutes.get("/overview", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [subjects, classes, exams] = await Promise.all([
      prisma.subject.count({ where: { schoolId } }),
      prisma.classRoom.count({ where: { schoolId } }),
      prisma.exam.count({ where: { schoolId } })
    ]);

    res.json({
      courseMaterials: true,
      quizzes: true,
      discussions: true,
      videoLessons: true,
      virtualClassroomIntegration: "ready",
      subjects,
      classes,
      quizzesConfigured: exams
    });
  } catch (error) {
    next(error);
  }
});
