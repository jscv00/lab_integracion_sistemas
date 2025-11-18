// @ts-nocheck
import { serve } from "bun";
import { ObjectId, Timestamp } from "mongodb";
import { pricesAAPLCollection } from "./utils/dbUtils.ts";
import { WebSocketServer } from "./services/WebSocketServer.ts";
import { ConfigLoader } from "./services/ConfigLoader.ts";
import { WeatherService } from "./services/WeatherService.ts";
import { PlantsService } from "./services/PlantsService.ts";
import { AlertEngine } from "./services/AlertEngine.ts";
import { NotificationService } from "./services/NotificationService.ts";
import { AlertHistoryService } from "./services/AlertHistoryService.ts";
import { HealthCheckService } from "./services/HealthCheckService.ts";
import { MetricsService } from "./services/MetricsService.ts";
import { logger } from "./utils/Logger.ts";
import type { Garden, SMSConfig } from "./models/index.ts";

// Load Finnhub API key from environment (legacy)
const API_KEY = Bun.env.FINNHUB_API_KEY;

if (!API_KEY) throw new Error("Missing FINNHUB_API_KEY in .env");

// Connect to MongoDB

// State for dynamic thresholds (legacy functionality)
let basePrice: number | null = null;
let upThreshold: number;
let downThreshold: number;
let thresholdsSet = false;

// Legacy clients for stock price updates
const legacyClients = new Set<WebSocket>();

// Weather alerts WebSocket server
export const weatherAlertServer = new WebSocketServer();

// Global services for health checks and metrics
let healthCheckService: HealthCheckService | null = null;
export const metricsService = new MetricsService();

// ============================================================================
// WEATHER ALERTS INTEGRATION - Main Monitoring System
// ============================================================================

/**
 * Initialize and start the weather alerts monitoring system
 * Requirements: 4.4, 4.5, 5.1, 5.2, 5.4, 5.5, 6.1, 6.2, 7.1, 10.1, 10.6
 */
async function initializeWeatherAlertsSystem() {
  logger.info("Weather Alerts System - Starting...");

  try {
    // Step 1: Load configuration files
    logger.info("Step 1: Loading configuration files");
    const configLoader = new ConfigLoader("./config");
    const gardens = configLoader.loadGardens();
    const sensitivityProfiles = configLoader.loadSensitivityProfiles();

    if (gardens.length === 0) {
      logger.warn(
        "No gardens configured, system will not monitor any locations"
      );
      return;
    }

    logger.info("Configuration loaded", {
      gardens: gardens.length,
      profiles: sensitivityProfiles.size,
    });

    // Step 2: Initialize services
    logger.info("Step 2: Initializing services");

    // Weather Service
    const weatherService = new WeatherService();
    logger.info("WeatherService initialized");

    // Plants Service
    const backendUrl = Bun.env.BACKEND_URL || "http://localhost:3001";
    const plantsService = new PlantsService(backendUrl);
    logger.info("PlantsService initialized", { backendUrl });

    // Alert Engine
    const alertEngine = new AlertEngine(
      plantsService,
      weatherService,
      configLoader,
      sensitivityProfiles
    );
    logger.info("AlertEngine initialized");

    // Notification Service (Twilio)
    let notificationService: NotificationService;
    const twilioConfig: SMSConfig | undefined = Bun.env.TWILIO_ACCOUNT_SID
      ? {
          accountSid: Bun.env.TWILIO_ACCOUNT_SID,
          authToken: Bun.env.TWILIO_AUTH_TOKEN || "",
          fromNumber: Bun.env.TWILIO_PHONE_NUMBER || "",
        }
      : undefined;

    notificationService = new NotificationService(twilioConfig);
    if (notificationService.isEnabled()) {
      logger.info("NotificationService initialized", { smsEnabled: true });
    } else {
      logger.warn("NotificationService initialized", { smsEnabled: false });
    }

    // Alert History Service (MongoDB)
    const mongoUrl = Bun.env.MONGO_URL || "mongodb://localhost:27017";
    const alertHistoryService = new AlertHistoryService(mongoUrl);
    await alertHistoryService.initialize();
    if (alertHistoryService.isReady()) {
      logger.info("AlertHistoryService initialized", {
        mongodbConnected: true,
      });
    } else {
      logger.warn("AlertHistoryService initialized", {
        mongodbConnected: false,
      });
    }

    // Initialize Health Check Service
    healthCheckService = new HealthCheckService(
      backendUrl,
      mongoUrl,
      notificationService
    );
    logger.info("HealthCheckService initialized");

    // Step 3: Load plants for all users immediately
    logger.info("Step 3: Loading plants for all garden owners");
    const userIds = [...new Set(gardens.map((g) => g.userId))];
    await plantsService.loadAllUserPlants(userIds);
    logger.info("Initial plant loading completed", { users: userIds.length });

    // Step 4: Start automatic cache updates every 24 hours
    logger.info("Step 4: Starting automatic cache updates");
    plantsService.startAutomaticCacheUpdates(userIds);
    logger.info("Cache updates scheduled", { intervalHours: 24 });

    // Step 5: Perform initial weather check immediately
    logger.info("Step 5: Performing initial weather check");
    await monitorGardens(
      gardens,
      alertEngine,
      plantsService,
      notificationService,
      alertHistoryService
    );
    logger.info("Initial weather check completed");

    // Step 6: Start polling loop every 5 minutes
    logger.info("Step 6: Starting weather monitoring loop");
    const pollingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    setInterval(async () => {
      logger.info("Starting scheduled weather check");
      await monitorGardens(
        gardens,
        alertEngine,
        plantsService,
        notificationService,
        alertHistoryService
      );
    }, pollingInterval);

    logger.info("Weather Alerts System - Running", {
      pollingIntervalMinutes: 5,
      gardensMonitored: gardens.length,
    });
  } catch (error) {
    logger.error("Failed to initialize Weather Alerts System", error as Error);
    console.error("The system will continue with legacy functionality only.\n");
  }
}

