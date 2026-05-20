import { z } from "zod";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(16)
});

export const AuthController = {
  async login(req: Request, res: Response): Promise<void> {
    const body = loginSchema.parse(req.body);
    const payload = await AuthService.login(body.email, body.password);
    res.json(payload);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const body = refreshSchema.parse(req.body);
    const payload = await AuthService.refresh(body.refreshToken);
    res.json(payload);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await AuthService.me(req.auth!.userId);
    res.json(user);
  },

  async logout(req: Request, res: Response): Promise<void> {
    await AuthService.logout(req.auth!.userId);
    res.status(204).send();
  },

  async ssoProviders(_req: Request, res: Response): Promise<void> {
    res.json(AuthService.ssoProviders());
  }
};
