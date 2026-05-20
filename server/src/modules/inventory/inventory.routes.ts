import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const inventoryRoutes = Router();

const assetSchema = z.object({
  assetTag: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  purchaseDate: z.string().datetime(),
  purchaseValue: z.number().positive(),
  depreciationPct: z.number().nonnegative()
});

inventoryRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { purchaseDate: "desc" },
      take: 200
    });
    res.json(assets);
  } catch (error) {
    next(error);
  }
});

inventoryRoutes.post("/", authenticate, async (req, res, next) => {
  try {
    const payload = assetSchema.parse(req.body);
    const asset = await prisma.asset.create({
      data: {
        schoolId: req.auth!.schoolId,
        assetTag: payload.assetTag,
        name: payload.name,
        category: payload.category,
        purchaseDate: new Date(payload.purchaseDate),
        purchaseValue: payload.purchaseValue,
        depreciationPct: payload.depreciationPct
      }
    });
    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
});

inventoryRoutes.get("/assets", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [assetRegister, value] = await Promise.all([
      prisma.asset.count({ where: { schoolId } }),
      prisma.asset.aggregate({ where: { schoolId }, _sum: { purchaseValue: true } })
    ]);

    res.json({
      assetRegister,
      stockTracking: true,
      depreciationTracking: true,
      totalPurchaseValue: Number(value._sum.purchaseValue ?? 0)
    });
  } catch (error) {
    next(error);
  }
});
