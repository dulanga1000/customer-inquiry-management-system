import crypto from "node:crypto";
import type { CookieOptions } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { USER_ROLES, type UserRole } from "@cims/shared";
import { AppError } from "./AppError.js";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export interface AccessTokenPayload {
  id: number;
  role: UserRole;
}

export function signAccessToken(
  userId: number,
  role: UserRole,
  secret: string,
  expiresIn: string,
): string {
  const options: SignOptions = {
    expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
  };
  return jwt.sign({ sub: String(userId), role }, secret, options);
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded !== "object" || decoded === null) {
      throw new AppError("UNAUTHENTICATED", 401, "Invalid access token");
    }

    const rawSub = decoded.sub;
    const rawRole = (decoded as Record<string, unknown>)["role"];
    const id = typeof rawSub === "string" ? Number.parseInt(rawSub, 10) : Number.NaN;

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("UNAUTHENTICATED", 401, "Invalid access token subject");
    }

    if (typeof rawRole !== "string" || !USER_ROLES.includes(rawRole as UserRole)) {
      throw new AppError("UNAUTHENTICATED", 401, "Invalid access token role");
    }

    return { id, role: rawRole as UserRole };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("UNAUTHENTICATED", 401, "Invalid or expired access token");
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function buildAuthCookieOptions(secure: boolean, maxAgeMs?: number): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  };
  if (maxAgeMs !== undefined) {
    options.maxAge = maxAgeMs;
  }
  return options;
}
