/**
 * Structured logging module
 *
 * Uses a simple JSON logger that can be replaced with pino in production.
 * For now, we use a lightweight implementation to avoid adding dependencies.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  ventureId?: string;
  [key: string]: unknown;
}

interface Logger {
  debug(context: LogContext, message: string): void;
  info(context: LogContext, message: string): void;
  warn(context: LogContext, message: string): void;
  error(context: LogContext, message: string): void;
  child(context: LogContext): Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL = process.env.LOG_LEVEL ?? "info";
const MIN_LEVEL_NUM = LOG_LEVELS[MIN_LEVEL as LogLevel] ?? LOG_LEVELS.info;

function formatLog(level: LogLevel, context: LogContext, message: string): string {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };
  return JSON.stringify(logEntry);
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL_NUM;
}

function createLogger(baseContext: LogContext = {}): Logger {
  return {
    debug(context: LogContext, message: string) {
      if (shouldLog("debug")) {
        console.log(formatLog("debug", { ...baseContext, ...context }, message));
      }
    },
    info(context: LogContext, message: string) {
      if (shouldLog("info")) {
        console.log(formatLog("info", { ...baseContext, ...context }, message));
      }
    },
    warn(context: LogContext, message: string) {
      if (shouldLog("warn")) {
        console.warn(formatLog("warn", { ...baseContext, ...context }, message));
      }
    },
    error(context: LogContext, message: string) {
      if (shouldLog("error")) {
        console.error(formatLog("error", { ...baseContext, ...context }, message));
      }
    },
    child(context: LogContext): Logger {
      return createLogger({ ...baseContext, ...context });
    },
  };
}

export const logger = createLogger();

export type { Logger, LogContext };
