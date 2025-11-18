/**
 * AlertEngine Demo
 *
 * Demonstrates how to use the AlertEngine to evaluate climate risks for gardens
 */

import { AlertEngine } from "../services/AlertEngine.ts";
import { PlantsService } from "../services/PlantsService.ts";
import { WeatherService } from "../services/WeatherService.ts";
import { ConfigLoader } from "../services/ConfigLoader.ts";
import type { Garden } from "../models/index.ts";

async function main() {
  console.log("=== AlertEngine Demo ===\n");

  // Initialize services
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  const plantsService = new PlantsService(backendUrl);
  const weatherService = new WeatherService();
  const configLoader = new ConfigLoader("./config");

  // Load configuration
  console.log("Loading configuration...");
  const gardens = configLoader.loadGardens();
  const sensitivityProfiles = configLoader.loadSensitivityProfiles();

  console.log(`Loaded ${gardens.length} gardens`);
  console.log(`Loaded ${sensitivityProfiles.size} sensitivity profiles\n`);

  // Initialize AlertEngine
  const alertEngine = new AlertEngine(
    plantsService,
    weatherService,
    configLoader,
    sensitivityProfiles
  );

  // Load plants for all garden owners
  console.log("Loading plants for all garden owners...");
  const userIds = [...new Set(gardens.map((g) => g.userId))];
  await plantsService.loadAllUserPlants(userIds);
  console.log("Plants loaded and cached\n");

  // Evaluate each garden
  console.log("Evaluating gardens for climate risks...\n");
  for (const garden of gardens) {
    console.log(`\n--- Evaluating: ${garden.name} ---`);
    console.log(`Location: ${garden.latitude}, ${garden.longitude}`);
    console.log(`Owner: User ${garden.userId}\n`);

    const alerts = await alertEngine.evaluateGarden(garden);

    if (alerts.length === 0) {
      console.log("✅ No alerts - all conditions are safe for plants");
    } else {
      console.log(`⚠️  Generated ${alerts.length} alert(s):\n`);
      for (const alert of alerts) {
        console.log(`Alert ID: ${alert.alertId}`);
        console.log(`Type: ${alert.alertType}`);
        console.log(`Metric: ${alert.metric}`);
        console.log(`Current Value: ${alert.currentValue}`);
        console.log(`Threshold: ${alert.threshold}`);
        console.log(
          `Affected Plant Types: ${alert.affectedPlantTypes.join(", ")}`
        );
        console.log(`Affected Plants: ${alert.affectedPlantNames.join(", ")}`);
        console.log("");
      }
    }
  }

  console.log("\n=== Demo Complete ===");
}

main().catch((error) => {
  console.error("Error running demo:", error);
  process.exit(1);
});
