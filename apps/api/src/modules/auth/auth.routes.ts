import { Router, type RequestHandler } from "express";
import { loginSchema } from "@cims/shared";
import { validate } from "../../middleware/validate.js";
import type { AuthController } from "./auth.controller.js";

export interface AuthRouterDependencies {
  controller: AuthController;
  requireAuth: RequestHandler;
  loginRateLimiter: RequestHandler;
  refreshRateLimiter: RequestHandler;
}

export function createAuthRouter({
  controller,
  requireAuth,
  loginRateLimiter,
  refreshRateLimiter,
}: AuthRouterDependencies): Router {
  const router = Router();

  router.post("/login", loginRateLimiter, validate({ body: loginSchema }), controller.login);
  router.post("/refresh", refreshRateLimiter, controller.refresh);
  router.post("/logout", requireAuth, controller.logout);
  router.get("/me", requireAuth, controller.me);

  return router;
}
