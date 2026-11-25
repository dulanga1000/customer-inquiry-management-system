import type { InquiryStatus } from "@cims/shared";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { InquiryDetailRow, InquirySummaryRow } from "./inquiries.mapper.js";

const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

const INQUIRY_DETAIL_INCLUDE = {
  creator: { select: USER_SUMMARY_SELECT },
  assignee: { select: USER_SUMMARY_SELECT },
  statusHistory: {
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    include: {
      changer: { select: USER_SUMMARY_SELECT },
    },
  },
} satisfies Prisma.InquiryInclude;

const INQUIRY_SUMMARY_INCLUDE = {
  creator: { select: USER_SUMMARY_SELECT },
  assignee: { select: USER_SUMMARY_SELECT },
} satisfies Prisma.InquiryInclude;

export type UpdateStatusLockResult =
  | { status: "updated"; inquiry: InquiryDetailRow }
  | { status: "stale" };

export class InquiryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAccessibleInquiry(
    id: number,
    user: AuthenticatedUser,
  ): Promise<InquiryDetailRow | null> {
    const where: Prisma.InquiryWhereInput =
      user.role === "admin"
        ? { id }
        : {
            id,
            OR: [{ createdBy: user.id }, { assignedTo: user.id }],
          };

    return this.prisma.inquiry.findFirst({
      where,
      include: INQUIRY_DETAIL_INCLUDE,
    });
  }

  async findRecentDuplicateId(
    userId: number,
    normalizedContact: string,
    normalizedSubject: string,
    since: Date,
  ): Promise<number | null> {
    const candidates = await this.prisma.inquiry.findMany({
      where: {
        createdBy: userId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        contact: true,
        subject: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const match = candidates.find(
      (item) =>
        item.contact.trim().toLowerCase() === normalizedContact &&
        item.subject.trim().replace(/\s+/g, " ").toLowerCase() === normalizedSubject,
    );

    return match ? match.id : null;
  }

  async createInquiry(input: {
    customerName: string;
    contact: string;
    subject: string;
    description: string;
    createdBy: number;
  }): Promise<InquiryDetailRow> {
    return this.prisma.inquiry.create({
      data: {
        customerName: input.customerName,
        contact: input.contact,
        subject: input.subject,
        description: input.description,
        status: "new",
        createdBy: input.createdBy,
      },
      include: INQUIRY_DETAIL_INCLUDE,
    });
  }

  async findManyAccessible(
    user: AuthenticatedUser,
    filters: {
      status?: InquiryStatus | undefined;
      q?: string | undefined;
      page: number;
      limit: number;
    },
  ): Promise<{ items: InquirySummaryRow[]; total: number }> {
    const andClauses: Prisma.InquiryWhereInput[] = [];

    if (user.role !== "admin") {
      andClauses.push({
        OR: [{ createdBy: user.id }, { assignedTo: user.id }],
      });
    }

    if (filters.status !== undefined) {
      andClauses.push({ status: filters.status });
    }

    if (filters.q !== undefined) {
      andClauses.push({
        OR: [
          { customerName: { contains: filters.q, mode: "insensitive" } },
          { subject: { contains: filters.q, mode: "insensitive" } },
          { contact: { contains: filters.q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.InquiryWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};
    const skip = (filters.page - 1) * filters.limit;

    const [total, items] = await Promise.all([
      this.prisma.inquiry.count({ where }),
      this.prisma.inquiry.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: filters.limit,
        include: INQUIRY_SUMMARY_INCLUDE,
      }),
    ]);

    return { items, total };
  }

  async updateStatusWithOptimisticLock(input: {
    id: number;
    expectedUpdatedAt: Date;
    fromStatus: InquiryStatus;
    toStatus: InquiryStatus;
    changedBy: number;
  }): Promise<UpdateStatusLockResult> {
    return this.prisma.$transaction(async (tx) => {
      // Advance updatedAt by at least 1ms so rapid sequential updates never share a timestamp
      const nextUpdatedAt = new Date(
        Math.max(Date.now(), input.expectedUpdatedAt.getTime() + 1),
      );

      const updated = await tx.inquiry.updateMany({
        where: {
          id: input.id,
          updatedAt: input.expectedUpdatedAt,
        },
        data: {
          status: input.toStatus,
          updatedAt: nextUpdatedAt,
        },
      });

      if (updated.count === 0) {
        return { status: "stale" };
      }

      await tx.statusHistory.create({
        data: {
          inquiryId: input.id,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          changedBy: input.changedBy,
        },
      });

      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id: input.id },
        include: INQUIRY_DETAIL_INCLUDE,
      });

      return { status: "updated", inquiry };
    });
  }
}
