/**
 * Logger
 *
 * Structured logging utility with JSON output and multiple log levels.
 * Provides consistent logging format across the application.
 *
 * Requirements: Task 13 - Structured logging
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

export class Logger {
  private service: string;
  private minLevel: LogLevel;

  private levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  constructor(service: string, minLevel: LogLevel = "INFO") {
    this.service = service;
    this.minLevel = minLevel;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log("DEBUG", message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log("INFO", message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log("WARN", message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: Record<string, any>): void {
    const errorData = error
      ? {
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log("ERROR", message, data, errorData);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: { message: string; stack?: string }
  ): void {
    // Check if this log level should be output
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
    };

    if (data) {
      entry.data = data;
    }

    if (error) {
      entry.error = error;
    }

    // Output as JSON
    console.log(JSON.stringify(entry));
  }

  /**
   * Create a child logger with a different service name
   */
  child(serviceName: string): Logger {
    return new Logger(`${this.service}:${serviceName}`, this.minLevel);
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Global logger instance
export const logger = new Logger("WeatherAlerts", "INFO");
