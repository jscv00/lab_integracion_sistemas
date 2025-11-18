/**
 * Health Check Service Tests
 *
 * Tests for the health check functionality
 */

import { describe, test, expect } from "bun:test";
import { HealthCheckService } from "../../services/HealthCheckService.ts";
import { NotificationService } from "../../services/NotificationService.ts";

describe("HealthCheckService", () => {
  test("should initialize with required parameters", () => {
    const backendUrl = "http://localhost:3001";
    const mongoUrl = "mongodb://localhost:27017";
    const notificationService = new NotificationService();

    const healthCheck = new HealthCheckService(
      backendUrl,
      mongoUrl,
      notificationService
    );

    expect(healthCheck).toBeDefined();
  });

  test("should return health check result with correct structure", async () => {
    const backendUrl = "http://localhost:3001";
    const mongoUrl = "mongodb://localhost:27017";
    const notificationService = new NotificationService();

    const healthCheck = new HealthCheckService(
      backendUrl,
      mongoUrl,
      notificationService
    );

    const result = await healthCheck.checkHealth();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("services");
    expect(result.services).toHaveProperty("postgres");
    expect(result.services).toHaveProperty("mongodb");
    expect(result.services).toHaveProperty("openmeteo");
    expect(result.services).toHaveProperty("twilio");

    // Check that each service has a status
    expect(["ok", "degraded", "error"]).toContain(
      result.services.postgres.status
    );
    expect(["ok", "degraded", "error"]).toContain(
      result.services.mongodb.status
    );
    expect(["ok", "degraded", "error"]).toContain(
      result.services.openmeteo.status
    );
    expect(["ok", "degraded", "error"]).toContain(
      result.services.twilio.status
    );

    // Check overall status
    expect(["healthy", "degraded", "unhealthy"]).toContain(result.status);
  });
});
