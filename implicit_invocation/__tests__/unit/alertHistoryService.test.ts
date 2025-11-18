/**
 * Unit tests for AlertHistoryService
 *
 * Tests MongoDB persistence functionality for weather alerts
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { AlertHistoryService } from "../../services/AlertHistoryService.ts";
import type { Alert } from "../../models/index.ts";

describe("AlertHistoryService", () => {
  let service: AlertHistoryService;
  const mongoUrl =
    process.env.MONGO_URL ||
    "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000";

  beforeAll(async () => {
    service = new AlertHistoryService(mongoUrl);
    await service.initialize();
  });

  afterAll(async () => {
    await service.close();
  });

  test("should connect to MongoDB successfully", () => {
    expect(service.isReady()).toBe(true);
  });

  test("should save alert with createdAt timestamp", async () => {
    const alert: Alert = {
      alertId: `test-alert-${Date.now()}`,
      gardenId: "test-garden-001",
      userId: 999,
      gardenName: "Test Garden",
      timestamp: new Date(),
      alertType: "HIGH_TEMPERATURE",
      metric: "temperature",
      currentValue: 40,
      threshold: 35,
      affectedPlantTypes: ["tomato"],
      affectedPlantNames: ["Test Tomato"],
    };

    const saved = await service.saveAlert(alert);
    expect(saved).toBe(true);

    // Verify it was saved by retrieving it
    const history = await service.getAlertHistory(
      { gardenId: "test-garden-001" },
      1
    );
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]?.alertId).toBe(alert.alertId);
    expect(history[0]?.createdAt).toBeDefined();
  });

  test("should retrieve alerts ordered by timestamp descending", async () => {
    // Create multiple alerts with different timestamps
    const baseTime = Date.now();
    const alerts: Alert[] = [
      {
        alertId: `test-order-1-${baseTime}`,
        gardenId: "test-garden-order",
        userId: 888,
        gardenName: "Order Test Garden",
        timestamp: new Date(baseTime - 2000),
        alertType: "HIGH_TEMPERATURE",
        metric: "temperature",
        currentValue: 38,
        threshold: 35,
        affectedPlantTypes: ["tomato"],
        affectedPlantNames: ["Tomato 1"],
      },
      {
        alertId: `test-order-2-${baseTime}`,
        gardenId: "test-garden-order",
        userId: 888,
        gardenName: "Order Test Garden",
        timestamp: new Date(baseTime),
        alertType: "LOW_TEMPERATURE",
        metric: "temperature",
        currentValue: 5,
        threshold: 8,
        affectedPlantTypes: ["lettuce"],
        affectedPlantNames: ["Lettuce 1"],
      },
      {
        alertId: `test-order-3-${baseTime}`,
        gardenId: "test-garden-order",
        userId: 888,
        gardenName: "Order Test Garden",
        timestamp: new Date(baseTime - 1000),
        alertType: "HEAVY_RAIN",
        metric: "precipitation",
        currentValue: 25,
        threshold: 20,
        affectedPlantTypes: ["carrot"],
        affectedPlantNames: ["Carrot 1"],
      },
    ];

    // Save all alerts
    for (const alert of alerts) {
      await service.saveAlert(alert);
    }

    // Retrieve and verify order (most recent first)
    const history = await service.getAlertHistory(
      { gardenId: "test-garden-order" },
      10
    );
    expect(history.length).toBeGreaterThanOrEqual(3);

    // Check that timestamps are in descending order
    for (let i = 0; i < history.length - 1; i++) {
      const current = new Date(history[i]?.timestamp || 0).getTime();
      const next = new Date(history[i + 1]?.timestamp || 0).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test("should filter alerts by gardenId", async () => {
    const uniqueGardenId = `test-garden-filter-${Date.now()}`;
    const alert: Alert = {
      alertId: `test-filter-${Date.now()}`,
      gardenId: uniqueGardenId,
      userId: 777,
      gardenName: "Filter Test Garden",
      timestamp: new Date(),
      alertType: "STRONG_WIND",
      metric: "windSpeed",
      currentValue: 60,
      threshold: 50,
      affectedPlantTypes: ["pepper"],
      affectedPlantNames: ["Test Pepper"],
    };

    await service.saveAlert(alert);

    const history = await service.getAlertHistory(
      { gardenId: uniqueGardenId },
      10
    );
    expect(history.length).toBeGreaterThan(0);
    history.forEach((a) => {
      expect(a.gardenId).toBe(uniqueGardenId);
    });
  });

  test("should filter alerts by userId", async () => {
    const uniqueUserId = Math.floor(Math.random() * 100000);
    const alert: Alert = {
      alertId: `test-user-filter-${Date.now()}`,
      gardenId: "test-garden-user",
      userId: uniqueUserId,
      gardenName: "User Filter Test Garden",
      timestamp: new Date(),
      alertType: "HIGH_TEMPERATURE",
      metric: "temperature",
      currentValue: 39,
      threshold: 35,
      affectedPlantTypes: ["cucumber"],
      affectedPlantNames: ["Test Cucumber"],
    };

    await service.saveAlert(alert);

    const history = await service.getAlertHistory({ userId: uniqueUserId }, 10);
    expect(history.length).toBeGreaterThan(0);
    history.forEach((a) => {
      expect(a.userId).toBe(uniqueUserId);
    });
  });

  test("should filter alerts by alertType", async () => {
    const uniqueId = Date.now();
    const alert: Alert = {
      alertId: `test-type-filter-${uniqueId}`,
      gardenId: `test-garden-type-${uniqueId}`,
      userId: 666,
      gardenName: "Type Filter Test Garden",
      timestamp: new Date(),
      alertType: "HEAVY_RAIN",
      metric: "precipitation",
      currentValue: 30,
      threshold: 20,
      affectedPlantTypes: ["lettuce"],
      affectedPlantNames: ["Test Lettuce"],
    };

    await service.saveAlert(alert);

    const history = await service.getAlertHistory(
      { gardenId: `test-garden-type-${uniqueId}`, alertType: "HEAVY_RAIN" },
      10
    );
    expect(history.length).toBeGreaterThan(0);
    history.forEach((a) => {
      expect(a.alertType).toBe("HEAVY_RAIN");
    });
  });

  test("should respect limit parameter", async () => {
    const history = await service.getAlertHistory({}, 5);
    expect(history.length).toBeLessThanOrEqual(5);
  });

  test("should handle MongoDB errors gracefully", async () => {
    // Create a service with invalid URL and short timeout
    const invalidService = new AlertHistoryService(
      "mongodb://invalid-host:27017/?serverSelectionTimeoutMS=1000"
    );
    await invalidService.initialize();

    expect(invalidService.isReady()).toBe(false);

    // Should not throw when saving
    const alert: Alert = {
      alertId: "test-error",
      gardenId: "test-garden",
      userId: 1,
      gardenName: "Test",
      timestamp: new Date(),
      alertType: "HIGH_TEMPERATURE",
      metric: "temperature",
      currentValue: 40,
      threshold: 35,
      affectedPlantTypes: [],
      affectedPlantNames: [],
    };

    const saved = await invalidService.saveAlert(alert);
    expect(saved).toBe(false);

    // Should return empty array when retrieving
    const history = await invalidService.getAlertHistory({}, 10);
    expect(history).toEqual([]);

    await invalidService.close();
  });
});
