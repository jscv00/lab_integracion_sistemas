/**
 * Integration Tests for ConfigLoader with actual config files
 *
 * Tests that ConfigLoader works with the real configuration files
 */

import { describe, test, expect } from "bun:test";
import { ConfigLoader } from "../../services/ConfigLoader.ts";

describe("ConfigLoader - Integration with actual config files", () => {
  test("should load actual gardens.config.json", () => {
    const loader = new ConfigLoader("./config");
    const gardens = loader.loadGardens();

    expect(gardens.length).toBeGreaterThan(0);

    // Verify structure of first garden
    const firstGarden = gardens[0];
    expect(firstGarden).toBeDefined();
    expect(typeof firstGarden?.gardenId).toBe("string");
    expect(typeof firstGarden?.userId).toBe("number");
    expect(typeof firstGarden?.name).toBe("string");
    expect(typeof firstGarden?.latitude).toBe("number");
    expect(typeof firstGarden?.longitude).toBe("number");
  });

  test("should load actual plant-sensitivity-profiles.json", () => {
    const loader = new ConfigLoader("./config");
    const profiles = loader.loadSensitivityProfiles();

    expect(profiles.size).toBeGreaterThan(0);

    // Verify default profile exists
    const defaultProfile = profiles.get("default");
    expect(defaultProfile).toBeDefined();
    expect(defaultProfile?.plantType).toBe("default");
    expect(typeof defaultProfile?.maxTemperature).toBe("number");
    expect(typeof defaultProfile?.minTemperature).toBe("number");
    expect(typeof defaultProfile?.maxPrecipitation).toBe("number");
    expect(typeof defaultProfile?.maxWindSpeed).toBe("number");

    // Verify some specific profiles exist
    expect(profiles.has("tomato")).toBe(true);
    expect(profiles.has("lettuce")).toBe(true);
    expect(profiles.has("carrot")).toBe(true);
  });

  test("should use default profile for unknown plant type", () => {
    const loader = new ConfigLoader("./config");
    const profiles = loader.loadSensitivityProfiles();

    const unknownProfile = loader.getProfileForPlantType(
      "unknown-exotic-plant",
      profiles
    );
    const defaultProfile = profiles.get("default");

    expect(unknownProfile).toEqual(defaultProfile);
  });
});
