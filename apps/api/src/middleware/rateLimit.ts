import type { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function createRateLimitHandler(message: string) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next(new AppError("RATE_LIMITED", 429, message));
  };
}

export function createLoginRateLimiter(enabled: boolean): RequestHandler {
  if (!enabled) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const rawEmail =
        typeof (req.body as Record<string, unknown> | undefined)?.["email"] === "string"
          ? ((req.body as Record<string, unknown>)["email"] as string).trim().toLowerCase()
          : "";
      const ipKey = ipKeyGenerator(req.ip ?? "127.0.0.1");
      return `${ipKey}:${rawEmail}`;
    },
    handler: createRateLimitHandler("Too many login attempts, please try again later"),
  });
}

export function createRefreshRateLimiter(enabled: boolean): RequestHandler {
  if (!enabled) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: createRateLimitHandler("Too many token refresh attempts, please try again later"),
  });
}
