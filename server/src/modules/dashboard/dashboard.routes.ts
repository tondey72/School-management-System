import { Router } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/executive", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;

    const [students, staff, pendingApprovals, outstandingInvoices, attendanceToday] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.staff.count({ where: { schoolId } }),
      prisma.workflowInstance.count({ where: { schoolId, status: "PENDING" } }),
      prisma.studentInvoice.aggregate({
        where: { schoolId, status: { in: ["DRAFT", "SENT", "PARTIAL"] } },
        _sum: { outstandingAmount: true }
      }),
      prisma.attendanceRecord.count({
        where: {
          schoolId,
          date: new Date(new Date().toDateString()),
          status: "PRESENT"
        }
      })
    ]);

    res.json({
      students,
      staff,
      pendingApprovals,
      outstandingFees: outstandingInvoices._sum.outstandingAmount ?? 0,
      attendanceToday,
      revenueTrend: [
        { month: "Jan", revenue: 23000 },
        { month: "Feb", revenue: 27000 },
        { month: "Mar", revenue: 30000 },
        { month: "Apr", revenue: 26000 },
        { month: "May", revenue: 32500 }
      ],
      alerts: [
        { id: "fee-1", severity: "warning", message: "Outstanding fees exceed threshold" },
        { id: "exam-1", severity: "info", message: "Midterm exams start in 4 days" }
      ]
    });
  } catch (error) {
    next(error);
  }
});
