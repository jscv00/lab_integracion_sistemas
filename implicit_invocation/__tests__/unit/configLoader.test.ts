/**
 * Unit Tests for ConfigLoader
 *
 * Tests configuration loading, validation, and error handling
 */

import { describe, test, expect } from "bun:test";
import { ConfigLoader } from "../../services/ConfigLoader.ts";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

const TEST_CONFIG_DIR = "./test-config-temp";

describe("ConfigLoader", () => {
  // Helper to create test config directory
  const setupTestDir = () => {
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
    mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  };

  // Helper to cleanup test config directory
  const cleanupTestDir = () => {
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  };

  describe("loadGardens", () => {
    test("should load valid gardens configuration", () => {
      setupTestDir();

      const validConfig = {
        gardens: [
          {
            gardenId: "test-001",
            userId: 1,
            name: "Test Garden",
            latitude: 40.4168,
            longitude: -3.7038,
          },
        ],
      };

      writeFileSync(
        join(TEST_CONFIG_DIR, "gardens.config.json"),
        JSON.stringify(validConfig)
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);
      const gardens = loader.loadGardens();

      expect(gardens).toHaveLength(1);
      expect(gardens[0]?.gardenId).toBe("test-001");
      expect(gardens[0]?.userId).toBe(1);
      expect(gardens[0]?.name).toBe("Test Garden");
      expect(gardens[0]?.latitude).toBe(40.4168);
      expect(gardens[0]?.longitude).toBe(-3.7038);

      cleanupTestDir();
    });

    test("should throw error when gardens.config.json has invalid JSON", () => {
      setupTestDir();

      writeFileSync(
        join(TEST_CONFIG_DIR, "gardens.config.json"),
        "{ invalid json }"
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);

      expect(() => loader.loadGardens()).toThrow(/Invalid JSON format/);

      cleanupTestDir();
    });

    test("should throw error when gardens.config.json is missing", () => {
      setupTestDir();

      const loader = new ConfigLoader(TEST_CONFIG_DIR);

      expect(() => loader.loadGardens()).toThrow(/not found/);

      cleanupTestDir();
    });

    test("should throw error when gardens array is missing", () => {
      setupTestDir();

      writeFileSync(
        join(TEST_CONFIG_DIR, "gardens.config.json"),
        JSON.stringify({ notGardens: [] })
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);

      expect(() => loader.loadGardens()).toThrow(/missing 'gardens' array/);

      cleanupTestDir();
    });

    test("should throw error when garden is missing required fields", () => {
      setupTestDir();

      const invalidConfig = {
        gardens: [
          {
            gardenId: "test-001",
            // missing userId, name, latitude, longitude
          },
        ],
      };

      writeFileSync(
        join(TEST_CONFIG_DIR, "gardens.config.json"),
        JSON.stringify(invalidConfig)
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);

      expect(() => loader.loadGardens()).toThrow(/missing required field/);

      cleanupTestDir();
    });
  });

  describe("loadSensitivityProfiles", () => {
    test("should load valid sensitivity profiles", () => {
      setupTestDir();

      const validProfiles = {
        profiles: {
          tomato: {
            plantType: "tomato",
            maxTemperature: 35,
            minTemperature: 10,
            maxPrecipitation: 20,
            maxWindSpeed: 50,
          },
          default: {
            plantType: "default",
            maxTemperature: 30,
            minTemperature: 8,
            maxPrecipitation: 18,
            maxWindSpeed: 45,
          },
        },
      };

      writeFileSync(
        join(TEST_CONFIG_DIR, "plant-sensitivity-profiles.json"),
        JSON.stringify(validProfiles)
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);
      const profiles = loader.loadSensitivityProfiles();

      expect(profiles.size).toBe(2);
      expect(profiles.get("tomato")?.maxTemperature).toBe(35);
      expect(profiles.get("default")?.maxTemperature).toBe(30);

      cleanupTestDir();
    });

    test("should throw error when plant-sensitivity-profiles.json has invalid JSON", () => {
      setupTestDir();

      writeFileSync(
        join(TEST_CONFIG_DIR, "plant-sensitivity-profiles.json"),
        "{ invalid json }"
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);

      expect(() => loader.loadSensitivityProfiles()).toThrow(
        /Invalid JSON format/
      );

      cleanupTestDir();
    });

    test("should throw error when default profile is missing", () => {
      setupTestDir();

      const invalidProfiles = {
        profiles: {
          tomato: {
            plantType: "tomato",
            maxTemperature: 35,
            minTemperature: 10,
            maxPrecipitation: 20,
            maxWindSpeed: 50,
          },
          // missing default profile
        },
      };

      writeFileSync(
        join(TEST_CONFIG_DIR, "plant-sensitivity-profiles.json"),
        JSON.stringify(invalidProfiles)
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);

      expect(() => loader.loadSensitivityProfiles()).toThrow(
        /missing 'default' profile/
      );

      cleanupTestDir();
    });
  });

  describe("getProfileForPlantType", () => {
    test("should return specific profile when plant type exists", () => {
      setupTestDir();

      const validProfiles = {
        profiles: {
          tomato: {
            plantType: "tomato",
            maxTemperature: 35,
            minTemperature: 10,
            maxPrecipitation: 20,
            maxWindSpeed: 50,
          },
          default: {
            plantType: "default",
            maxTemperature: 30,
            minTemperature: 8,
            maxPrecipitation: 18,
            maxWindSpeed: 45,
          },
        },
      };

      writeFileSync(
        join(TEST_CONFIG_DIR, "plant-sensitivity-profiles.json"),
        JSON.stringify(validProfiles)
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);
      const profiles = loader.loadSensitivityProfiles();
      const profile = loader.getProfileForPlantType("tomato", profiles);

      expect(profile.plantType).toBe("tomato");
      expect(profile.maxTemperature).toBe(35);

      cleanupTestDir();
    });

    test("should return default profile when plant type does not exist", () => {
      setupTestDir();

      const validProfiles = {
        profiles: {
          tomato: {
            plantType: "tomato",
            maxTemperature: 35,
            minTemperature: 10,
            maxPrecipitation: 20,
            maxWindSpeed: 50,
          },
          default: {
            plantType: "default",
            maxTemperature: 30,
            minTemperature: 8,
            maxPrecipitation: 18,
            maxWindSpeed: 45,
          },
        },
      };

      writeFileSync(
        join(TEST_CONFIG_DIR, "plant-sensitivity-profiles.json"),
        JSON.stringify(validProfiles)
      );

      const loader = new ConfigLoader(TEST_CONFIG_DIR);
      const profiles = loader.loadSensitivityProfiles();
      const profile = loader.getProfileForPlantType("unknown-plant", profiles);

      expect(profile.plantType).toBe("default");
      expect(profile.maxTemperature).toBe(30);

      cleanupTestDir();
    });
  });
});
