import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof Error) {
    const withStatus = error as Error & { statusCode?: number };
    if (withStatus.statusCode) {
      res.status(withStatus.statusCode).json({ message: error.message });
      return;
    }

    res.status(500).json({
      message: error.message
    });
    return;
  }

  res.status(500).json({
    message: "Unexpected server error"
  });
}
