/**
 * NotificationService Demo
 *
 * Demonstrates the NotificationService functionality for sending SMS alerts.
 * This demo shows how to initialize the service and send test alerts.
 */

import { NotificationService } from "../services/NotificationService.ts";
import type { Alert, User, SMSConfig } from "../models/index.ts";

console.log("=== NotificationService Demo ===\n");

// Demo 1: Initialize with valid configuration (from environment)
console.log("Demo 1: Initialize with Twilio configuration from environment");
let notificationService: NotificationService;

if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
) {
  const config: SMSConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
  };
  notificationService = new NotificationService(config);
} else {
  console.log("No Twilio credentials in environment, service will be disabled");
  notificationService = new NotificationService();
}
console.log(`Service enabled: ${notificationService.isEnabled()}\n`);

// Demo 2: Initialize without configuration
console.log("Demo 2: Initialize without configuration");
const disabledService = new NotificationService();
console.log(`Service enabled: ${disabledService.isEnabled()}\n`);

// Demo 3: Create a sample alert
console.log("Demo 3: Create sample alert");
const sampleAlert: Alert = {
  alertId: "alert-demo-001",
  gardenId: "garden-001",
  userId: 123,
  gardenName: "Huerto Casa",
  timestamp: new Date(),
  alertType: "HIGH_TEMPERATURE",
  metric: "temperature",
  currentValue: 38.5,
  threshold: 35,
  affectedPlantTypes: ["tomato", "lettuce"],
  affectedPlantNames: ["Tomates Cherry", "Lechugas Romanas"],
};

console.log("Alert created:", {
  alertId: sampleAlert.alertId,
  gardenName: sampleAlert.gardenName,
  alertType: sampleAlert.alertType,
  currentValue: sampleAlert.currentValue,
  threshold: sampleAlert.threshold,
});
console.log();

// Demo 4: Create sample users
console.log("Demo 4: Create sample users");
const userWithPhone: User = {
  id: 123,
  name: "Juan Pérez",
  phone_number: "+34612345678",
};

const userWithoutPhone: User = {
  id: 456,
  name: "María García",
  phone_number: null,
};

console.log("User with phone:", userWithPhone);
console.log("User without phone:", userWithoutPhone);
console.log();

// Demo 5: Attempt to send alert (will fail in demo mode without real credentials)
console.log("Demo 5: Attempt to send alert to user with phone");
console.log(
  "Note: This will fail without real Twilio credentials in environment variables"
);

try {
  const result = await notificationService.sendAlert(
    sampleAlert,
    userWithPhone
  );
  console.log(`SMS send result: ${result ? "Success" : "Failed"}\n`);
} catch (error) {
  console.log(`SMS send failed (expected in demo mode): ${error}\n`);
}

// Demo 6: Attempt to send to user without phone
console.log("Demo 6: Attempt to send alert to user without phone");
const result2 = await notificationService.sendAlert(
  sampleAlert,
  userWithoutPhone
);
console.log(`SMS send result: ${result2 ? "Success" : "Failed (expected)"}\n`);

// Demo 7: Test different alert types
console.log("Demo 7: Different alert types");
const alertTypes: Array<{
  type: "HIGH_TEMPERATURE" | "LOW_TEMPERATURE" | "HEAVY_RAIN" | "STRONG_WIND";
  metric: string;
  value: number;
  threshold: number;
}> = [
  {
    type: "LOW_TEMPERATURE",
    metric: "temperature",
    value: 5,
    threshold: 10,
  },
  { type: "HEAVY_RAIN", metric: "precipitation", value: 25, threshold: 20 },
  { type: "STRONG_WIND", metric: "windSpeed", value: 60, threshold: 50 },
];

for (const alertType of alertTypes) {
  const alert: Alert = {
    ...sampleAlert,
    alertId: `alert-demo-${alertType.type}`,
    alertType: alertType.type,
    metric: alertType.metric,
    currentValue: alertType.value,
    threshold: alertType.threshold,
  };

  console.log(`\nAlert type: ${alertType.type}`);
  console.log(`Metric: ${alertType.metric}`);
  console.log(`Current: ${alertType.value}, Threshold: ${alertType.threshold}`);
}

console.log("\n=== Demo Complete ===");
