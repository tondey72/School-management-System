import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const reportsRoutes = Router();

reportsRoutes.get("/exports", authenticate, (_req, res) => {
  res.json({
    formats: ["pdf", "xlsx", "csv"],
    reportFamilies: ["student-performance", "attendance", "finance", "payroll", "enrollment", "exam-analysis"]
  });
});

reportsRoutes.get("/overview", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [students, attendance, collections, exams] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.attendanceRecord.count({ where: { schoolId } }),
      prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
      prisma.examResult.aggregate({ _avg: { marks: true } })
    ]);

    res.json({
      students,
      attendanceEntries: attendance,
      totalCollections: Number(collections._sum.amount ?? 0),
      averageExamMarks: Number(exams._avg.marks ?? 0)
    });
  } catch (error) {
    next(error);
  }
});
