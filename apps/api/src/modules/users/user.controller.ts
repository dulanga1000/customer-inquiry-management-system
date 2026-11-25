import type { Request, Response } from "express";
import type { CreateUserInput } from "@cims/shared";
import { AppError } from "../../utils/AppError.js";
import type { UserService } from "./user.service.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const users = await this.userService.listUsers();
    res.status(200).json({ data: { users } });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }
    const input = req.body as CreateUserInput;
    const user = await this.userService.createUser(input, req.user.id);
    res.status(201).json({ data: { user } });
  };
}
