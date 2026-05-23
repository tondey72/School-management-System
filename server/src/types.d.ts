import type { SystemRole } from "./types/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        schoolId: string;
        role: SystemRole;
        email: string;
      };
    }
  }
}

export {};
