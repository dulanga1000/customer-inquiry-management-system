import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@cims/shared";
import { AppError } from "../utils/AppError.js";

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("UNAUTHENTICATED", 401, "Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("FORBIDDEN", 403, "You do not have permission to perform this action"));
      return;
    }

    next();
  };
}
