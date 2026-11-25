export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly fields?: Record<string, string[]>;
  public readonly meta?: Record<string, unknown>;

  constructor(
    code: string,
    status: number,
    message: string,
    fields?: Record<string, string[]>,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    if (fields !== undefined) {
      this.fields = fields;
    }
    if (meta !== undefined) {
      this.meta = meta;
    }
  }
}
