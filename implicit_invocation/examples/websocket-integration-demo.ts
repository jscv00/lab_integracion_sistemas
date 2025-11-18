/**
 * WebSocket Integration Demo
 *
 * This demo shows how the WebSocketServer integrates with the complete alert flow:
 * Weather → AlertEngine → WebSocket + SMS + MongoDB
 */

import { WebSocketServer } from "../services/WebSocketServer.ts";
import { AlertEngine } from "../services/AlertEngine.ts";
import { WeatherService } from "../services/WeatherService.ts";
import { PlantsService } from "../services/PlantsService.ts";
import { ConfigLoader } from "../services/ConfigLoader.ts";
import type { Garden } from "../models/index.ts";

console.log("=== WebSocket Integration Demo ===\n");

// Initialize services
const configLoader = new ConfigLoader();
const weatherService = new WeatherService();
const plantsService = new PlantsService(
  Bun.env.BACKEND_URL || "http://localhost:3001"
);
const wsServer = new WebSocketServer();

// Load configurations
const gardens = configLoader.loadGardens();
const sensitivityProfiles = configLoader.loadSensitivityProfiles();

// Initialize AlertEngine
const alertEngine = new AlertEngine(
  plantsService,
  weatherService,
  configLoader,
  sensitivityProfiles
);

console.log("1. System Status:");
console.log(`   Gardens loaded: ${gardens.length}`);
console.log(`   Sensitivity profiles: ${sensitivityProfiles.size}`);
console.log(`   WebSocket clients: ${wsServer.getClientCount()}`);
console.log(
  `   System operates autonomously: ${!wsServer.hasConnectedClients()}\n`
);

console.log("2. Simulating Alert Flow:");
console.log("   Step 1: Weather data fetched from Open-Meteo");
console.log("   Step 2: AlertEngine evaluates conditions");
console.log("   Step 3: If alert generated:");
console.log("           → SMS sent (primary channel)");
console.log("           → WebSocket broadcast (if clients connected)");
console.log("           → MongoDB save (historical record)\n");

console.log("3. WebSocket Behavior:");
console.log("   • With clients: Broadcasts to all connected clients");
console.log("   • Without clients: Logs and continues (no error)");
console.log("   • SMS always sent regardless of WebSocket status\n");

console.log("4. Example Integration Code:");
console.log(`
async function processGarden(garden: Garden) {
  // Evaluate garden for alerts
  const alerts = await alertEngine.evaluateGarden(garden);
  
  for (const alert of alerts) {
    // 1. Send SMS (primary notification)
    await notificationService.sendAlert(alert, user);
    
    // 2. Broadcast via WebSocket (optional)
    wsServer.broadcast(alert);
    
    // 3. Save to MongoDB (historical record)
    await alertHistoryService.saveAlert(alert);
  }
}
`);

console.log("5. Client Connection Example:");
console.log(`
// JavaScript client
const ws = new WebSocket('ws://localhost:3002');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'WEATHER_ALERT') {
    const alert = message.data;
    // Display notification to user
    showNotification(alert);
  }
};
`);

console.log("\n✓ Integration demo completed");
console.log("\nKey Points:");
console.log("  • WebSocket is optional - system works without it");
console.log("  • SMS is the primary notification channel");
console.log("  • All alerts saved to MongoDB for history");
console.log("  • Backward compatible with legacy endpoints");
