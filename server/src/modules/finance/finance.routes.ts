import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const financeRoutes = Router();

const invoiceSchema = z.object({
  studentId: z.string().optional(),
  invoiceNo: z.string().min(2),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  totalAmount: z.number().positive()
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: "CASH" as any,
});

financeRoutes.get("/invoices", authenticate, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const invoices = await prisma.studentInvoice.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { issueDate: "desc" },
      take: 100
    });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

financeRoutes.post("/invoices", authenticate, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const payload = invoiceSchema.parse(req.body);
    const invoice = await prisma.studentInvoice.create({
      data: {
        schoolId: req.auth!.schoolId,
        studentId: payload.studentId ?? "", // fallback to empty string if undefined
        invoiceNo: payload.invoiceNo,
        issueDate: new Date(payload.issueDate),
        dueDate: new Date(payload.dueDate),
        totalAmount: payload.totalAmount,
        paidAmount: 0,
        outstandingAmount: payload.totalAmount,
        netAmount: payload.totalAmount,
        academicYear: new Date().getFullYear().toString(),
        status: "SENT"
      }
    });
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

financeRoutes.post("/payments", authenticate, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const payload = paymentSchema.parse(req.body);
    const invoice = await prisma.studentInvoice.findUniqueOrThrow({ where: { id: payload.invoiceId } });
    const created = await prisma.payment.create({
      data: {
        schoolId: req.auth!.schoolId,
        studentId: invoice.studentId, // ensure studentId is included
        invoiceId: payload.invoiceId,
        amount: payload.amount,
        paymentMethod: "CASH" as any,
      }
    });

    const nextOutstanding = Number(invoice.outstandingAmount) - payload.amount;
    await prisma.studentInvoice.update({
      where: { id: payload.invoiceId },
      data: {
        outstandingAmount: Math.max(nextOutstanding, 0),
        status: nextOutstanding <= 0 ? "PAID" : "PARTIAL"
      }
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

financeRoutes.get("/summary", authenticate, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "SUPER_ADMIN"]), async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [invoiceCount, payrollCount, collections, outstanding] = await Promise.all([
      prisma.studentInvoice.count({ where: { schoolId } }),
      prisma.payroll.count({ where: { schoolId } }),
      prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
      prisma.studentInvoice.aggregate({ where: { schoolId }, _sum: { outstandingAmount: true } })
    ]);

    res.json({
      invoices: invoiceCount,
      collections: Number(collections._sum.amount ?? 0),
      payroll: payrollCount,
      outstanding: Number(outstanding._sum.outstandingAmount ?? 0),
      paymentGateway: "adapter-ready"
    });
  } catch (error) {
    next(error);
  }
});