/**
 * Monitor all gardens and generate alerts
 * Requirements: 4.5, 5.4, 5.5, 6.1, 6.2, 7.1, 10.1, 10.6
 */
async function monitorGardens(
  gardens: Garden[],
  alertEngine: AlertEngine,
  plantsService: PlantsService,
  notificationService: NotificationService,
  alertHistoryService: AlertHistoryService
): Promise<void> {
  const monitorLogger = logger.child("Monitor");
  monitorLogger.info("Starting garden monitoring", { gardens: gardens.length });

  // Process each garden independently
  const results = await Promise.allSettled(
    gardens.map((garden) =>
      monitorSingleGarden(
        garden,
        alertEngine,
        plantsService,
        notificationService,
        alertHistoryService
      )
    )
  );

  // Log summary
  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  monitorLogger.info("Garden monitoring completed", { successful, failed });
}

/**
 * Monitor a single garden and handle alerts
 * Requirements: 5.4, 5.5, 6.1, 6.2, 7.1, 10.1, 10.6
 */
async function monitorSingleGarden(
  garden: Garden,
  alertEngine: AlertEngine,
  plantsService: PlantsService,
  notificationService: NotificationService,
  alertHistoryService: AlertHistoryService
): Promise<void> {
  const monitorLogger = logger.child("Monitor");

  try {
    // Evaluate garden for climate risks
    const alerts = await alertEngine.evaluateGarden(garden, (latency) =>
      metricsService.recordOpenMeteoLatency(latency)
    );

    if (alerts.length === 0) {
      monitorLogger.debug("No alerts generated", { garden: garden.name });
      return;
    }

    monitorLogger.info("Alerts generated", {
      garden: garden.name,
      alertCount: alerts.length,
    });

    // Process each alert
    for (const alert of alerts) {
      // Record alert in metrics
      metricsService.recordAlert(alert.alertType);

      monitorLogger.info("Processing alert", {
        alertId: alert.alertId,
        alertType: alert.alertType,
        garden: garden.name,
      });

      // Priority 1: Send SMS notification
      try {
        const user = await plantsService.fetchUser(garden.userId, (latency) =>
          metricsService.recordBackendLatency(latency)
        );
        const smsSent = await notificationService.sendAlert(alert, user);
        if (smsSent) {
          metricsService.recordSMSSuccess();
          monitorLogger.info("SMS sent successfully", {
            alertId: alert.alertId,
          });
        } else {
          metricsService.recordSMSFailure();
          monitorLogger.warn("SMS not sent", { alertId: alert.alertId });
        }
      } catch (error) {
        metricsService.recordSMSFailure();
        monitorLogger.error("Failed to send SMS", error as Error, {
          alertId: alert.alertId,
        });
        // Continue with other notification channels
      }

      // Priority 2: Broadcast via WebSocket (if clients connected)
      try {
        weatherAlertServer.broadcast(alert);
        if (weatherAlertServer.hasConnectedClients()) {
          monitorLogger.info("WebSocket broadcast sent", {
            alertId: alert.alertId,
          });
        }
      } catch (error) {
        monitorLogger.error("Failed to broadcast alert", error as Error, {
          alertId: alert.alertId,
        });
        // Continue with MongoDB persistence
      }

      // Priority 3: Save to MongoDB
      try {
        const saved = await alertHistoryService.saveAlert(alert);
        if (saved) {
          monitorLogger.info("Alert saved to MongoDB", {
            alertId: alert.alertId,
          });
        } else {
          monitorLogger.warn("Alert not saved to MongoDB", {
            alertId: alert.alertId,
          });
        }
      } catch (error) {
        monitorLogger.error("Failed to save alert to MongoDB", error as Error, {
          alertId: alert.alertId,
        });
        // Alert has been sent via SMS/WebSocket, so this is not critical
      }
    }
  } catch (error) {
    monitorLogger.error("Error monitoring garden", error as Error, {
      gardenId: garden.gardenId,
      gardenName: garden.name,
    });
    // Don't throw - continue with other gardens
  }
}

