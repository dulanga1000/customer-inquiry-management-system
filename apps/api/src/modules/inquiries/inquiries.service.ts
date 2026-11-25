import type { Logger } from "pino";
import type {
  AssignInquiryInput,
  CreateInquiryInput,
  InquiryDetail,
  InquirySummary,
  ListInquiriesQuery,
  PaginationMeta,
  UpdateInquiryStatusInput,
} from "@cims/shared";
import type { AuthenticatedUser } from "../../types/express.js";
import { AppError } from "../../utils/AppError.js";
import { toInquiryDetail, toInquirySummary } from "./inquiries.mapper.js";
import type { InquiryRepository } from "./inquiries.repository.js";
import { getAllowedTransitions, isValidStatusTransition } from "./statusTransitions.js";

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

function normalizeContact(contact: string): string {
  return contact.trim().toLowerCase();
}

function normalizeSubject(subject: string): string {
  return subject.trim().replace(/\s+/g, " ").toLowerCase();
}

export class InquiryService {
  constructor(
    private readonly inquiryRepo: InquiryRepository,
    private readonly logger: Logger,
  ) {}

  async createInquiry(input: CreateInquiryInput, user: AuthenticatedUser): Promise<InquiryDetail> {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const existing = await this.inquiryRepo.findRecentDuplicate(
      normalizeContact(input.contact),
      normalizeSubject(input.subject),
      since,
    );

    if (existing !== null) {
      const canViewExisting =
        user.role === "admin" ||
        existing.createdBy === user.id ||
        existing.assignedTo === user.id;

      this.logger.warn(
        {
          event: "duplicate_inquiry_rejected",
          userId: user.id,
          existingInquiryId: existing.id,
          canViewExisting,
        },
        "Duplicate inquiry rejected",
      );

      const message = canViewExisting
        ? "A duplicate inquiry was already submitted within the last 24 hours."
        : "A duplicate inquiry for this customer was already logged by another team member within the last 24 hours.";

      const meta: Record<string, unknown> = canViewExisting
        ? { canViewExisting: true, existingInquiryId: existing.id }
        : { canViewExisting: false };

      throw new AppError("DUPLICATE_INQUIRY", 409, message, undefined, meta);
    }

    const created = await this.inquiryRepo.createInquiry({
      customerName: input.customerName,
      contact: input.contact,
      subject: input.subject,
      description: input.description,
      createdBy: user.id,
    });

    return toInquiryDetail(created);
  }

  async listInquiries(
    query: ListInquiriesQuery,
    user: AuthenticatedUser,
  ): Promise<{ data: InquirySummary[]; meta: PaginationMeta }> {
    const { items, total } = await this.inquiryRepo.findManyAccessible(user, query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data: items.map(toInquirySummary),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  async getInquiryById(id: number, user: AuthenticatedUser): Promise<InquiryDetail> {
    const inquiry = await this.inquiryRepo.findAccessibleInquiry(id, user);
    if (!inquiry) {
      throw new AppError("NOT_FOUND", 404, "Inquiry not found");
    }
    return toInquiryDetail(inquiry);
  }

  async updateInquiryStatus(
    id: number,
    input: UpdateInquiryStatusInput,
    user: AuthenticatedUser,
  ): Promise<InquiryDetail> {
    const inquiry = await this.inquiryRepo.findAccessibleInquiry(id, user);
    if (!inquiry) {
      throw new AppError("NOT_FOUND", 404, "Inquiry not found");
    }

    if (!isValidStatusTransition(inquiry.status, input.status)) {
      const allowedTransitions = getAllowedTransitions(inquiry.status);
      this.logger.warn(
        {
          event: "invalid_status_transition",
          inquiryId: id,
          userId: user.id,
          fromStatus: inquiry.status,
          toStatus: input.status,
        },
        "Invalid inquiry status transition",
      );
      throw new AppError(
        "INVALID_TRANSITION",
        422,
        `Cannot transition inquiry from '${inquiry.status}' to '${input.status}'. Allowed transitions: ${allowedTransitions.join(", ")}`,
        undefined,
        { allowedTransitions },
      );
    }

    const expectedUpdatedAt = new Date(input.updatedAt);
    const result = await this.inquiryRepo.updateStatusWithOptimisticLock({
      id,
      expectedUpdatedAt,
      fromStatus: inquiry.status,
      toStatus: input.status,
      changedBy: user.id,
    });

    if (result.status === "stale") {
      this.logger.warn(
        { event: "stale_inquiry_update", inquiryId: id, userId: user.id },
        "Stale inquiry status update rejected",
      );
      throw new AppError(
        "STALE_DATA",
        409,
        "This inquiry was changed elsewhere. Reload to see the latest.",
      );
    }

    return toInquiryDetail(result.inquiry);
  }

  async assignInquiry(
    id: number,
    input: AssignInquiryInput,
    user: AuthenticatedUser,
  ): Promise<InquiryDetail> {
    const inquiry = await this.inquiryRepo.findAccessibleInquiry(id, user);
    if (!inquiry) {
      throw new AppError("NOT_FOUND", 404, "Inquiry not found");
    }

    if (input.assignedTo !== null) {
      const targetExists = await this.inquiryRepo.userExists(input.assignedTo);
      if (!targetExists) {
        throw new AppError("NOT_FOUND", 404, "Assignee user not found");
      }
    }

    const result = await this.inquiryRepo.assignWithOptimisticLock({
      id,
      expectedUpdatedAt: new Date(input.updatedAt),
      assignedTo: input.assignedTo,
    });

    if (result.status === "stale") {
      this.logger.warn(
        { event: "stale_inquiry_assign", inquiryId: id, userId: user.id },
        "Stale inquiry assignment rejected",
      );
      throw new AppError(
        "STALE_DATA",
        409,
        "This inquiry was changed elsewhere. Reload to see the latest.",
      );
    }

    this.logger.info(
      {
        event: "inquiry_assigned",
        inquiryId: id,
        actorId: user.id,
        assignedTo: input.assignedTo,
      },
      "Inquiry assignment updated",
    );

    return toInquiryDetail(result.inquiry);
  }
}
