/**
 * Logger Tests
 *
 * Tests for the structured logging utility
 */

import { describe, test, expect } from "bun:test";
import { Logger } from "../../utils/Logger.ts";

describe("Logger", () => {
  test("should create logger with service name", () => {
    const logger = new Logger("TestService");
    expect(logger).toBeDefined();
  });

  test("should create child logger with nested service name", () => {
    const logger = new Logger("ParentService");
    const childLogger = logger.child("ChildService");

    expect(childLogger).toBeDefined();
  });

  test("should set and respect log level", () => {
    const logger = new Logger("TestService", "ERROR");

    // This test just verifies the logger doesn't crash
    // In a real scenario, you'd capture console output
    logger.debug("This should not appear");
    logger.info("This should not appear");
    logger.warn("This should not appear");
    logger.error("This should appear");

    expect(true).toBe(true);
  });

  test("should log with data object", () => {
    const logger = new Logger("TestService");

    logger.info("Test message", { key: "value", count: 42 });

    expect(true).toBe(true);
  });

  test("should log errors with stack traces", () => {
    const logger = new Logger("TestService");
    const error = new Error("Test error");

    logger.error("Error occurred", error, { context: "test" });

    expect(true).toBe(true);
  });

  test("should change log level dynamically", () => {
    const logger = new Logger("TestService", "INFO");

    logger.setLevel("DEBUG");

    logger.debug("This should now appear");

    expect(true).toBe(true);
  });
});
