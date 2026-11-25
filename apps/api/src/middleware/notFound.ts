import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("NOT_FOUND", 404, "Route not found"));
}
