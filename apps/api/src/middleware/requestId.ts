import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.header("x-request-id")?.trim();
  const requestId =
    headerValue && headerValue.length > 0 && headerValue.length <= 128
      ? headerValue
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
