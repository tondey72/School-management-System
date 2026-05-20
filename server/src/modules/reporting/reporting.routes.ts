import { Router, Request, Response } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

// ========== BALANCE SHEET ==========

router.get(
  "/reports/balance-sheet",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.auth!.schoolId;
      const asOfDateParam = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;

      if (!schoolId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const cutoffDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

      // Get all asset accounts
      const assets = await prisma.accountingAccount.findMany({
        where: { schoolId, accountType: "ASSET", isActive: true },
      });

      const liabilities = await prisma.accountingAccount.findMany({
        where: { schoolId, accountType: "LIABILITY", isActive: true },
      });

      const equity = await prisma.accountingAccount.findMany({
        where: { schoolId, accountType: "EQUITY", isActive: true },
      });

      const calculateBalance = async (accountId: string) => {
        const transactions = await prisma.ledgerTransaction.findMany({
          where: {
            schoolId,
            accountId,
            transactionDate: { lte: cutoffDate },
          },
        });

        let debit = 0,
          credit = 0;
        for (const txn of transactions) {
          if (txn.transactionType === "DEBIT") {
            debit += txn.amount.toNumber();
          } else {
            credit += txn.amount.toNumber();
          }
        }

        return debit - credit;
      };

      const assetBalances = await Promise.all(
        assets.map(async (a) => ({
          ...a,
          balance: await calculateBalance(a.id),
        }))
      );

      const liabilityBalances = await Promise.all(
        liabilities.map(async (l) => ({
          ...l,
          balance: await calculateBalance(l.id),
        }))
      );

      const equityBalances = await Promise.all(
        equity.map(async (e) => ({
          ...e,
          balance: await calculateBalance(e.id),
        }))
      );

      const totalAssets = assetBalances.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilityBalances.reduce(
        (sum, l) => sum + l.balance,
        0
      );
      const totalEquity = equityBalances.reduce((sum, e) => sum + e.balance, 0);

      res.json({
        reportType: "BALANCE_SHEET",
        asOfDate: cutoffDate,
        assets: assetBalances,
        liabilities: liabilityBalances,
        equity: equityBalances,
        totals: { totalAssets, totalLiabilities, totalEquity },
      });
    } catch (error: any) {
      console.error("Error generating balance sheet:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== INCOME STATEMENT ==========

router.get(
  "/reports/income-statement",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.auth!.schoolId;
      const startDateParam = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateParam = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

      if (!schoolId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = endDateParam ? new Date(endDateParam) : new Date();

      // Get all revenue and expense accounts
      const revenues = await prisma.accountingAccount.findMany({
        where: { schoolId, accountType: "REVENUE", isActive: true },
      });

      const expenses = await prisma.accountingAccount.findMany({
        where: { schoolId, accountType: "EXPENSE", isActive: true },
      });

      const calculatePeriodBalance = async (
        accountId: string,
        _startDate: Date,
        _endDate: Date
      ) => {
        const transactions = await prisma.ledgerTransaction.findMany({
          where: {
            schoolId,
            accountId,
            transactionDate: { gte: _startDate, lte: _endDate },
          },
        });

        let balance = 0;
        for (const txn of transactions) {
          if (txn.transactionType === "CREDIT") {
            balance += txn.amount.toNumber();
          } else {
            balance -= txn.amount.toNumber();
          }
        }

        return balance;
      };

      const revenueBalances = await Promise.all(
        revenues.map(async (r) => ({
          ...r,
          balance: await calculatePeriodBalance(r.id, startDate, endDate),
        }))
      );

      const expenseBalances = await Promise.all(
        expenses.map(async (e) => ({
          ...e,
          balance: await calculatePeriodBalance(e.id, startDate, endDate),
        }))
      );

      const totalRevenue = revenueBalances.reduce(
        (sum, r) => sum + r.balance,
        0
      );
      const totalExpense = expenseBalances.reduce((sum, e) => sum + e.balance, 0);
      const netIncome = totalRevenue - totalExpense;

      res.json({
        reportType: "INCOME_STATEMENT",
        period: { startDate, endDate },
        revenues: revenueBalances,
        expenses: expenseBalances,
        totals: { totalRevenue, totalExpense, netIncome },
      });
    } catch (error: any) {
      console.error("Error generating income statement:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== FEE COLLECTION REPORT ==========

router.get(
  "/reports/fee-collection",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.auth!.schoolId;
      const academicYearParam = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;

      if (!schoolId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const where: any = { schoolId };
      if (academicYearParam) where.academicYear = academicYearParam;

      const invoices = await prisma.studentInvoice.findMany({
        where,
        include: { student: true, payments: true },
      });

      const byStatus: Record<string, number> = {};
      const byStudent: Record<string, any> = {};
      let totalBilled = 0,
        totalCollected = 0,
        totalOutstanding = 0;

      for (const invoice of invoices) {
        totalBilled += invoice.netAmount.toNumber();
        totalCollected += invoice.paidAmount.toNumber();
        totalOutstanding += invoice.outstandingAmount.toNumber();

        // Group by status
        byStatus[invoice.status] = (byStatus[invoice.status] || 0) + 1;

        // Group by student
        if (!byStudent[invoice.studentId]) {
          byStudent[invoice.studentId] = {
            student: invoice.student,
            invoices: 0,
            billed: 0,
            collected: 0,
            outstanding: 0,
          };
        }
        byStudent[invoice.studentId].invoices += 1;
        byStudent[invoice.studentId].billed +=
          invoice.netAmount.toNumber();
        byStudent[invoice.studentId].collected +=
          invoice.paidAmount.toNumber();
        byStudent[invoice.studentId].outstanding +=
          invoice.outstandingAmount.toNumber();
      }

      const collectionRate =
        totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

      res.json({
        reportType: "FEE_COLLECTION",
        summary: {
          totalInvoices: invoices.length,
          totalBilled,
          totalCollected,
          totalOutstanding,
          collectionRate: collectionRate.toFixed(2),
        },
        byStatus,
        byStudent: Object.values(byStudent),
      });
    } catch (error: any) {
      console.error("Error generating fee collection report:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== ACCOUNTS RECEIVABLE AGING REPORT ==========

router.get(
  "/reports/accounts-receivable-aging",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.auth!.schoolId;

      if (!schoolId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const today = new Date();
      const invoices = await prisma.studentInvoice.findMany({
        where: { schoolId, status: { in: ["PARTIAL", "OVERDUE"] } },
        include: { student: true },
      });

      const agingBuckets: {
        current: any[];
        days30: any[];
        days60: any[];
        days90: any[];
        over90: any[];
      } = {
        current: [],
        days30: [],
        days60: [],
        days90: [],
        over90: [],
      };

      for (const invoice of invoices) {
        const daysOverdue = Math.floor(
          (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const item = {
          invoice,
          daysOverdue,
          outstandingAmount: invoice.outstandingAmount.toNumber(),
        };

        if (daysOverdue <= 0) {
          agingBuckets.current.push(item);
        } else if (daysOverdue <= 30) {
          agingBuckets.days30.push(item);
        } else if (daysOverdue <= 60) {
          agingBuckets.days60.push(item);
        } else if (daysOverdue <= 90) {
          agingBuckets.days90.push(item);
        } else {
          agingBuckets.over90.push(item);
        }
      }

      res.json({
        reportType: "ACCOUNTS_RECEIVABLE_AGING",
        asOfDate: today,
        aging: agingBuckets,
        summary: {
          currentTotal: agingBuckets.current.reduce(
            (sum, i) => sum + i.outstandingAmount,
            0
          ),
          days30Total: agingBuckets.days30.reduce(
            (sum, i) => sum + i.outstandingAmount,
            0
          ),
          days60Total: agingBuckets.days60.reduce(
            (sum, i) => sum + i.outstandingAmount,
            0
          ),
          days90Total: agingBuckets.days90.reduce(
            (sum, i) => sum + i.outstandingAmount,
            0
          ),
          over90Total: agingBuckets.over90.reduce(
            (sum, i) => sum + i.outstandingAmount,
            0
          ),
        },
      });
    } catch (error: any) {
      console.error("Error generating AR aging report:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== EXPENSE REPORT ==========

router.get(
  "/reports/expenses",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.auth!.schoolId;
      const startDateParam = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateParam = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const categoryParam = typeof req.query.category === 'string' ? req.query.category : undefined;
      const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;

      if (!schoolId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const where: any = { schoolId };

      if (startDateParam || endDateParam) {
        where.createdAt = {};
        if (startDateParam) where.createdAt.gte = new Date(startDateParam);
        if (endDateParam) where.createdAt.lte = new Date(endDateParam);
      }

      if (categoryParam) where.category = categoryParam;
      if (statusParam) where.status = statusParam;

      const expenses = await prisma.expense.findMany({
        where,
        include: { vendor: true, approvals: true },
        orderBy: { createdAt: "desc" },
      });

      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalExpenses = 0;

      for (const expense of expenses) {
        totalExpenses += expense.amount.toNumber();

        byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount.toNumber();
        byStatus[expense.status] = (byStatus[expense.status] || 0) + 1;
      }

      res.json({
        reportType: "EXPENSE_REPORT",
        period: { startDate: startDateParam, endDate: endDateParam },
        summary: { count: expenses.length, total: totalExpenses },
        byCategory,
        byStatus,
        expenses,
      });
    } catch (error: any) {
      console.error("Error generating expense report:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== SAVE/RETRIEVE REPORTS ==========

const saveReportSchema = z.object({
  reportType: z.string(),
  reportData: z.any(),
});

router.post(
  "/reports",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const data = saveReportSchema.parse(req.body);
      const schoolId = req.auth!.schoolId;

      if (!schoolId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const report = await prisma.financialReport.create({
        data: {
          schoolId,
          reportType: data.reportType as any,
          reportName: data.reportType,
          reportDate: new Date(),
          reportData: data.reportData,
          generatedBy: req.auth!.userId,
          generatedAt: new Date(),
        },
      });

      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error saving report:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get("/reports", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reports = await prisma.financialReport.findMany({
      where: { schoolId },
      orderBy: { generatedAt: "desc" },
      take: 100,
    });

    res.json(reports);
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    res.status(400).json({ error: error.message });
  }
});

export const reportingRoutes = router;
