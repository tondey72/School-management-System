import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const hrRoutes = Router();

const staffSchema = z.object({
  staffNo: z.string().min(2),
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional()
});

hrRoutes.get("/staff", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_OFFICER"]), async (req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { fullName: "asc" },
      take: 200
    });
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

hrRoutes.post("/staff", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_OFFICER"]), async (req, res, next) => {
  try {
    const payload = staffSchema.parse(req.body);
    const staff = await prisma.staff.create({
      data: {
        schoolId: req.auth!.schoolId,
        ...payload
      }
    });
    res.status(201).json(staff);
  } catch (error) {
    next(error);
  }
});

hrRoutes.get("/overview", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "HR_OFFICER"]), async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [staffCount, payrollRecords] = await Promise.all([
      prisma.staff.count({ where: { schoolId } }),
      prisma.payroll.count({ where: { schoolId } })
    ]);

    res.json({
      recruitmentWorkflows: true,
      leaveManagement: true,
      performanceReviews: true,
      payrollIntegration: true,
      staffCount,
      payrollRecords
    });
  } catch (error) {
    next(error);
  }
});
