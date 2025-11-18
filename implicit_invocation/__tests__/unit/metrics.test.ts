/**
 * Metrics Service Tests
 *
 * Tests for the metrics tracking functionality
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { MetricsService } from "../../services/MetricsService.ts";

describe("MetricsService", () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
  });

  test("should initialize with zero metrics", () => {
    const metrics = metricsService.getMetrics();

    expect(metrics.alerts.HIGH_TEMPERATURE).toBe(0);
    expect(metrics.alerts.LOW_TEMPERATURE).toBe(0);
    expect(metrics.alerts.HEAVY_RAIN).toBe(0);
    expect(metrics.alerts.STRONG_WIND).toBe(0);
    expect(metrics.sms.sent).toBe(0);
    expect(metrics.sms.failed).toBe(0);
    expect(metrics.sms.successRate).toBe(0);
  });

  test("should record alert counts", () => {
    metricsService.recordAlert("HIGH_TEMPERATURE");
    metricsService.recordAlert("HIGH_TEMPERATURE");
    metricsService.recordAlert("LOW_TEMPERATURE");

    const metrics = metricsService.getMetrics();

    expect(metrics.alerts.HIGH_TEMPERATURE).toBe(2);
    expect(metrics.alerts.LOW_TEMPERATURE).toBe(1);
    expect(metrics.alerts.HEAVY_RAIN).toBe(0);
    expect(metrics.alerts.STRONG_WIND).toBe(0);
  });

  test("should record SMS success and failure", () => {
    metricsService.recordSMSSuccess();
    metricsService.recordSMSSuccess();
    metricsService.recordSMSFailure();

    const metrics = metricsService.getMetrics();

    expect(metrics.sms.sent).toBe(2);
    expect(metrics.sms.failed).toBe(1);
    expect(metrics.sms.successRate).toBeCloseTo(0.67, 1);
  });

  test("should calculate SMS success rate correctly", () => {
    metricsService.recordSMSSuccess();
    metricsService.recordSMSSuccess();
    metricsService.recordSMSSuccess();
    metricsService.recordSMSSuccess();
    metricsService.recordSMSFailure();

    const metrics = metricsService.getMetrics();

    expect(metrics.sms.successRate).toBe(0.8);
  });

  test("should record API latencies", () => {
    metricsService.recordOpenMeteoLatency(100);
    metricsService.recordOpenMeteoLatency(200);
    metricsService.recordOpenMeteoLatency(150);

    metricsService.recordBackendLatency(50);
    metricsService.recordBackendLatency(75);

    const metrics = metricsService.getMetrics();

    expect(metrics.apiLatency.openmeteo.count).toBe(3);
    expect(metrics.apiLatency.openmeteo.averageLatency).toBe(150);
    expect(metrics.apiLatency.openmeteo.minLatency).toBe(100);
    expect(metrics.apiLatency.openmeteo.maxLatency).toBe(200);

    expect(metrics.apiLatency.backend.count).toBe(2);
    expect(metrics.apiLatency.backend.averageLatency).toBe(62.5);
    expect(metrics.apiLatency.backend.minLatency).toBe(50);
    expect(metrics.apiLatency.backend.maxLatency).toBe(75);
  });

  test("should track uptime", async () => {
    const metrics1 = metricsService.getMetrics();
    expect(metrics1.uptime).toBeGreaterThanOrEqual(0);

    // Wait a bit longer to ensure uptime increases
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const metrics2 = metricsService.getMetrics();
    expect(metrics2.uptime).toBeGreaterThan(metrics1.uptime);
  });

  test("should reset all metrics", () => {
    metricsService.recordAlert("HIGH_TEMPERATURE");
    metricsService.recordSMSSuccess();
    metricsService.recordOpenMeteoLatency(100);

    metricsService.reset();

    const metrics = metricsService.getMetrics();

    expect(metrics.alerts.HIGH_TEMPERATURE).toBe(0);
    expect(metrics.sms.sent).toBe(0);
    expect(metrics.apiLatency.openmeteo.count).toBe(0);
  });

  test("should limit latency history to 100 entries", () => {
    // Record 150 latencies
    for (let i = 0; i < 150; i++) {
      metricsService.recordOpenMeteoLatency(100 + i);
    }

    const metrics = metricsService.getMetrics();

    // Should only keep last 100
    expect(metrics.apiLatency.openmeteo.count).toBe(100);
  });
});
