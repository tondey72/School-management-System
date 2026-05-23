import jwt from "jsonwebtoken";
import type { JwtClaims } from "../types/auth.js";
import { env } from "../config/env.js";

export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}

export function signRefreshToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}
