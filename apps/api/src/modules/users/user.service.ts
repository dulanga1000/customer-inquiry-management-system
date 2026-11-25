import type { Logger } from "pino";
import type { CreateUserInput, UserSummary } from "@cims/shared";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword } from "../../utils/password.js";
import type { UserRecord, UserRepository } from "./user.repository.js";

function toUserSummary(record: UserRecord): UserSummary {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    createdAt: record.createdAt.toISOString(),
  };
}

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly logger: Logger,
  ) {}

  async listUsers(): Promise<UserSummary[]> {
    const users = await this.userRepo.findAllUsers();
    return users.map(toUserSummary);
  }

  async createUser(input: CreateUserInput, actorId: number): Promise<UserSummary> {
    const existingId = await this.userRepo.findUserIdByEmail(input.email);
    if (existingId !== null) {
      throw new AppError(
        "EMAIL_TAKEN",
        409,
        "An account with this email already exists",
        { email: ["This email is already registered"] },
      );
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const created = await this.userRepo.createUser({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      });

      this.logger.info(
        { event: "user_provisioned", actorId, createdUserId: created.id, role: created.role },
        "Admin provisioned a user account",
      );

      return toUserSummary(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(
          "EMAIL_TAKEN",
          409,
          "An account with this email already exists",
          { email: ["This email is already registered"] },
        );
      }
      throw error;
    }
  }
}
