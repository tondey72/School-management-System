import { Router, Request, Response } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";
import { z } from "zod";
import type { FeeType } from "@prisma/client";

const router = Router();

const parseId = (id: string | string[] | undefined): string | undefined => {
  return Array.isArray(id) ? id[0] : id;
};

// ========== STUDENT INVOICES ==========

const createInvoiceSchema = z.object({
  studentId: z.string(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  billingCycle: z.enum(["MONTHLY", "TERM", "ANNUAL", "CUSTOM"]).default("TERM"),
  academicYear: z.string(),
  term: z.string().optional(),
  lineItems: z.array(
    z.object({
      description: z.string(),
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
      quantity: z.number().default(1),
      unitPrice: z.string().refine((v) => !isNaN(parseFloat(v))),
    })
  ),
  discountAmount: z.string().default("0"),
  taxAmount: z.string().default("0"),
  notes: z.string().optional(),
  description: z.string().optional(),
});

router.post("/invoices", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Generate invoice number
    const invoiceCount = await prisma.studentInvoice.count({ where: { schoolId } });
    const invoiceNo: string = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, "0")}`;

    // Calculate amounts
    const lineItems = data.lineItems.map((item: { description: string; feeType: string; quantity: number; unitPrice: string }) => ({
      description: item.description,
      feeType: item.feeType as any, // fallback to any if FeeType enum import fails
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      amount: item.quantity * parseFloat(item.unitPrice),
    }));

    const totalAmount = lineItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const discountAmount = parseFloat(data.discountAmount);
    const taxAmount = totalAmount * vatRate;
    const netAmount = totalAmount - discountAmount + taxAmount;

    const invoice = await prisma.studentInvoice.create({
      data: {
        schoolId,
        studentId: data.studentId,
        invoiceNo,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        billingCycle: data.billingCycle,
        academicYear: data.academicYear,
        term: data.term,
        totalAmount,
        discountAmount,
        taxAmount,
        netAmount,
        outstandingAmount: netAmount,
        notes: data.notes,
        description: data.description,
        lineItems: {
          create: lineItems,
        },
      },
      include: { lineItems: true, student: true },
    });

    res.json(invoice);
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    res.status(400).json({ error: error.message });
  }
});





router.get("/invoices", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const studentIdParam = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
    const academicYearParam = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const qParam = typeof req.query.q === 'string' ? req.query.q : undefined;

    const where: any = { schoolId };
    if (studentIdParam) where.studentId = studentIdParam as any;
    if (statusParam) where.status = statusParam as any;
    if (academicYearParam) where.academicYear = academicYearParam;
    if (qParam) {
      where.OR = [{ invoiceNo: { contains: qParam, mode: "insensitive" } }];
    }

    const invoices = await prisma.studentInvoice.findMany({
      where,
      include: { student: true, lineItems: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(invoices);
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/invoices/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const invoice = await prisma.studentInvoice.findUnique({
      where: { id: parseId(req.params.id) },
      include: { student: { include: { guardians: true } }, lineItems: true, payments: true, creditNotes: true },
    });

    if (!invoice || invoice.schoolId !== schoolId) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    res.status(400).json({ error: error.message });
  }
});

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "VOID", "OVERDUE", "CANCELLED"]).optional(),
  approvedBy: z.string().optional(),
});

router.put("/invoices/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const data = updateInvoiceSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const existing = await prisma.studentInvoice.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!existing || existing.schoolId !== schoolId) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
    }
    if (data.approvedBy) {
      updateData.approvedBy = data.approvedBy;
      updateData.approvedAt = new Date();
    }

    const invoice = await prisma.studentInvoice.update({
      where: { id: parseId(req.params.id) },
      data: updateData,
      include: { student: true, lineItems: true },
    });

    res.json(invoice);
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== BULK INVOICE GENERATION ==========

const bulkGenerateInvoicesSchema = z.object({
  studentIds: z.array(z.string()),
  feeStructureId: z.string(),
  academicYear: z.string(),
  term: z.string().optional(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
});

router.post("/invoices/bulk-generate", authenticate, async (req: Request, res: Response) => {
  try {
    const data = bulkGenerateInvoicesSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: data.feeStructureId },
      include: { feeItems: true },
    });

    if (!feeStructure) {
      return res.status(404).json({ error: "Fee structure not found" });
    }

    const createdInvoices = [];

    for (const studentId of data.studentIds) {
      const invoiceCount = await prisma.studentInvoice.count({ where: { schoolId } });
      const invoiceNo: string = `INV-${new Date().getFullYear()}-${String(invoiceCount + createdInvoices.length + 1).padStart(5, "0")}`;

      const totalAmount = feeStructure.feeItems.reduce((sum: number, item: { name: string; feeType: string; amount: any }) => sum + item.amount, 0);

      const invoice = await prisma.studentInvoice.create({
        data: {
          schoolId,
          studentId,
          invoiceNo,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          academicYear: data.academicYear,
          term: data.term,
          billingCycle: "TERM",
          totalAmount,
          netAmount: totalAmount,
          outstandingAmount: totalAmount,
          lineItems: {
            create: feeStructure.feeItems.map((item: { name: string; feeType: string; amount: any }) => ({
              description: item.name,
              feeType: item.feeType as any, // fallback to any for enum
              quantity: 1,
              unitPrice: item.amount,
              amount: item.amount,
            })),
          },
        },
        include: { lineItems: true },
      });

      createdInvoices.push(invoice);
    }

    res.json({ count: createdInvoices.length, invoices: createdInvoices });
  } catch (error: any) {
    console.error("Error generating invoices:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== CREDIT NOTES ==========

const createCreditNoteSchema = z.object({
  invoiceId: z.string(),
  reason: z.string(),
  amount: z.string().refine((v) => !isNaN(parseFloat(v))),
});

router.post("/credit-notes", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createCreditNoteSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const invoice = await prisma.studentInvoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice || invoice.schoolId !== schoolId) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const creditNoteCount = await prisma.creditNote.count({ where: { schoolId } });
    const creditNoteNo = `CN-${new Date().getFullYear()}-${String(creditNoteCount + 1).padStart(5, "0")}`;

    const creditNote = await prisma.creditNote.create({
      data: {
        schoolId,
        invoiceId: data.invoiceId,
        creditNoteNo,
        reason: data.reason,
        amount: parseFloat(data.amount),
        createdBy: req.auth!.userId,
      },
    });

    // Update invoice outstanding amount
    const newOutstanding = Math.max(0, invoice.outstandingAmount.toNumber() - parseFloat(data.amount));
    await prisma.studentInvoice.update({
      where: { id: data.invoiceId },
      data: { outstandingAmount: newOutstanding },
    });

    res.json(creditNote);
  } catch (error: any) {
    console.error("Error creating credit note:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/credit-notes", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const creditNotes = await prisma.creditNote.findMany({
      where: { schoolId },
      include: { invoice: { include: { student: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(creditNotes);
  } catch (error: any) {
    console.error("Error fetching credit notes:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== VAT CONFIGURATION ==========

// Example: Store VAT config in-memory (replace with DB or config service as needed)
let vatRate = 0.16; // Default 16%

router.get("/vat", authenticate, (req: Request, res: Response) => {
  res.json({ vatRate });
});

router.put("/vat", authenticate, (req: Request, res: Response) => {
  const { rate } = req.body;
  if (typeof rate !== "number" || rate < 0 || rate > 1) {
    return res.status(400).json({ error: "Invalid VAT rate. Must be a number between 0 and 1." });
  }
  vatRate = rate;
  res.json({ vatRate });
});

export const invoicingRoutes = router;