serve({
  port: Number(Bun.env.PORT),
  websocket: {
    open(ws) {
      // Add to both legacy clients and weather alert server
      legacyClients.add(ws);
      weatherAlertServer.onConnection(ws);
      console.log("Client connected. Total:", legacyClients.size);
    },
    message(ws, message) {
      // No messages expected from clients
    },
    close(ws) {
      // Remove from both legacy clients and weather alert server
      legacyClients.delete(ws);
      weatherAlertServer.onDisconnection(ws);
      console.log("Client disconnected. Total:", legacyClients.size);
    },
  },

  async fetch(req, server) {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    // Try to upgrade to WebSocket
    if (server.upgrade(req)) {
      return;
    }

    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      if (!healthCheckService) {
        return new Response(
          JSON.stringify({
            status: "unhealthy",
            message: "Health check service not initialized",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      try {
        const healthResult = await healthCheckService.checkHealth();
        const statusCode = healthResult.status === "healthy" ? 200 : 503;

        return new Response(JSON.stringify(healthResult), {
          status: statusCode,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        logger.error("Health check failed", error as Error);
        return new Response(
          JSON.stringify({
            status: "unhealthy",
            message: "Health check failed",
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // Metrics endpoint
    if (url.pathname === "/metrics" && req.method === "GET") {
      try {
        const metrics = metricsService.getMetrics();
        return new Response(JSON.stringify(metrics), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        logger.error("Failed to retrieve metrics", error as Error);
        return new Response(
          JSON.stringify({
            error: "Failed to retrieve metrics",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    if (url.pathname === "/save" && req.method === "POST") {
      const { price } = await req.json();
      if (!price) {
        return new Response("Price is required", { status: 400 });
      }
      const doc = { price, upThreshold, downThreshold, timestamp: new Date() };
      const result = await pricesAAPLCollection.insertOne(doc);
      return new Response(JSON.stringify({ insertedId: result.insertedId }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/saved" && req.method === "GET") {
      const savedPrices = await pricesAAPLCollection
        .find({}, { sort: { timestamp: -1 } })
        .project({ upThreshold: 0, downThreshold: 0 })
        .toArray();

      return new Response(JSON.stringify(savedPrices), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname.startsWith("/saved/") && req.method === "DELETE") {
      const id = url.pathname.split("/")[2];

      const recordId = new ObjectId(id);

      const query = { _id: recordId };
      const result = await pricesAAPLCollection.deleteOne(query);

      return new Response(
        JSON.stringify({ deletedCount: result.deletedCount }),
        {
          status: 204,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Fallback for normal HTTP requests
    return new Response(null, { status: 200 });
  },
});

// Poll Finnhub API every 5 seconds for AAPL price
setInterval(async () => {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${API_KEY}`
    );
    const data = await res.json();
    const raw: number = data.c; // real price from API
    // Add small random jitter for demo (±0.10 USD)
    const noise = (Math.random() - 0.5) * 0.2;
    const latest: number = parseFloat((raw + noise).toFixed(2));
    // console.log(`[Server] demo price with jitter: ${latest}`);
    // console.log("[Server] fetched AAPL price:", latest);

    // Initialize thresholds on first tick
    if (!thresholdsSet) {
      basePrice = latest;
      upThreshold = basePrice * 1.01;
      downThreshold = basePrice * 0.99;
      thresholdsSet = true;
    }

    upThreshold = +(latest * 1.01).toFixed(2);
    downThreshold = +(latest * 0.99).toFixed(2);

    // Broadcast price update to all legacy clients
    // Broadcast every tick with demo price
    for (const ws of legacyClients) {
      ws.send(
        JSON.stringify({
          symbol: "AAPL",
          price: latest,
          upThreshold,
          downThreshold,
        })
      );
    }
  } catch (err) {
    console.error("Error fetching price:", err);
  }
}, 5000);

console.log("🚀 Bun WebSocket server listening on ws://localhost:3002");

// Initialize Weather Alerts System
initializeWeatherAlertsSystem().catch((error) => {
  console.error("Fatal error in Weather Alerts System:", error);
});
