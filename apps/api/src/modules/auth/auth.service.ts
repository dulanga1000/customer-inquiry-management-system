import crypto from "node:crypto";
import type { Logger } from "pino";
import type { AuthUser, LoginInput } from "@cims/shared";
import { AppError } from "../../utils/AppError.js";
import { verifyPassword } from "../../utils/password.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../utils/tokens.js";
import type { AuthRepository, PublicUserRecord } from "./auth.repository.js";

export interface AuthServiceConfig {
  jwtAccessSecret: string;
  accessTokenTtl: string;
  refreshTokenTtlDays: number;
}

export interface AuthSessionResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toAuthUser(record: PublicUserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    createdAt: record.createdAt.toISOString(),
  };
}

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly config: AuthServiceConfig,
    private readonly logger: Logger,
  ) {}

  async login(input: LoginInput): Promise<AuthSessionResult> {
    const user = await this.authRepo.findUserByEmail(input.email);
    if (!user) {
      this.logger.warn({ event: "login_failed", reason: "unknown_email" }, "Login failed");
      throw new AppError("UNAUTHENTICATED", 401, "Invalid email or password");
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      this.logger.warn({ event: "login_failed", userId: user.id }, "Login failed");
      throw new AppError("UNAUTHENTICATED", 401, "Invalid email or password");
    }

    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlDays * MS_PER_DAY);

    await this.authRepo.createRefreshToken({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
    });

    const accessToken = signAccessToken(
      user.id,
      user.role,
      this.config.jwtAccessSecret,
      this.config.accessTokenTtl,
    );

    return {
      user: toAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(rawRefreshToken: string | undefined): Promise<AuthSessionResult> {
    if (!rawRefreshToken) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }

    const presentedHash = hashRefreshToken(rawRefreshToken);
    const nextRefreshToken = generateRefreshToken();
    const nextTokenHash = hashRefreshToken(nextRefreshToken);
    const nextExpiresAt = new Date(Date.now() + this.config.refreshTokenTtlDays * MS_PER_DAY);

    const result = await this.authRepo.rotateRefreshToken(presentedHash, {
      tokenHash: nextTokenHash,
      expiresAt: nextExpiresAt,
    });

    if (result.status === "reused") {
      this.logger.warn(
        {
          event: "refresh_token_reuse_detected",
          userId: result.userId,
          familyId: result.familyId,
        },
        "Refresh token reuse detected; token family revoked",
      );
      throw new AppError("UNAUTHENTICATED", 401, "Refresh token reuse detected");
    }

    if (result.status !== "rotated") {
      throw new AppError("UNAUTHENTICATED", 401, "Invalid or expired refresh token");
    }

    const accessToken = signAccessToken(
      result.user.id,
      result.user.role,
      this.config.jwtAccessSecret,
      this.config.accessTokenTtl,
    );

    return {
      user: toAuthUser(result.user),
      accessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await this.authRepo.revokeRefreshTokenByHash(tokenHash);
  }

  async getMe(userId: number): Promise<AuthUser> {
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    return toAuthUser(user);
  }
}
