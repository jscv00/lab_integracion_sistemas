/**
 * AlertEngine
 *
 * Responsible for evaluating climate risks by comparing weather data
 * against plant sensitivity profiles and generating alerts when thresholds are exceeded.
 *
 * Requirements: 5.3, 5.4, 5.5, 5.6
 */

import type {
  Garden,
  WeatherData,
  SensitivityProfile,
  Alert,
  AlertType,
} from "../models/index.ts";
import type { PlantsService } from "./PlantsService.ts";
import type { WeatherService } from "./WeatherService.ts";
import { ConfigLoader } from "./ConfigLoader.ts";

export class AlertEngine {
  private plantsService: PlantsService;
  private weatherService: WeatherService;
  private configLoader: ConfigLoader;
  private sensitivityProfiles: Map<string, SensitivityProfile>;

  constructor(
    plantsService: PlantsService,
    weatherService: WeatherService,
    configLoader: ConfigLoader,
    sensitivityProfiles: Map<string, SensitivityProfile>
  ) {
    this.plantsService = plantsService;
    this.weatherService = weatherService;
    this.configLoader = configLoader;
    this.sensitivityProfiles = sensitivityProfiles;
  }

  /**
   * Evaluate a garden for climate risks and generate alerts
   * Requirements: 5.3, 5.4, 5.5, 5.6
   *
   * @param garden The garden to evaluate
   * @param recordWeatherLatency Optional callback to record weather API latency
   * @returns Array of alerts (empty if no risks detected)
   */
  async evaluateGarden(
    garden: Garden,
    recordWeatherLatency?: (latency: number) => void
  ): Promise<Alert[]> {
    console.log(`[AlertEngine] Evaluating garden: ${garden.name}`);

    try {
      // Step 1: Fetch weather data for the garden location
      const weather = await this.weatherService.fetchWeather(
        garden.latitude,
        garden.longitude,
        recordWeatherLatency
      );

      if (!weather) {
        console.error(
          `[AlertEngine] Failed to fetch weather for garden ${garden.gardenId}`
        );
        return [];
      }

      // Step 2: Get plant types from cache
      const plantTypes = await this.getPlantTypesFromCache(garden.userId);

      if (plantTypes.size === 0) {
        console.log(
          `[AlertEngine] No plants found for user ${garden.userId}, skipping evaluation`
        );
        return [];
      }

      // Step 3: Get sensitivity profiles for the plant types
      const profiles: SensitivityProfile[] = [];
      for (const plantType of plantTypes) {
        const profile = this.configLoader.getProfileForPlantType(
          plantType,
          this.sensitivityProfiles
        );
        profiles.push(profile);
      }

      // Step 4: Check thresholds and generate alerts
      const alerts = this.checkThresholds(weather, profiles, garden);

      if (alerts.length > 0) {
        console.log(
          `[AlertEngine] Generated ${alerts.length} alert(s) for garden ${garden.name}`
        );
      } else {
        console.log(
          `[AlertEngine] No alerts for garden ${garden.name} - all metrics within thresholds`
        );
      }

      return alerts;
    } catch (error) {
      console.error(
        `[AlertEngine] Error evaluating garden ${garden.gardenId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Extract unique plant types from the cache for a user
   * Requirements: 5.3
   *
   * @param userId The user ID
   * @returns Set of unique plant types
   */
  private async getPlantTypesFromCache(userId: number): Promise<Set<string>> {
    const plants = this.plantsService.getCachedPlants(userId);

    if (!plants || plants.length === 0) {
      return new Set<string>();
    }

    // Extract unique plant types
    const plantTypes = new Set<string>();
    for (const plant of plants) {
      plantTypes.add(plant.type);
    }

    console.log(
      `[AlertEngine] Found ${
        plantTypes.size
      } unique plant types for user ${userId}: ${Array.from(plantTypes).join(
        ", "
      )}`
    );

    return plantTypes;
  }

  /**
   * Check weather metrics against sensitivity profile thresholds
   * Requirements: 5.4, 5.5, 5.6
   *
   * @param weather Current weather data
   * @param profiles Array of sensitivity profiles to check
   * @param garden The garden being evaluated
   * @returns Array of alerts for threshold breaches
   */
  private checkThresholds(
    weather: WeatherData,
    profiles: SensitivityProfile[],
    garden: Garden
  ): Alert[] {
    const alerts: Alert[] = [];

    // Group profiles by plant type for efficient lookup
    const profilesByType = new Map<string, SensitivityProfile>();
    for (const profile of profiles) {
      profilesByType.set(profile.plantType, profile);
    }

    // Get all plants for this user to map types to names
    const plants = this.plantsService.getCachedPlants(garden.userId) || [];

    // Check HIGH_TEMPERATURE
    const highTempProfiles = profiles.filter(
      (p) => weather.temperature > p.maxTemperature
    );
    if (highTempProfiles.length > 0) {
      const affectedPlantTypes = highTempProfiles.map((p) => p.plantType);
      const affectedPlantNames = plants
        .filter((plant) => affectedPlantTypes.includes(plant.type))
        .map((plant) => plant.name);

      // Use the most restrictive threshold (lowest maxTemperature)
      const threshold = Math.min(
        ...highTempProfiles.map((p) => p.maxTemperature)
      );

      alerts.push({
        alertId: this.generateAlertId(),
        gardenId: garden.gardenId,
        userId: garden.userId,
        gardenName: garden.name,
        timestamp: new Date(),
        alertType: "HIGH_TEMPERATURE",
        metric: "temperature",
        currentValue: weather.temperature,
        threshold: threshold,
        affectedPlantTypes: affectedPlantTypes,
        affectedPlantNames: affectedPlantNames,
      });
    }

    // Check LOW_TEMPERATURE
    const lowTempProfiles = profiles.filter(
      (p) => weather.temperature < p.minTemperature
    );
    if (lowTempProfiles.length > 0) {
      const affectedPlantTypes = lowTempProfiles.map((p) => p.plantType);
      const affectedPlantNames = plants
        .filter((plant) => affectedPlantTypes.includes(plant.type))
        .map((plant) => plant.name);

      // Use the most restrictive threshold (highest minTemperature)
      const threshold = Math.max(
        ...lowTempProfiles.map((p) => p.minTemperature)
      );

      alerts.push({
        alertId: this.generateAlertId(),
        gardenId: garden.gardenId,
        userId: garden.userId,
        gardenName: garden.name,
        timestamp: new Date(),
        alertType: "LOW_TEMPERATURE",
        metric: "temperature",
        currentValue: weather.temperature,
        threshold: threshold,
        affectedPlantTypes: affectedPlantTypes,
        affectedPlantNames: affectedPlantNames,
      });
    }

    // Check HEAVY_RAIN
    const heavyRainProfiles = profiles.filter(
      (p) => weather.precipitation > p.maxPrecipitation
    );
    if (heavyRainProfiles.length > 0) {
      const affectedPlantTypes = heavyRainProfiles.map((p) => p.plantType);
      const affectedPlantNames = plants
        .filter((plant) => affectedPlantTypes.includes(plant.type))
        .map((plant) => plant.name);

      // Use the most restrictive threshold (lowest maxPrecipitation)
      const threshold = Math.min(
        ...heavyRainProfiles.map((p) => p.maxPrecipitation)
      );

      alerts.push({
        alertId: this.generateAlertId(),
        gardenId: garden.gardenId,
        userId: garden.userId,
        gardenName: garden.name,
        timestamp: new Date(),
        alertType: "HEAVY_RAIN",
        metric: "precipitation",
        currentValue: weather.precipitation,
        threshold: threshold,
        affectedPlantTypes: affectedPlantTypes,
        affectedPlantNames: affectedPlantNames,
      });
    }

    // Check STRONG_WIND
    const strongWindProfiles = profiles.filter(
      (p) => weather.windSpeed > p.maxWindSpeed
    );
    if (strongWindProfiles.length > 0) {
      const affectedPlantTypes = strongWindProfiles.map((p) => p.plantType);
      const affectedPlantNames = plants
        .filter((plant) => affectedPlantTypes.includes(plant.type))
        .map((plant) => plant.name);

      // Use the most restrictive threshold (lowest maxWindSpeed)
      const threshold = Math.min(
        ...strongWindProfiles.map((p) => p.maxWindSpeed)
      );

      alerts.push({
        alertId: this.generateAlertId(),
        gardenId: garden.gardenId,
        userId: garden.userId,
        gardenName: garden.name,
        timestamp: new Date(),
        alertType: "STRONG_WIND",
        metric: "windSpeed",
        currentValue: weather.windSpeed,
        threshold: threshold,
        affectedPlantTypes: affectedPlantTypes,
        affectedPlantNames: affectedPlantNames,
      });
    }

    return alerts;
  }

  /**
   * Generate a unique alert ID
   */
  private generateAlertId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const random = Math.random().toString(36).substring(2, 8);
    return `alert-${timestamp}-${random}`;
  }
}
