import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

export const authRoutes = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Access and refresh tokens
 */
authRoutes.post("/login", (req, res, next) => {
  AuthController.login(req, res).catch(next);
});

authRoutes.post("/refresh", (req, res, next) => {
  AuthController.refresh(req, res).catch(next);
});

authRoutes.get("/me", authenticate, (req, res, next) => {
  AuthController.me(req, res).catch(next);
});

authRoutes.post("/logout", authenticate, (req, res, next) => {
  AuthController.logout(req, res).catch(next);
});

authRoutes.get("/sso/providers", (req, res, next) => {
  AuthController.ssoProviders(req, res).catch(next);
});
