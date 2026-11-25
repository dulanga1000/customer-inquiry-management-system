import type { UserRole } from "@cims/shared";

export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
      validatedQuery?: unknown;
    }
  }
}

export {};
