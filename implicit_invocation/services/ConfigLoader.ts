/**
 * ConfigLoader Service
 *
 * Responsible for loading and validating configuration files:
 * - gardens.config.json: List of gardens to monitor
 * - plant-sensitivity-profiles.json: Climate sensitivity profiles for plant types
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Garden, SensitivityProfile } from "../models/index.ts";

export class ConfigLoader {
  private configDir: string;

  constructor(configDir: string = "./config") {
    this.configDir = configDir;
  }

  /**
   * Load gardens configuration from gardens.config.json
   * Requirements: 3.1, 3.2, 3.3
   *
   * @returns Array of Garden objects
   * @throws Error if file doesn't exist, has invalid JSON, or invalid structure
   */
  loadGardens(): Garden[] {
    const filePath = join(this.configDir, "gardens.config.json");

    // Check if file exists
    if (!existsSync(filePath)) {
      const error = `Gardens config file not found at ${filePath}`;
      console.error(`[ConfigLoader] ERROR: ${error}`);
      throw new Error(error);
    }

    try {
      // Read and parse JSON
      const fileContent = readFileSync(filePath, "utf-8");
      const data = JSON.parse(fileContent);

      // Validate structure
      if (!data.gardens || !Array.isArray(data.gardens)) {
        const error = "Invalid gardens.config.json: missing 'gardens' array";
        console.error(`[ConfigLoader] ERROR: ${error}`);
        throw new Error(error);
      }

      // Validate each garden
      const gardens: Garden[] = [];
      for (let i = 0; i < data.gardens.length; i++) {
        const garden = data.gardens[i];
        this.validateGarden(garden, i);
        gardens.push(garden);
      }

      console.log(
        `[ConfigLoader] Successfully loaded ${gardens.length} gardens`
      );
      return gardens;
    } catch (error) {
      if (error instanceof SyntaxError) {
        const jsonError = `Invalid JSON format in gardens.config.json: ${error.message}`;
        console.error(`[ConfigLoader] ERROR: ${jsonError}`);
        throw new Error(jsonError);
      }
      throw error;
    }
  }

  /**
   * Load plant sensitivity profiles from plant-sensitivity-profiles.json
   * Requirements: 2.1, 2.2, 2.3
   *
   * @returns Map of plant type to SensitivityProfile
   * @throws Error if file doesn't exist, has invalid JSON, or invalid structure
   */
  loadSensitivityProfiles(): Map<string, SensitivityProfile> {
    const filePath = join(this.configDir, "plant-sensitivity-profiles.json");

    // Check if file exists
    if (!existsSync(filePath)) {
      const error = `Sensitivity profiles file not found at ${filePath}`;
      console.error(`[ConfigLoader] ERROR: ${error}`);
      throw new Error(error);
    }

    try {
      // Read and parse JSON
      const fileContent = readFileSync(filePath, "utf-8");
      const data = JSON.parse(fileContent);

      // Validate structure
      if (!data.profiles || typeof data.profiles !== "object") {
        const error =
          "Invalid plant-sensitivity-profiles.json: missing 'profiles' object";
        console.error(`[ConfigLoader] ERROR: ${error}`);
        throw new Error(error);
      }

      // Validate each profile and build map
      const profilesMap = new Map<string, SensitivityProfile>();
      for (const [plantType, profile] of Object.entries(data.profiles)) {
        this.validateSensitivityProfile(profile as any, plantType);
        profilesMap.set(plantType, profile as SensitivityProfile);
      }

      // Ensure default profile exists
      if (!profilesMap.has("default")) {
        const error =
          "Invalid plant-sensitivity-profiles.json: missing 'default' profile";
        console.error(`[ConfigLoader] ERROR: ${error}`);
        throw new Error(error);
      }

      console.log(
        `[ConfigLoader] Successfully loaded ${profilesMap.size} sensitivity profiles`
      );
      return profilesMap;
    } catch (error) {
      if (error instanceof SyntaxError) {
        const jsonError = `Invalid JSON format in plant-sensitivity-profiles.json: ${error.message}`;
        console.error(`[ConfigLoader] ERROR: ${jsonError}`);
        throw new Error(jsonError);
      }
      throw error;
    }
  }

  /**
   * Get sensitivity profile for a plant type with fallback to default
   * Requirements: 2.3
   *
   * @param plantType The type of plant
   * @param profiles Map of all loaded profiles
   * @returns SensitivityProfile for the plant type or default profile
   */
  getProfileForPlantType(
    plantType: string,
    profiles: Map<string, SensitivityProfile>
  ): SensitivityProfile {
    const profile = profiles.get(plantType);
    if (profile) {
      return profile;
    }

    // Fallback to default profile
    console.log(
      `[ConfigLoader] Plant type '${plantType}' not found, using default profile`
    );
    const defaultProfile = profiles.get("default");
    if (!defaultProfile) {
      throw new Error("Default profile not found in loaded profiles");
    }
    return defaultProfile;
  }

  /**
   * Validate a garden object structure
   * Requirements: 3.2
   */
  private validateGarden(garden: any, index: number): void {
    const requiredFields = [
      "gardenId",
      "userId",
      "name",
      "latitude",
      "longitude",
    ];

    for (const field of requiredFields) {
      if (!(field in garden)) {
        throw new Error(
          `Garden at index ${index} missing required field: ${field}`
        );
      }
    }

    // Validate types
    if (typeof garden.gardenId !== "string") {
      throw new Error(`Garden at index ${index}: gardenId must be a string`);
    }
    if (typeof garden.userId !== "number") {
      throw new Error(`Garden at index ${index}: userId must be a number`);
    }
    if (typeof garden.name !== "string") {
      throw new Error(`Garden at index ${index}: name must be a string`);
    }
    if (typeof garden.latitude !== "number") {
      throw new Error(`Garden at index ${index}: latitude must be a number`);
    }
    if (typeof garden.longitude !== "number") {
      throw new Error(`Garden at index ${index}: longitude must be a number`);
    }

    // Validate coordinate ranges
    if (garden.latitude < -90 || garden.latitude > 90) {
      throw new Error(
        `Garden at index ${index}: latitude must be between -90 and 90`
      );
    }
    if (garden.longitude < -180 || garden.longitude > 180) {
      throw new Error(
        `Garden at index ${index}: longitude must be between -180 and 180`
      );
    }
  }

  /**
   * Validate a sensitivity profile structure
   * Requirements: 2.2
   */
  private validateSensitivityProfile(profile: any, plantType: string): void {
    const requiredFields = [
      "plantType",
      "maxTemperature",
      "minTemperature",
      "maxPrecipitation",
      "maxWindSpeed",
    ];

    for (const field of requiredFields) {
      if (!(field in profile)) {
        throw new Error(
          `Profile '${plantType}' missing required field: ${field}`
        );
      }
    }

    // Validate types
    if (typeof profile.plantType !== "string") {
      throw new Error(`Profile '${plantType}': plantType must be a string`);
    }
    if (typeof profile.maxTemperature !== "number") {
      throw new Error(
        `Profile '${plantType}': maxTemperature must be a number`
      );
    }
    if (typeof profile.minTemperature !== "number") {
      throw new Error(
        `Profile '${plantType}': minTemperature must be a number`
      );
    }
    if (typeof profile.maxPrecipitation !== "number") {
      throw new Error(
        `Profile '${plantType}': maxPrecipitation must be a number`
      );
    }
    if (typeof profile.maxWindSpeed !== "number") {
      throw new Error(`Profile '${plantType}': maxWindSpeed must be a number`);
    }

    // Validate logical constraints
    if (profile.minTemperature >= profile.maxTemperature) {
      throw new Error(
        `Profile '${plantType}': minTemperature must be less than maxTemperature`
      );
    }
  }
}
