import { Router, Request, Response } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

const parseId = (id: string | string[] | undefined): string | undefined => {
  return Array.isArray(id) ? id[0] : id;
};

// ========== FEE STRUCTURES ==========

const createFeeStructureSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  academicYear: z.string(),
  feeItems: z.array(
    z.object({
      feeType: z.enum([
        "TUITION",
        "BOARDING",
        "TRANSPORT",
        "EXAMINATION",
        "LIBRARY",
        "SPORTS",
        "UNIFORM",
        "ACTIVITY",
        "TECHNOLOGY",
        "HEALTH",
        "ONE_TIME",
        "CUSTOM",
      ]),
      name: z.string(),
      amount: z.string().refine((v) => !isNaN(parseFloat(v))),
      description: z.string().optional(),
      isRequired: z.boolean().default(true),
      isRecurring: z.boolean().default(false),
      recurringMonths: z.number().optional(),
    })
  ),
});

router.post("/fee-structures", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createFeeStructureSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        schoolId,
        name: data.name,
        description: data.description,
        academicYear: data.academicYear,
        feeItems: {
          create: data.feeItems.map((item) => ({
            feeType: item.feeType,
            name: item.name,
            amount: parseFloat(item.amount),
            description: item.description,
            isRequired: item.isRequired,
            isRecurring: item.isRecurring,
            recurringMonths: item.recurringMonths,
          })),
        },
      },
      include: { feeItems: true },
    });

    res.json(feeStructure);
  } catch (error: any) {
    console.error("Error creating fee structure:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/fee-structures", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const isActive = typeof req.query.isActive === 'string' ? req.query.isActive : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (academicYear) where.academicYear = academicYear;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: { feeItems: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(feeStructures);
  } catch (error: any) {
    console.error("Error fetching fee structures:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/fee-structures/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: parseId(req.params.id) },
      include: { feeItems: true },
    });

    if (!feeStructure || feeStructure.schoolId !== schoolId) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    res.json(feeStructure);
  } catch (error: any) {
    console.error("Error fetching fee structure:", error);
    res.status(400).json({ error: error.message });
  }
});

const updateFeeStructureSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.put("/fee-structures/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const data = updateFeeStructureSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const existing = await prisma.feeStructure.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!existing || existing.schoolId !== schoolId) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    const feeStructure = await prisma.feeStructure.update({
      where: { id: parseId(req.params.id) },
      data,
      include: { feeItems: true },
    });

    res.json(feeStructure);
  } catch (error: any) {
    console.error("Error updating fee structure:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== FEE ASSIGNMENTS ==========

const createFeeAssignmentSchema = z.object({
  studentId: z.string(),
  feeStructureId: z.string(),
  gradeLevel: z.string().optional(),
  classRoomId: z.string().optional(),
  academicYear: z.string(),
  billingCycle: z.enum(["MONTHLY", "TERM", "ANNUAL", "CUSTOM"]).default("TERM"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  discount: z.string().default("0"),
  discountType: z.enum(["FIXED", "PERCENTAGE", "SIBLING"]).default("FIXED"),
});

router.post("/fee-assignments", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createFeeAssignmentSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get fee structure to calculate total amount
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: data.feeStructureId },
      include: { feeItems: true },
    });

    if (!feeStructure) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    const totalFees = feeStructure.feeItems.reduce((sum: number, item: { amount: { toNumber: () => number } }) => sum + item.amount.toNumber(), 0);
    const discount = parseFloat(data.discount);
    const totalAmount = data.discountType === "PERCENTAGE" ? totalFees * (1 - discount / 100) : totalFees - discount;

    const feeAssignment = await prisma.feeAssignment.create({
      data: {
        schoolId,
        studentId: data.studentId,
        feeStructureId: data.feeStructureId,
        gradeLevel: data.gradeLevel,
        classRoomId: data.classRoomId,
        academicYear: data.academicYear,
        billingCycle: data.billingCycle,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        discount,
        discountType: data.discountType,
        totalAmount,
      },
    });

    res.json(feeAssignment);
  } catch (error: any) {
    console.error("Error creating fee assignment:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/fee-assignments", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (academicYear) where.academicYear = academicYear;

    const assignments = await prisma.feeAssignment.findMany({
      where,
      include: { student: true, feeStructure: { include: { feeItems: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(assignments);
  } catch (error: any) {
    console.error("Error fetching fee assignments:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== DISCOUNTS ==========

const createDiscountSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  discountType: z.enum(["FIXED", "PERCENTAGE", "SIBLING", "LOYALTY"]),
  discountValue: z.string().refine((v) => !isNaN(parseFloat(v))),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  priority: z.number().default(100),
});

router.post("/discounts", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createDiscountSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const discount = await prisma.discount.create({
      data: {
        schoolId,
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        minAmount: data.minAmount ? parseFloat(data.minAmount) : null,
        maxAmount: data.maxAmount ? parseFloat(data.maxAmount) : null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        priority: data.priority,
      },
    });

    res.json(discount);
  } catch (error: any) {
    console.error("Error creating discount:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/discounts", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const isActive = typeof req.query.isActive === 'string' ? req.query.isActive : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (isActive !== undefined) where.isActive = isActive === "true";

    const discounts = await prisma.discount.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    res.json(discounts);
  } catch (error: any) {
    console.error("Error fetching discounts:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== PAYMENT PLANS ==========

const createPaymentPlanSchema = z.object({
  studentId: z.string(),
  invoiceId: z.string().optional(),
  totalAmount: z.string().refine((v) => !isNaN(parseFloat(v))),
  downPayment: z.string().default("0"),
  numberOfInstallments: z.number().min(1),
  frequency: z.enum(["MONTHLY", "WEEKLY", "BI_WEEKLY"]).default("MONTHLY"),
  startDate: z.string().datetime(),
});

router.post("/payment-plans", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createPaymentPlanSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const totalAmount = parseFloat(data.totalAmount);
    const downPayment = parseFloat(data.downPayment);
    const remainingAmount = totalAmount - downPayment;
    const installmentAmount = remainingAmount / data.numberOfInstallments;

    // Generate plan number
    const planCount = await prisma.paymentPlan.count({ where: { schoolId } });
    const planNo = `PP-${schoolId.substring(0, 4)}-${Date.now()}-${planCount + 1}`;

    const startDate = new Date(data.startDate);
    const firstInstallmentDate = new Date(startDate);
    firstInstallmentDate.setDate(firstInstallmentDate.getDate() + 7);

    const lastInstallmentDate = new Date(firstInstallmentDate);
    const daysToAdd = data.numberOfInstallments * (data.frequency === "MONTHLY" ? 30 : data.frequency === "WEEKLY" ? 7 : 14);
    lastInstallmentDate.setDate(lastInstallmentDate.getDate() + daysToAdd);

    const paymentPlan = await prisma.paymentPlan.create({
      data: {
        schoolId,
        studentId: data.studentId,
        invoiceId: data.invoiceId || null,
        planNo,
        totalAmount,
        downPayment,
        numberOfInstallments: data.numberOfInstallments,
        installmentAmount,
        frequency: data.frequency,
        startDate,
        firstInstallmentDate,
        lastInstallmentDate,
        installments: {
          create: Array.from({ length: data.numberOfInstallments }, (_, i) => {
            const installmentDate = new Date(firstInstallmentDate);
            if (data.frequency === "MONTHLY") {
              installmentDate.setMonth(installmentDate.getMonth() + i);
            } else if (data.frequency === "WEEKLY") {
              installmentDate.setDate(installmentDate.getDate() + i * 7);
            } else {
              installmentDate.setDate(installmentDate.getDate() + i * 14);
            }
            return {
              sequenceNumber: i + 1,
              dueDate: installmentDate,
              amount: installmentAmount,
            };
          }),
        },
      },
      include: { installments: true },
    });

    res.json(paymentPlan);
  } catch (error: any) {
    console.error("Error creating payment plan:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/payment-plans", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const isActive = typeof req.query.isActive === 'string' ? req.query.isActive : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const plans = await prisma.paymentPlan.findMany({
      where,
      include: { student: true, installments: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(plans);
  } catch (error: any) {
    console.error("Error fetching payment plans:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/payment-plans/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const plan = await prisma.paymentPlan.findUnique({
      where: { id: parseId(req.params.id) },
      include: { student: true, installments: true },
    });

    if (!plan || plan.schoolId !== schoolId) {
      return res.status(404).json({ error: "Payment plan not found" });
    }

    res.json(plan);
  } catch (error: any) {
    console.error("Error fetching payment plan:", error);
    res.status(400).json({ error: error.message });
  }
});

export const billingRoutes = router;
