import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "../utils/tokens.js";

export function createRequireAuth(jwtSecret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      next(new AppError("UNAUTHENTICATED", 401, "Authentication required"));
      return;
    }

    try {
      req.user = verifyAccessToken(token, jwtSecret);
      next();
    } catch (error) {
      next(error);
    }
  };
}
