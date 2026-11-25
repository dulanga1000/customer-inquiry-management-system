import type { PrismaClient, Role } from "../../generated/prisma/client.js";

export interface UserAuthRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export interface PublicUserRecord {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export type RotateRefreshTokenResult =
  | { status: "rotated"; user: PublicUserRecord }
  | { status: "reused"; userId: number; familyId: string }
  | { status: "not_found" }
  | { status: "expired" };

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<UserAuthRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findUserById(id: number): Promise<PublicUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async createRefreshToken(input: {
    userId: number;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        familyId: input.familyId,
        expiresAt: input.expiresAt,
      },
    });
  }

  async rotateRefreshToken(
    presentedTokenHash: string,
    nextToken: { tokenHash: string; expiresAt: Date },
  ): Promise<RotateRefreshTokenResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash: presentedTokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
        },
      });

      if (!existing) {
        return { status: "not_found" };
      }

      const now = new Date();

      if (existing.revokedAt !== null) {
        // Reuse detected: revoke the entire token family inside this committed transaction.
        await tx.refreshToken.updateMany({
          where: { familyId: existing.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return {
          status: "reused",
          userId: existing.userId,
          familyId: existing.familyId,
        };
      }

      if (existing.expiresAt <= now) {
        await tx.refreshToken.updateMany({
          where: { id: existing.id, revokedAt: null },
          data: { revokedAt: now },
        });
        return { status: "expired" };
      }

      const revoked = await tx.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (revoked.count === 0) {
        await tx.refreshToken.updateMany({
          where: { familyId: existing.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return {
          status: "reused",
          userId: existing.userId,
          familyId: existing.familyId,
        };
      }

      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: nextToken.tokenHash,
          familyId: existing.familyId,
          expiresAt: nextToken.expiresAt,
        },
      });

      return {
        status: "rotated",
        user: existing.user,
      };
    });
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
