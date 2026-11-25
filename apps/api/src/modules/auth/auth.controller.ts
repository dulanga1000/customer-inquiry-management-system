import type { Request, Response } from "express";
import type { LoginInput } from "@cims/shared";
import { AppError } from "../../utils/AppError.js";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildAuthCookieOptions,
} from "../../utils/tokens.js";
import type { AuthService } from "./auth.service.js";

export interface AuthCookieSettings {
  cookieSecure: boolean;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieSettings: AuthCookieSettings,
  ) {}

  private setSessionCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      buildAuthCookieOptions(this.cookieSettings.cookieSecure, this.cookieSettings.accessTokenTtlMs),
    );
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      buildAuthCookieOptions(
        this.cookieSettings.cookieSecure,
        this.cookieSettings.refreshTokenTtlMs,
      ),
    );
  }

  private clearSessionCookies(res: Response): void {
    const clearOpts = buildAuthCookieOptions(this.cookieSettings.cookieSecure);
    res.clearCookie(ACCESS_TOKEN_COOKIE, clearOpts);
    res.clearCookie(REFRESH_TOKEN_COOKIE, clearOpts);
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as LoginInput;
    const session = await this.authService.login(input);
    this.setSessionCookies(res, session.accessToken, session.refreshToken);
    res.status(200).json({ data: { user: session.user } });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    try {
      const session = await this.authService.refresh(rawRefreshToken);
      this.setSessionCookies(res, session.accessToken, session.refreshToken);
      res.status(200).json({ data: { user: session.user } });
    } catch (error) {
      this.clearSessionCookies(res);
      throw error;
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.logout(rawRefreshToken);
    this.clearSessionCookies(res);
    res.status(204).send();
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    const user = await this.authService.getMe(req.user.id);
    res.status(200).json({ data: { user } });
  };
}
