/**
 * WebSocket Server Demo
 *
 * This demo shows how the WebSocketServer broadcasts weather alerts to connected clients.
 * It simulates alert generation and broadcasting.
 */

import { WebSocketServer } from "../services/WebSocketServer.ts";
import type { Alert } from "../models/index.ts";

console.log("=== WebSocket Server Demo ===\n");

// Create WebSocket server instance
const wsServer = new WebSocketServer();

// Simulate a weather alert
const mockAlert: Alert = {
  alertId: "alert-demo-001",
  gardenId: "garden-001",
  userId: 123,
  gardenName: "Huerto Casa",
  timestamp: new Date(),
  alertType: "HIGH_TEMPERATURE",
  metric: "temperature",
  currentValue: 38,
  threshold: 35,
  affectedPlantTypes: ["tomato", "lettuce"],
  affectedPlantNames: ["Tomates Cherry", "Lechugas Romanas"],
};

console.log("1. Testing broadcast with no clients connected:");
console.log(`   Has connected clients: ${wsServer.hasConnectedClients()}`);
console.log(`   Client count: ${wsServer.getClientCount()}`);
wsServer.broadcast(mockAlert);
console.log("   ✓ System operates correctly without WebSocket clients\n");

console.log("2. Simulating client connections:");
// Note: In real usage, WebSocket connections are managed by Bun's serve()
// This demo just shows the API
console.log("   In production, clients connect via: ws://localhost:3002");
console.log("   Example client code:");
console.log("   ```javascript");
console.log("   const ws = new WebSocket('ws://localhost:3002');");
console.log("   ws.onmessage = (event) => {");
console.log("     const alert = JSON.parse(event.data);");
console.log("     console.log('Received alert:', alert);");
console.log("   };");
console.log("   ```\n");

console.log("3. Alert message format:");
const formattedMessage = {
  type: "WEATHER_ALERT",
  data: {
    alertId: mockAlert.alertId,
    gardenId: mockAlert.gardenId,
    userId: mockAlert.userId,
    gardenName: mockAlert.gardenName,
    timestamp: mockAlert.timestamp.toISOString(),
    alertType: mockAlert.alertType,
    metric: mockAlert.metric,
    currentValue: mockAlert.currentValue,
    threshold: mockAlert.threshold,
    affectedPlantTypes: mockAlert.affectedPlantTypes,
    affectedPlantNames: mockAlert.affectedPlantNames,
  },
};
console.log(JSON.stringify(formattedMessage, null, 2));

console.log("\n✓ Demo completed successfully");
console.log("\nKey Features:");
console.log("  • System operates autonomously without WebSocket clients");
console.log("  • SMS is the primary notification channel");
console.log("  • WebSocket provides optional real-time updates");
console.log("  • Maintains backward compatibility with legacy endpoints");
