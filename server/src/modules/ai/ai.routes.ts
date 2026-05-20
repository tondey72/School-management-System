import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const aiRoutes = Router();

aiRoutes.get("/capabilities", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"]), (_req, res) => {
  res.json({
    studentPerformancePrediction: "optional",
    attendanceRiskAnalysis: "optional",
    smartTimetableGeneration: "optional",
    chatbotAssistant: "optional",
    behaviorTrendAnalysis: "optional",
    gradingSuggestions: "optional"
  });
});

aiRoutes.get("/risk-summary", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL"]), async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [totalAttendance, absentAttendance, avgMarks] = await Promise.all([
      prisma.attendanceRecord.count({ where: { schoolId } }),
      prisma.attendanceRecord.count({ where: { schoolId, status: "ABSENT" } }),
      prisma.examResult.aggregate({ _avg: { marks: true } })
    ]);

    const absenceRate = totalAttendance > 0 ? (absentAttendance / totalAttendance) * 100 : 0;
    const marksAverage = Number(avgMarks._avg.marks ?? 0);
    const riskScore = Number((absenceRate * 0.6 + Math.max(0, 100 - marksAverage) * 0.4).toFixed(2));

    res.json({
      absenceRate: Number(absenceRate.toFixed(2)),
      marksAverage,
      riskScore,
      interpretation: riskScore > 60 ? "high" : riskScore > 35 ? "medium" : "low"
    });
  } catch (error) {
    next(error);
  }
});
