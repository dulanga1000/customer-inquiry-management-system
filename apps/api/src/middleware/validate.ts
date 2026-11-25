import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export interface ValidationSchema<T = unknown> {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: T }
    | {
        success: false;
        error: {
          flatten(): {
            fieldErrors: Record<string, string[] | undefined>;
          };
        };
      };
}

export interface ValidateSchemas {
  body?: ValidationSchema;
  params?: ValidationSchema;
  query?: ValidationSchema;
}

function normalizeFieldErrors(
  rawErrors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(rawErrors)) {
    if (messages && messages.length > 0) {
      fields[key] = messages;
    }
  }
  return fields;
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const mergedFields: Record<string, string[]> = {};

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        Object.assign(mergedFields, normalizeFieldErrors(result.error.flatten().fieldErrors));
      } else {
        req.params = result.data as Record<string, string>;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        Object.assign(mergedFields, normalizeFieldErrors(result.error.flatten().fieldErrors));
      } else {
        req.validatedQuery = result.data;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        Object.assign(mergedFields, normalizeFieldErrors(result.error.flatten().fieldErrors));
      } else {
        req.body = result.data;
      }
    }

    if (Object.keys(mergedFields).length > 0) {
      next(new AppError("VALIDATION_ERROR", 400, "Please fix the highlighted fields", mergedFields));
      return;
    }

    next();
  };
}
