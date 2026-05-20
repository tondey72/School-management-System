import { Router, Request, Response } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

const parseId = (id: string | string[] | undefined): string | undefined => {
  return Array.isArray(id) ? id[0] : id;
};

// ========== BANK ACCOUNTS ==========

const createBankAccountSchema = z.object({
  accountName: z.string(),
  accountNumber: z.string(),
  bankName: z.string(),
  bankCode: z.string().optional(),
  accountType: z.string().default("CHECKING"),
  currency: z.string().default("KES"),
});

router.post("/bank-accounts", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createBankAccountSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        schoolId,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
        accountType: data.accountType,
        currency: data.currency,
      },
    });

    res.json(bankAccount);
  } catch (error: any) {
    console.error("Error creating bank account:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/bank-accounts", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { schoolId, isActive: true },
      include: { _count: { select: { transactions: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(accounts);
  } catch (error: any) {
    console.error("Error fetching bank accounts:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== BANK TRANSACTIONS ==========

const createBankTransactionSchema = z.object({
  bankAccountId: z.string(),
  amount: z.string().refine((v) => !isNaN(parseFloat(v))),
  transactionType: z.enum(["CREDIT", "DEBIT"]),
  description: z.string(),
  transactionDate: z.string().datetime(),
  bankRefNo: z.string().optional(),
  valueDate: z.string().datetime().optional(),
});

router.post("/bank-transactions", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createBankTransactionSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId },
    });

    if (!bankAccount || bankAccount.schoolId !== schoolId) {
      return res.status(404).json({ error: "Bank account not found" });
    }

    const transaction = await prisma.bankTransaction.create({
      data: {
        schoolId,
        bankAccountId: data.bankAccountId,
        amount: parseFloat(data.amount),
        transactionType: data.transactionType,
        description: data.description,
        transactionDate: new Date(data.transactionDate),
        bankRefNo: data.bankRefNo,
        valueDate: data.valueDate ? new Date(data.valueDate) : null,
      },
    });

    // Update account balance
    const balance =
      bankAccount.balance.toNumber() +
      (data.transactionType === "CREDIT" ? parseFloat(data.amount) : -parseFloat(data.amount));

    await prisma.bankAccount.update({
      where: { id: data.bankAccountId },
      data: { balance },
    });

    res.json(transaction);
  } catch (error: any) {
    console.error("Error creating bank transaction:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/bank-transactions", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const bankAccountId = typeof req.query.bankAccountId === 'string' ? req.query.bankAccountId : undefined;
    const isMatched = typeof req.query.isMatched === 'string' ? req.query.isMatched : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (isMatched !== undefined) where.isMatched = isMatched === "true";

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: { bankAccount: true },
      orderBy: { transactionDate: "desc" },
      take: 200,
    });

    res.json(transactions);
  } catch (error: any) {
    console.error("Error fetching bank transactions:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== BANK RECONCILIATION ==========

const createReconciliationSchema = z.object({
  bankAccountId: z.string(),
  bankStatementBalance: z.string().refine((v) => !isNaN(parseFloat(v))),
  reconciliationDate: z.string().datetime(),
});

router.post("/reconciliations", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createReconciliationSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId },
    });

    if (!bankAccount || bankAccount.schoolId !== schoolId) {
      return res.status(404).json({ error: "Bank account not found" });
    }

    const systemBalance = bankAccount.balance.toNumber();
    const bankStatementBalance = parseFloat(data.bankStatementBalance);
    const discrepancy = Math.abs(systemBalance - bankStatementBalance);

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        schoolId,
        bankAccountId: data.bankAccountId,
        bankStatementBalance,
        systemBalance,
        discrepancy,
        reconciliationDate: new Date(data.reconciliationDate),
        status: discrepancy < 0.01 ? "COMPLETED" : "DISCREPANCY_FOUND",
      },
    });

    res.json(reconciliation);
  } catch (error: any) {
    console.error("Error creating reconciliation:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/reconciliations", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const bankAccountId = typeof req.query.bankAccountId === 'string' ? req.query.bankAccountId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (status) where.status = status;

    const reconciliations = await prisma.bankReconciliation.findMany({
      where,
      include: { bankAccount: true },
      orderBy: { reconciliationDate: "desc" },
      take: 50,
    });

    res.json(reconciliations);
  } catch (error: any) {
    console.error("Error fetching reconciliations:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/reconciliations/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: parseId(req.params.id) },
      include: { bankAccount: { include: { transactions: true } } },
    });

    if (!reconciliation || reconciliation.schoolId !== schoolId) {
      return res.status(404).json({ error: "Reconciliation not found" });
    }

    res.json(reconciliation);
  } catch (error: any) {
    console.error("Error fetching reconciliation:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== MATCH TRANSACTIONS ==========

const matchTransactionSchema = z.object({
  transactionId: z.string(),
  matchedWith: z.string(),
});

router.post("/bank-transactions/:id/match", authenticate, async (req: Request, res: Response) => {
  try {
    const data = matchTransactionSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!transaction || transaction.schoolId !== schoolId) {
      return res.status(404).json({ error: "Bank transaction not found" });
    }

    const matchedTransaction = await prisma.bankTransaction.update({
      where: { id: parseId(req.params.id) },
      data: {
        isMatched: true,
        matchedWith: data.matchedWith,
      },
    });

    res.json(matchedTransaction);
  } catch (error: any) {
    console.error("Error matching transaction:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== RECONCILIATION COMPLETION ==========

const completeReconciliationSchema = z.object({
  notes: z.string().optional(),
});

router.post("/reconciliations/:id/complete", authenticate, async (req: Request, res: Response) => {
  try {
    const data = completeReconciliationSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!reconciliation || reconciliation.schoolId !== schoolId) {
      return res.status(404).json({ error: "Reconciliation not found" });
    }

    const completed = await prisma.bankReconciliation.update({
      where: { id: parseId(req.params.id) },
      data: {
        status: "COMPLETED",
        reconciledBy: req.auth!.userId,
        reconciledAt: new Date(),
        notes: data.notes,
      },
      include: { bankAccount: true },
    });

    // Update bank account last reconcile date
    await prisma.bankAccount.update({
      where: { id: reconciliation.bankAccountId },
      data: { lastReconcileDate: new Date() },
    });

    res.json(completed);
  } catch (error: any) {
    console.error("Error completing reconciliation:", error);
    res.status(400).json({ error: error.message });
  }
});

export const bankReconciliationRoutes = router;
