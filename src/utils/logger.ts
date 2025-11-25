/**
 * Logging utilities
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger interface compatible with Astro's logger
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Create a logger instance
 */
export function createLogger(astroLogger?: Logger): Logger {
  if (astroLogger) {
    return astroLogger;
  }

  // Fallback to console
  return {
    debug: (msg: string) => console.debug(`[quarto-loader] ${msg}`),
    info: (msg: string) => console.info(`[quarto-loader] ${msg}`),
    warn: (msg: string) => console.warn(`[quarto-loader] ${msg}`),
    error: (msg: string) => console.error(`[quarto-loader] ${msg}`),
  };
}

/**
 * Performance timing utility
 */
export class Timer {
  private start: number;

  constructor() {
    this.start = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.start;
  }

  log(logger: Logger, message: string): void {
    logger.debug(`${message} (${this.elapsed()}ms)`);
  }
}
