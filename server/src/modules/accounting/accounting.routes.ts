import { Router, Request, Response } from "express";
import { prisma } from "../../prisma/client.js";
import { authenticate } from "../../middleware/auth.js";
import { z } from "zod";

const router = Router();

const parseId = (id: string | string[] | undefined): string | undefined => {
  return Array.isArray(id) ? id[0] : id;
};

// ========== CHART OF ACCOUNTS ==========

const createAccountSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  description: z.string().optional(),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  parentAccountId: z.string().optional(),
});

router.post("/accounts", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createAccountSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const account = await prisma.accountingAccount.create({
      data: {
        schoolId,
        accountCode: data.accountCode,
        accountName: data.accountName,
        description: data.description,
        accountType: data.accountType,
        parentAccountId: data.parentAccountId,
      },
    });

    res.json(account);
  } catch (error: any) {
    console.error("Error creating account:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/accounts", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const accountType = typeof req.query.accountType === 'string' ? req.query.accountType : undefined;
    const isActive = typeof req.query.isActive === 'string' ? req.query.isActive : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
    if (accountType) where.accountType = accountType;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const accounts = await prisma.accountingAccount.findMany({
      where,
      orderBy: [{ accountType: "asc" }, { accountCode: "asc" }],
    });

    res.json(accounts);
  } catch (error: any) {
    console.error("Error fetching accounts:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== JOURNAL ENTRIES ==========

const createJournalEntrySchema = z.object({
  entryDate: z.string().datetime(),
  description: z.string().optional(),
  referenceNo: z.string().optional(),
  transactions: z.array(
    z.object({
      accountId: z.string(),
      transactionType: z.enum(["DEBIT", "CREDIT"]),
      amount: z.string().refine((v) => !isNaN(parseFloat(v))),
      description: z.string().optional(),
    })
  ),
});

router.post("/journal-entries", authenticate, async (req: Request, res: Response) => {
  try {
    const data = createJournalEntrySchema.parse(req.body);
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Validate journal entry balance
    let debits = 0,
      credits = 0;
    for (const txn of data.transactions) {
      const amount = parseFloat(txn.amount);
      if (txn.transactionType === "DEBIT") debits += amount;
      else credits += amount;
    }

    if (Math.abs(debits - credits) > 0.01) {
      return res.status(400).json({ error: "Journal entry is not balanced (debits != credits)" });
    }

    // Generate journal number
    const entryCount = await prisma.journalEntry.count({ where: { schoolId } });
    const journalNo = `JE-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, "0")}`;

    const journalEntry = await prisma.journalEntry.create({
      data: {
        schoolId,
        journalNo,
        entryDate: new Date(data.entryDate),
        description: data.description,
        referenceNo: data.referenceNo,
        createdBy: req.auth!.userId,
        transactions: {
          create: data.transactions.map((txn) => ({
            schoolId,
            accountId: txn.accountId,
            transactionType: txn.transactionType,
            amount: parseFloat(txn.amount),
            description: txn.description,
            transactionDate: new Date(data.entryDate),
          })),
        },
      },
      include: { transactions: { include: { account: true } } },
    });

    res.json(journalEntry);
  } catch (error: any) {
    console.error("Error creating journal entry:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get("/journal-entries", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
      const statusValue = typeof req.query.status === 'string' ? req.query.status : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = { schoolId };
      if (statusValue) where.status = statusValue;

    const entries = await prisma.journalEntry.findMany({
      where,
      include: { transactions: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(entries);
  } catch (error: any) {
    console.error("Error fetching journal entries:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== POST JOURNAL ENTRY ==========

router.post("/journal-entries/:id/post", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const entry = await prisma.journalEntry.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!entry || entry.schoolId !== schoolId) {
      return res.status(404).json({ error: "Journal entry not found" });
    }

    if (entry.status !== "DRAFT") {
      return res.status(400).json({ error: "Only draft entries can be posted" });
    }

    const postedEntry = await prisma.journalEntry.update({
      where: { id: parseId(req.params.id) },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        postedBy: req.auth!.userId,
      },
      include: { transactions: { include: { account: true } } },
    });

    res.json(postedEntry);
  } catch (error: any) {
    console.error("Error posting journal entry:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== GENERAL LEDGER ==========

router.get("/general-ledger", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const where: any = {
      schoolId,
      journalEntry: { status: "POSTED" },
    };

    if (accountId) where.accountId = accountId;

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate as string);
      if (endDate) where.transactionDate.lte = new Date(endDate as string);
    }

    const transactions = await prisma.ledgerTransaction.findMany({
      where,
      include: { account: true, journalEntry: true },
      orderBy: { transactionDate: "asc" },
      take: 500,
    });

    res.json(transactions);
  } catch (error: any) {
    console.error("Error fetching general ledger:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== TRIAL BALANCE ==========

router.get("/trial-balance", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
    const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const cutoffDate = asOfDate ? new Date(asOfDate as string) : new Date();

    const accounts = await prisma.accountingAccount.findMany({
      where: { schoolId, isActive: true },
    });

    const trialBalance = [];

    for (const account of accounts) {
      const transactions = await prisma.ledgerTransaction.findMany({
        where: {
          schoolId,
          accountId: account.id,
          transactionDate: { lte: cutoffDate },
          journalEntry: { status: "POSTED" },
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

      const balance = debit - credit;

      if (Math.abs(balance) > 0.01 || transactions.length > 0) {
        trialBalance.push({
          account,
          debit,
          credit,
          balance: balance > 0 ? balance : 0,
          contraBalance: balance < 0 ? Math.abs(balance) : 0,
        });
      }
    }

    const totalDebits = trialBalance.reduce((sum, row) => sum + row.debit, 0);
    const totalCredits = trialBalance.reduce((sum, row) => sum + row.credit, 0);

    res.json({
      asOfDate: cutoffDate,
      trialBalance,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    });
  } catch (error: any) {
    console.error("Error generating trial balance:", error);
    res.status(400).json({ error: error.message });
  }
});

// ========== ACCOUNT BALANCE INQUIRY ==========

router.get("/accounts/:id/balance", authenticate, async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth!.schoolId;
      const accountIdValue = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
      const startDateValue = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateValue = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    if (!schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const account = await prisma.accountingAccount.findUnique({
      where: { id: parseId(req.params.id) },
    });

    if (!account || account.schoolId !== schoolId) {
      return res.status(404).json({ error: "Account not found" });
    }


    const where: any = {
      journalEntry: { status: "POSTED" },
    };

    if (startDateValue || endDateValue) {
      where.transactionDate = {};
      if (startDateValue) where.transactionDate.gte = new Date(startDateValue);
      if (endDateValue) where.transactionDate.lte = new Date(endDateValue);
    }
    const transactions = await prisma.ledgerTransaction.findMany({
      where,
      include: { journalEntry: true },
      orderBy: { transactionDate: "asc" },
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

    const balance = debit - credit;

    res.json({
      account,
      debit,
      credit,
      balance,
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching account balance:", error);
    res.status(400).json({ error: error.message });
  }
});

export const accountingRoutes = router;
