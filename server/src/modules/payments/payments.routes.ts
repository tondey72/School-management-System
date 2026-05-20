import { Router, Request, Response } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

const parseId = (id: string | string[] | undefined): string | undefined => {
  return Array.isArray(id) ? id[0] : id;
};

// ========== PAYMENTS ==========

const recordPaymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.string().refine((v) => !isNaN(parseFloat(v))),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "MOBILE_MONEY", "CHEQUE", "ONLINE"]),
  reference: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/payments", authenticate, async (req: Request, res: Response) => {
  try {
    const data = recordPaymentSchema.parse(req.body);
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

    const amount = parseFloat(data.amount);

    // Validate payment amount
    if (amount > invoice.outstandingAmount.toNumber()) {
      return res.status(400).json({ error: "Payment exceeds outstanding amount" });
    }

    // Generate receipt number
    const receiptCount = await prisma.paymentReceipt.count({ where: { schoolId } });
    const receiptNo = `RCP-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(6, "0")}`;

    const payment = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId: data.invoiceId,
        studentId: invoice.studentId,
        amount,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        bankName: data.bankName,
        notes: data.notes,
        receiptNo,
        status: "COMPLETED",
      },
    });

    // Create receipt
    const receipt = await prisma.paymentReceipt.create({
      data: {
        schoolId,
        paymentId: payment.id,
        receiptNo,
        amount,
        paymentMethod: data.paymentMethod,
        issuedBy: req.auth!.userId,
      },
    });

    // Update invoice
    const newOutstanding = Math.max(0, invoice.outstandingAmount.toNumber() - amount);
    const newPaidAmount = invoice.paidAmount.toNumber() + amount;
    const newStatus =
      newOutstanding === 0
        ? "PAID"
        : newPaidAmount > 0
          ? "PARTIAL"
          : invoice.status;

    await prisma.studentInvoice.update({
      where: { id: data.invoiceId },
      data: {
        outstandingAmount: newOutstanding,
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    res.json({
      payment,
      receipt,
      invoice: {
        id: invoice.id,
        outstandingAmount: newOutstanding,
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/payments", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (studentId) where.studentId = studentId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: { student: true, invoice: true, receipt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(payments);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/payments/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parseId(req.params.id) },
      include: { student: true, invoice: true, receipt: true },
    });

    if (!payment || payment.schoolId !== schoolId) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(payment);
  } catch (error: any) {
    console.error("Error fetching payment:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== PAYMENT REVERSAL ==========

const reversePaymentSchema = z.object({
  reason: z.string(),
});

router.post("/payments/:id/reverse", authenticate, async (req: Request, res: Response) => {
  try {
    const data = reversePaymentSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!payment || payment.schoolId !== schoolId) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "REVERSED") {
      return res.status(400).json({ error: "Payment already reversed" });
    }

    // Update payment status
    const reversedPayment = await prisma.payment.update({
      where: { id: parseId(req.params.id) },
      data: { status: "REVERSED", notes: `REVERSED: ${data.reason}` },
    });

    // Update invoice
    const invoice = await prisma.studentInvoice.findUnique({
      where: { id: payment.invoiceId },
    });

    if (invoice) {
      const newOutstanding = invoice.outstandingAmount.toNumber() + payment.amount.toNumber();
      const newPaidAmount = Math.max(0, invoice.paidAmount.toNumber() - payment.amount.toNumber());

      await prisma.studentInvoice.update({
        where: { id: payment.invoiceId },
        data: {
          outstandingAmount: newOutstanding,
          paidAmount: newPaidAmount,
          status: newPaidAmount === 0 ? "SENT" : "PARTIAL",
        },
      });
    }

    res.json(reversedPayment);
  } catch (error: any) {
    console.error("Error reversing payment:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== PAYMENT RECEIPTS ==========

router.get("/receipts", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (q) {
      where.receiptNo = { contains: q as string, mode: "insensitive" };
    }

    const receipts = await prisma.paymentReceipt.findMany({
      where,
      include: { payment: { include: { invoice: { include: { student: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(receipts);
  } catch (error: any) {
    console.error("Error fetching receipts:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/receipts/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const receipt = await prisma.paymentReceipt.findUnique({
      where: { id: parseId(req.params.id) },
      include: { payment: { include: { invoice: { include: { student: true } } } } },
    });

    if (!receipt || receipt.schoolId !== schoolId) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    res.json(receipt);
  } catch (error: any) {
    console.error("Error fetching receipt:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== PAYMENT HISTORY & AGING ==========

router.get("/student-statements/:studentId", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const student = await prisma.student.findUnique({
      where: { id: parseId(req.params.studentId) },
    });

    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: "Student not found" });
    }

    const invoices = await prisma.studentInvoice.findMany({
      where: { studentId: parseId(req.params.studentId), schoolId },
      include: { lineItems: true, payments: true },
      orderBy: { issueDate: "desc" },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + inv.netAmount.toNumber(), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingAmount.toNumber(), 0);

    // Calculate aging
    const now = new Date();
    const overdue = invoices.filter((inv) => new Date(inv.dueDate) < now && inv.outstandingAmount.toNumber() > 0);
    const dueSoon = invoices.filter(
      (inv) =>
        new Date(inv.dueDate) >= now &&
        new Date(inv.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) &&
        inv.outstandingAmount.toNumber() > 0
    );

    res.json({
      student,
      summary: {
        totalBilled,
        totalPaid,
        totalOutstanding,
        collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0,
        overdueCount: overdue.length,
        dueSoonCount: dueSoon.length,
      },
      invoices,
      overdue,
      dueSoon,
    });
  } catch (error: any) {
    console.error("Error fetching student statement:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== DAILY COLLECTIONS REPORT ==========

router.get("/collections/daily", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        status: "COMPLETED",
        paidAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: { student: true, invoice: true },
      orderBy: { paidAt: "asc" },
    });

    const byMethod = payments.reduce(
      (acc, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount.toNumber();
        return acc;
      },
      {} as Record<string, number>
    );

    const totalCollected = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    res.json({
      date: targetDate,
      totalPayments: payments.length,
      totalCollected,
      byMethod,
      payments,
    });
  } catch (error: any) {
    console.error("Error fetching daily collections:", error);
    res.status(400).json({ error: error.message });
  }
});

export const paymentRoutes = router;
