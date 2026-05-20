import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const examsRoutes = Router();

const examSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(2),
  examDate: z.string().datetime(),
  totalMarks: z.number().int().positive(),
  term: z.string().min(1)
});

const resultSchema = z.object({
  examId: z.string().min(1),
  studentId: z.string().min(1),
  marks: z.number().nonnegative(),
  grade: z.string().min(1),
  gpaPoints: z.number().nonnegative()
});

examsRoutes.post("/schedule", authenticate, async (req, res, next) => {
  try {
    const payload = examSchema.parse(req.body);
    const exam = await prisma.exam.create({
      data: {
        schoolId: req.auth!.schoolId,
        subjectId: payload.subjectId,
        title: payload.title,
        examDate: new Date(payload.examDate),
        totalMarks: payload.totalMarks,
        term: payload.term
      }
    });
    res.status(201).json(exam);
  } catch (error) {
    next(error);
  }
});

examsRoutes.post("/results", authenticate, async (req, res, next) => {
  try {
    const payload = resultSchema.parse(req.body);
    const result = await prisma.examResult.upsert({
      where: {
        examId_studentId: {
          examId: payload.examId,
          studentId: payload.studentId
        }
      },
      update: {
        marks: payload.marks,
        grade: payload.grade,
        gpaPoints: payload.gpaPoints
      },
      create: payload
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

examsRoutes.get("/schedule", authenticate, async (req, res, next) => {
  try {
    const upcomingExams = await prisma.exam.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        examDate: { gte: new Date() }
      },
      include: { subject: true },
      orderBy: { examDate: "asc" },
      take: 20
    });

    res.json({
      upcomingExams,
      gradingAutomation: "enabled",
      transcriptGeneration: "enabled"
    });
  } catch (error) {
    next(error);
  }
});

examsRoutes.get("/analytics", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [results, averageMarks] = await Promise.all([
      prisma.examResult.findMany({
        where: { student: { schoolId } },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNo: true }
          }
        }
      }),
      prisma.examResult.aggregate({
        where: { student: { schoolId } },
        _avg: { marks: true, gpaPoints: true }
      })
    ]);

    const gradeCounts: Record<string, number> = {};
    const totalsByStudent = new Map<string, { name: string; total: number; count: number }>();

    for (const result of results) {
      gradeCounts[result.grade] = (gradeCounts[result.grade] ?? 0) + 1;

      const key = result.student.id;
      const existing = totalsByStudent.get(key) ?? {
        name: `${result.student.admissionNo} - ${result.student.firstName} ${result.student.lastName}`,
        total: 0,
        count: 0
      };

      existing.total += result.marks;
      existing.count += 1;
      totalsByStudent.set(key, existing);
    }

    const topPerformers = Array.from(totalsByStudent.values())
      .map((item) => ({
        student: item.name,
        average: Number((item.total / item.count).toFixed(2))
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    res.json({
      totalResults: results.length,
      averageMarks: Number(averageMarks._avg.marks ?? 0),
      averageGpa: Number(averageMarks._avg.gpaPoints ?? 0),
      gradeDistribution: gradeCounts,
      topPerformers
    });
  } catch (error) {
    next(error);
  }
});
