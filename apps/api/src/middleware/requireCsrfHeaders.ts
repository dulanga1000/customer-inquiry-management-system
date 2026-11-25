import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requireCsrfHeaders(req: Request, _res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const requestedWith = req.header("x-requested-with");
  if (requestedWith !== "cims") {
    next(new AppError("FORBIDDEN", 403, "Missing or invalid X-Requested-With header"));
    return;
  }

  const contentLength = Number.parseInt(req.header("content-length") ?? "0", 10);
  const hasBody =
    (Number.isFinite(contentLength) && contentLength > 0) ||
    req.header("transfer-encoding") !== undefined;

  if (hasBody && !req.is("application/json")) {
    next(new AppError("VALIDATION_ERROR", 415, "Content-Type must be application/json"));
    return;
  }

  next();
}
