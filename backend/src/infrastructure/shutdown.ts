/**
 * Graceful shutdown handler
 *
 * Handles SIGTERM and SIGINT signals to gracefully close the server,
 * allowing in-flight requests to complete before exiting.
 */

import { Server } from "http";
import { logger } from "./logger";

const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds

export function setupGracefulShutdown(server: Server, onShutdown?: () => Promise<void>): void {
  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      logger.warn({}, `Received ${signal} again, forcing exit`);
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info({ signal }, "Shutdown signal received, closing server...");

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error({ error: err.message }, "Error closing server");
        process.exit(1);
      }

      logger.info({}, "Server closed, cleaning up...");

      // Run custom cleanup if provided
      if (onShutdown) {
        try {
          await onShutdown();
          logger.info({}, "Cleanup complete");
        } catch (cleanupErr) {
          logger.error({ error: String(cleanupErr) }, "Error during cleanup");
        }
      }

      logger.info({}, "Shutdown complete");
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.error({}, "Shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info({}, "Graceful shutdown handlers registered");
}
