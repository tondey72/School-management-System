import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtClaims, SystemRole } from "../types/auth.js";
import { env } from "../config/env.js";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ message: "Missing access token" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtClaims;
    req.auth = {
      userId: payload.sub,
      schoolId: payload.schoolId,
      role: payload.role,
      email: payload.email
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
  }
}

export function authorize(allowedRoles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
}
