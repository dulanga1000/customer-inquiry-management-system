import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import type { ApiErrorResponse } from "@cims/shared";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  meta?: Record<string, unknown>;
}

function isZodLikeError(
  err: unknown,
): err is { name: string; flatten: () => { fieldErrors: Record<string, string[] | undefined> } } {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: unknown }).name === "ZodError" &&
    "flatten" in err &&
    typeof (err as { flatten: unknown }).flatten === "function"
  );
}

function isBodyParserError(err: unknown): err is { type: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string"
  );
}

function extractPgCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }
  const record = err as Record<string, unknown>;
  if (typeof record["code"] === "string") {
    return record["code"];
  }
  if (typeof record["cause"] === "object" && record["cause"] !== null) {
    const causeCode = (record["cause"] as Record<string, unknown>)["code"];
    if (typeof causeCode === "string") {
      return causeCode;
    }
  }
  return undefined;
}

function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return {
      status: err.status,
      code: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
      ...(err.meta ? { meta: err.meta } : {}),
    };
  }

  if (isZodLikeError(err)) {
    const rawFields = err.flatten().fieldErrors;
    const fields: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(rawFields)) {
      if (messages && messages.length > 0) {
        fields[key] = messages;
      }
    }
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields",
      fields,
    };
  }

  if (isBodyParserError(err)) {
    if (err.type === "entity.parse.failed") {
      return { status: 400, code: "VALIDATION_ERROR", message: "Malformed JSON request body" };
    }
    if (err.type === "entity.too.large") {
      return { status: 413, code: "VALIDATION_ERROR", message: "Request payload too large" };
    }
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return { status: 409, code: "CONFLICT", message: "Resource already exists" };
    }
    if (err.code === "P2025") {
      return { status: 404, code: "NOT_FOUND", message: "Resource not found" };
    }
  }

  const pgCode = extractPgCode(err);
  if (pgCode === "22P02") {
    return { status: 400, code: "VALIDATION_ERROR", message: "Invalid identifier" };
  }
  if (pgCode === "23505") {
    return { status: 409, code: "CONFLICT", message: "Resource already exists" };
  }
  if (pgCode === "23514") {
    return { status: 400, code: "VALIDATION_ERROR", message: "Value violates a constraint" };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  };
}

export function createErrorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = req.requestId ?? "unknown";
    const normalized = normalizeError(err);

    const logContext = {
      requestId,
      code: normalized.code,
      status: normalized.status,
      method: req.method,
      path: req.originalUrl,
    };

    if (normalized.status >= 500) {
      logger.error({ ...logContext, err }, "Unhandled server error");
    } else {
      logger.warn(logContext, normalized.message);
    }

    const body: ApiErrorResponse = {
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.fields ? { fields: normalized.fields } : {}),
        ...(normalized.meta ? { meta: normalized.meta } : {}),
        requestId,
      },
    };

    res.status(normalized.status).json(body);
  };
}
