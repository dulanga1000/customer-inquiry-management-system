import { Router, type RequestHandler } from "express";
import {
  assignInquirySchema,
  createInquirySchema,
  inquiryIdParamSchema,
  listInquiriesQuerySchema,
  updateInquiryStatusSchema,
} from "@cims/shared";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import type { InquiryController } from "./inquiries.controller.js";

export interface InquiriesRouterDependencies {
  controller: InquiryController;
  requireAuth: RequestHandler;
}

export function createInquiriesRouter({
  controller,
  requireAuth,
}: InquiriesRouterDependencies): Router {
  const router = Router();

  router.use(requireAuth);

  router.get("/", validate({ query: listInquiriesQuerySchema }), controller.list);
  router.post("/", validate({ body: createInquirySchema }), controller.create);
  router.get("/:id", validate({ params: inquiryIdParamSchema }), controller.getById);
  router.patch(
    "/:id/status",
    validate({ params: inquiryIdParamSchema, body: updateInquiryStatusSchema }),
    controller.updateStatus,
  );
  router.patch(
    "/:id/assign",
    requireRole("admin"),
    validate({ params: inquiryIdParamSchema, body: assignInquirySchema }),
    controller.assign,
  );

  return router;
}
