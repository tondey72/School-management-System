import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const libraryRoutes = Router();

const bookSchema = z.object({
  isbn: z.string().min(4),
  title: z.string().min(2),
  author: z.string().min(2),
  totalCopies: z.number().int().positive()
});

libraryRoutes.get("/books", authenticate, async (req, res, next) => {
  try {
    const books = await prisma.libraryBook.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: { title: "asc" }
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
});

libraryRoutes.post("/books", authenticate, async (req, res, next) => {
  try {
    const payload = bookSchema.parse(req.body);
    const book = await prisma.libraryBook.create({
      data: {
        schoolId: req.auth!.schoolId,
        isbn: payload.isbn,
        title: payload.title,
        author: payload.author,
        totalCopies: payload.totalCopies,
        availableCopy: payload.totalCopies
      }
    });
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
});

libraryRoutes.get("/overview", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [titles, available] = await Promise.all([
      prisma.libraryBook.count({ where: { schoolId } }),
      prisma.libraryBook.aggregate({ where: { schoolId }, _sum: { availableCopy: true } })
    ]);

    res.json({
      barcodeSupport: true,
      reservationWorkflows: true,
      fineCalculation: true,
      titles,
      availableCopies: available._sum.availableCopy ?? 0
    });
  } catch (error) {
    next(error);
  }
});
