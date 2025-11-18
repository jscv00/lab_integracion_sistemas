/**
 * HealthCheckService
 *
 * Monitors the health of all external dependencies and provides
 * a unified health status for the system.
 *
 * Requirements: Task 13 - Health check and observability
 */

import { MongoClient } from "mongodb";
import type { PlantsService } from "./PlantsService.ts";
import type { WeatherService } from "./WeatherService.ts";
import type { NotificationService } from "./NotificationService.ts";

export type ServiceStatus = "ok" | "degraded" | "error";
export type SystemStatus = "healthy" | "degraded" | "unhealthy";

export interface ServiceHealth {
  status: ServiceStatus;
  message?: string;
  latency?: number;
}

export interface HealthCheckResult {
  status: SystemStatus;
  timestamp: Date;
  services: {
    postgres: ServiceHealth;
    mongodb: ServiceHealth;
    openmeteo: ServiceHealth;
    twilio: ServiceHealth;
  };
}

export class HealthCheckService {
  private backendUrl: string;
  private mongoUrl: string;
  private notificationService: NotificationService;

  constructor(
    backendUrl: string,
    mongoUrl: string,
    notificationService: NotificationService
  ) {
    this.backendUrl = backendUrl;
    this.mongoUrl = mongoUrl;
    this.notificationService = notificationService;
  }

  /**
   * Perform a comprehensive health check of all services
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const [postgres, mongodb, openmeteo, twilio] = await Promise.all([
      this.checkPostgres(),
      this.checkMongoDB(),
      this.checkOpenMeteo(),
      this.checkTwilio(),
    ]);

    const services = { postgres, mongodb, openmeteo, twilio };
    const status = this.determineSystemStatus(services);

    return {
      status,
      timestamp: new Date(),
      services,
    };
  }

  /**
   * Check PostgreSQL connectivity via Backend Mi Huerta
   */
  private async checkPostgres(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.backendUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          status: "ok",
          latency,
        };
      } else {
        return {
          status: "error",
          message: `HTTP ${response.status}`,
          latency,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
        latency,
      };
    }
  }

  /**
   * Check MongoDB connectivity
   */
  private async checkMongoDB(): Promise<ServiceHealth> {
    const startTime = Date.now();
    let client: MongoClient | null = null;

    try {
      client = new MongoClient(this.mongoUrl);
      await client.connect();

      // Ping the database
      await client.db("admin").command({ ping: 1 });

      const latency = Date.now() - startTime;

      return {
        status: "ok",
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
        latency,
      };
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Check Open-Meteo API availability
   */
  private async checkOpenMeteo(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Use a simple test location (Madrid, Spain)
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&current=temperature_2m";

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          status: "ok",
          latency,
        };
      } else {
        return {
          status: "error",
          message: `HTTP ${response.status}`,
          latency,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Connection failed",
        latency,
      };
    }
  }

  /**
   * Check Twilio service status
   */
  private async checkTwilio(): Promise<ServiceHealth> {
    if (!this.notificationService.isEnabled()) {
      return {
        status: "degraded",
        message: "Service disabled (missing credentials)",
      };
    }

    // Twilio is configured and enabled
    return {
      status: "ok",
      message: "Service enabled",
    };
  }

  /**
   * Determine overall system status based on individual service statuses
   */
  private determineSystemStatus(services: {
    postgres: ServiceHealth;
    mongodb: ServiceHealth;
    openmeteo: ServiceHealth;
    twilio: ServiceHealth;
  }): SystemStatus {
    const statuses = Object.values(services).map((s) => s.status);

    // If any critical service is down, system is unhealthy
    if (
      services.postgres.status === "error" ||
      services.openmeteo.status === "error"
    ) {
      return "unhealthy";
    }

    // If any service has issues, system is degraded
    if (statuses.includes("error") || statuses.includes("degraded")) {
      return "degraded";
    }

    // All services are ok
    return "healthy";
  }
}
