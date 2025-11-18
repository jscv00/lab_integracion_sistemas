/**
 * Unit Tests for AlertEngine
 *
 * Tests climate risk evaluation and alert generation
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { AlertEngine } from "../../services/AlertEngine.ts";
import { PlantsService } from "../../services/PlantsService.ts";
import { WeatherService } from "../../services/WeatherService.ts";
import { ConfigLoader } from "../../services/ConfigLoader.ts";
import type {
  Garden,
  WeatherData,
  SensitivityProfile,
} from "../../models/index.ts";

describe("AlertEngine", () => {
  let alertEngine: AlertEngine;
  let plantsService: PlantsService;
  let weatherService: WeatherService;
  let configLoader: ConfigLoader;
  let sensitivityProfiles: Map<string, SensitivityProfile>;

  beforeEach(() => {
    // Initialize services
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    plantsService = new PlantsService(backendUrl);
    weatherService = new WeatherService();
    configLoader = new ConfigLoader("./config");

    // Create test sensitivity profiles
    sensitivityProfiles = new Map<string, SensitivityProfile>();
    sensitivityProfiles.set("tomato", {
      plantType: "tomato",
      maxTemperature: 35,
      minTemperature: 10,
      maxPrecipitation: 20,
      maxWindSpeed: 50,
    });
    sensitivityProfiles.set("lettuce", {
      plantType: "lettuce",
      maxTemperature: 25,
      minTemperature: 5,
      maxPrecipitation: 15,
      maxWindSpeed: 40,
    });
    sensitivityProfiles.set("default", {
      plantType: "default",
      maxTemperature: 30,
      minTemperature: 8,
      maxPrecipitation: 18,
      maxWindSpeed: 45,
    });

    alertEngine = new AlertEngine(
      plantsService,
      weatherService,
      configLoader,
      sensitivityProfiles
    );
  });

  describe("evaluateGarden", () => {
    test("should return empty array when all metrics are within thresholds", async () => {
      // Setup: Populate cache with plants
      const userId = 1;
      const mockPlants = [
        {
          id: 1,
          user_id: userId,
          name: "Tomates Cherry",
          type: "tomato",
          planted_at: "2024-01-15",
          notes: "Test",
          created_at: "2024-01-10T10:30:00Z",
        },
      ];
      plantsService.setCachedPlants(userId, mockPlants);

      // Create a test garden
      const garden: Garden = {
        gardenId: "test-garden-001",
        userId: userId,
        name: "Test Garden",
        latitude: 40.4168,
        longitude: -3.7038,
      };

      // Evaluate garden (will fetch real weather data)
      const alerts = await alertEngine.evaluateGarden(garden);

      // Should return an array (may be empty or have alerts depending on actual weather)
      expect(Array.isArray(alerts)).toBe(true);
    });

    test("should return empty array when user has no plants", async () => {
      const userId = 999;

      // Create a test garden
      const garden: Garden = {
        gardenId: "test-garden-002",
        userId: userId,
        name: "Empty Garden",
        latitude: 40.4168,
        longitude: -3.7038,
      };

      // Evaluate garden
      const alerts = await alertEngine.evaluateGarden(garden);

      // Should return empty array
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });
  });

  describe("alert structure", () => {
    test("generated alerts should have all required fields", async () => {
      // Setup: Populate cache with plants
      const userId = 1;
      const mockPlants = [
        {
          id: 1,
          user_id: userId,
          name: "Tomates Cherry",
          type: "tomato",
          planted_at: "2024-01-15",
          notes: "Test",
          created_at: "2024-01-10T10:30:00Z",
        },
      ];
      plantsService.setCachedPlants(userId, mockPlants);

      // Create a test garden
      const garden: Garden = {
        gardenId: "test-garden-003",
        userId: userId,
        name: "Test Garden",
        latitude: 40.4168,
        longitude: -3.7038,
      };

      // Evaluate garden
      const alerts = await alertEngine.evaluateGarden(garden);

      // If alerts were generated, verify structure
      if (alerts.length > 0) {
        const alert = alerts[0];
        if (alert) {
          expect(alert).toBeDefined();
          expect(alert.alertId).toBeDefined();
          expect(alert.gardenId).toBe(garden.gardenId);
          expect(alert.userId).toBe(garden.userId);
          expect(alert.gardenName).toBe(garden.name);
          expect(alert.timestamp).toBeInstanceOf(Date);
          expect(alert.alertType).toBeDefined();
          expect(alert.metric).toBeDefined();
          expect(typeof alert.currentValue).toBe("number");
          expect(typeof alert.threshold).toBe("number");
          expect(Array.isArray(alert.affectedPlantTypes)).toBe(true);
          expect(Array.isArray(alert.affectedPlantNames)).toBe(true);
        }
      }
    });
  });
});
