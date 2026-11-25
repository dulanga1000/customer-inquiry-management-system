import type { Request, Response } from "express";
import type {
  CreateInquiryInput,
  ListInquiriesQuery,
  UpdateInquiryStatusInput,
} from "@cims/shared";
import { AppError } from "../../utils/AppError.js";
import type { InquiryService } from "./inquiries.service.js";

export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    const input = req.body as CreateInquiryInput;
    const inquiry = await this.inquiryService.createInquiry(input, req.user);
    res.status(201).json({ data: { inquiry } });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    const query = req.validatedQuery as ListInquiriesQuery;
    const result = await this.inquiryService.listInquiries(query, req.user);
    res.status(200).json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    const id = Number(req.params["id"]);
    const inquiry = await this.inquiryService.getInquiryById(id, req.user);
    res.status(200).json({ data: { inquiry } });
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    const id = Number(req.params["id"]);
    const input = req.body as UpdateInquiryStatusInput;
    const inquiry = await this.inquiryService.updateInquiryStatus(id, input, req.user);
    res.status(200).json({ data: { inquiry } });
  };
}
