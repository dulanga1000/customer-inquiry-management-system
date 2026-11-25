import pino, { type Logger } from "pino";

export function createLogger(level = "info"): Logger {
  return pino({
    level,
    redact: {
      paths: [
        "req.headers.cookie",
        "req.headers.authorization",
        "*.password",
        "*.passwordHash",
        "*.accessToken",
        "*.refreshToken",
      ],
      censor: "[REDACTED]",
    },
  });
}
