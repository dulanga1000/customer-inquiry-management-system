import type { PrismaClient, Role } from "../../generated/prisma/client.js";

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllUsers(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: USER_PUBLIC_SELECT,
    });
  }

  async findUserIdByEmail(email: string): Promise<number | null> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return existing ? existing.id : null;
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
      },
      select: USER_PUBLIC_SELECT,
    });
  }
}
