/**
 * AlertHistoryService Demo
 *
 * Demonstrates how to use the AlertHistoryService to persist and retrieve alerts.
 */

import { AlertHistoryService } from "../services/AlertHistoryService.ts";
import type { Alert } from "../models/index.ts";

async function demo() {
  console.log("=== AlertHistoryService Demo ===\n");

  // Get MongoDB URL from environment
  const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";
  console.log(`Using MongoDB URL: ${mongoUrl}\n`);

  // Create service instance
  const alertHistoryService = new AlertHistoryService(mongoUrl);

  // Initialize connection
  await alertHistoryService.initialize();

  if (!alertHistoryService.isReady()) {
    console.error("Failed to connect to MongoDB. Exiting demo.");
    return;
  }

  // Create a sample alert
  const sampleAlert: Alert = {
    alertId: `demo-alert-${Date.now()}`,
    gardenId: "garden-001",
    userId: 123,
    gardenName: "Demo Garden",
    timestamp: new Date(),
    alertType: "HIGH_TEMPERATURE",
    metric: "temperature",
    currentValue: 38,
    threshold: 35,
    affectedPlantTypes: ["tomato", "lettuce"],
    affectedPlantNames: ["Cherry Tomatoes", "Romaine Lettuce"],
  };

  console.log("Sample Alert:");
  console.log(JSON.stringify(sampleAlert, null, 2));
  console.log();

  // Save the alert
  console.log("Saving alert to MongoDB...");
  const saved = await alertHistoryService.saveAlert(sampleAlert);
  console.log(`Alert saved: ${saved}\n`);

  // Retrieve all alerts
  console.log("Retrieving all alerts (limit 10)...");
  const allAlerts = await alertHistoryService.getAlertHistory({}, 10);
  console.log(`Found ${allAlerts.length} alerts:`);
  allAlerts.forEach((alert, index) => {
    console.log(
      `  ${index + 1}. ${alert.alertType} for ${alert.gardenName} at ${
        alert.timestamp
      }`
    );
  });
  console.log();

  // Retrieve alerts for specific garden
  console.log("Retrieving alerts for garden-001...");
  const gardenAlerts = await alertHistoryService.getAlertHistory(
    { gardenId: "garden-001" },
    5
  );
  console.log(`Found ${gardenAlerts.length} alerts for garden-001\n`);

  // Retrieve alerts for specific user
  console.log("Retrieving alerts for user 123...");
  const userAlerts = await alertHistoryService.getAlertHistory(
    { userId: 123 },
    5
  );
  console.log(`Found ${userAlerts.length} alerts for user 123\n`);

  // Retrieve alerts by type
  console.log("Retrieving HIGH_TEMPERATURE alerts...");
  const tempAlerts = await alertHistoryService.getAlertHistory(
    { alertType: "HIGH_TEMPERATURE" },
    5
  );
  console.log(`Found ${tempAlerts.length} HIGH_TEMPERATURE alerts\n`);

  // Retrieve alerts by date range
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  console.log("Retrieving alerts from last 24 hours...");
  const recentAlerts = await alertHistoryService.getAlertHistory(
    { startDate: yesterday },
    10
  );
  console.log(`Found ${recentAlerts.length} alerts from last 24 hours\n`);

  // Close connection
  await alertHistoryService.close();
  console.log("Demo completed!");
}

// Run demo
demo().catch(console.error);
