import { Router, type RequestHandler } from "express";
import { createUserSchema } from "@cims/shared";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import type { UserController } from "./user.controller.js";

export interface UsersRouterDependencies {
  controller: UserController;
  requireAuth: RequestHandler;
}

export function createUsersRouter({
  controller,
  requireAuth,
}: UsersRouterDependencies): Router {
  const router = Router();

  router.use(requireAuth, requireRole("admin"));

  router.get("/", controller.list);
  router.post("/", validate({ body: createUserSchema }), controller.create);

  return router;
}
