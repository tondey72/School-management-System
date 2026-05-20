import type { SystemRole } from "@sms/shared";

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
