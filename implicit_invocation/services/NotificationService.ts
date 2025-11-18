/**
 * NotificationService
 *
 * Responsible for sending SMS notifications via Twilio when climate alerts are generated.
 * Handles retry logic, error logging, and message formatting.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4
 */

import type { Alert, User, SMSConfig } from "../models/index.ts";
import Twilio from "twilio";

export class NotificationService {
  private twilioClient: ReturnType<typeof Twilio> | null = null;
  private config: SMSConfig | null = null;
  private enabled: boolean = false;

  constructor(config?: SMSConfig) {
    if (!config) {
      console.warn(
        "[NotificationService] No Twilio configuration provided, SMS notifications disabled"
      );
      this.enabled = false;
      return;
    }

    // Validate configuration
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      console.warn(
        "[NotificationService] Incomplete Twilio configuration, SMS notifications disabled"
      );
      this.enabled = false;
      return;
    }

    this.config = config;

    try {
      // Initialize Twilio client
      this.twilioClient = Twilio(config.accountSid, config.authToken);
      this.enabled = true;
      console.log(
        `[NotificationService] Initialized with phone number: ${config.fromNumber}`
      );
    } catch (error) {
      console.error(
        "[NotificationService] Failed to initialize Twilio client:",
        error
      );
      this.enabled = false;
    }
  }

  /**
   * Send an alert notification via SMS to the user
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   *
   * @param alert The alert to send
   * @param user The user to notify
   * @returns Promise<boolean> indicating success or failure
   */
  async sendAlert(alert: Alert, user: User): Promise<boolean> {
    // Check if service is enabled
    if (!this.enabled || !this.twilioClient || !this.config) {
      console.log(
        "[NotificationService] SMS service disabled, skipping notification"
      );
      return false;
    }

    // Validate user has phone number
    if (!user.phone_number) {
      console.log(
        `[NotificationService] User ${user.id} has no phone number, skipping SMS`
      );
      return false;
    }

    const message = this.formatAlertMessage(alert);
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        attempt++;
        console.log(
          `[NotificationService] Sending SMS to ${
            user.phone_number
          } (attempt ${attempt}/${maxRetries + 1})`
        );

        await this.sendSMS(user.phone_number, message);

        console.log(
          `[NotificationService] Successfully sent SMS for alert ${alert.alertId}`
        );
        return true;
      } catch (error) {
        console.error(
          `[NotificationService] Failed to send SMS (attempt ${attempt}/${
            maxRetries + 1
          }):`,
          error
        );

        // If we haven't exhausted retries, wait before trying again
        if (attempt <= maxRetries) {
          console.log("[NotificationService] Retrying in 5 seconds...");
          await this.delay(5000);
        }
      }
    }

    // All retries exhausted
    console.error(
      `[NotificationService] Failed to send SMS after ${
        maxRetries + 1
      } attempts for alert ${alert.alertId}`
    );
    return false;
  }

  /**
   * Format an alert into a user-friendly SMS message
   * Requirements: 10.2
   *
   * @param alert The alert to format
   * @returns Formatted SMS message string
   */
  private formatAlertMessage(alert: Alert): string {
    // Format alert type for display
    const alertTypeDisplay = this.formatAlertType(alert.alertType);

    // Format plant names list
    const plantNames =
      alert.affectedPlantNames.length > 0
        ? alert.affectedPlantNames.join(", ")
        : alert.affectedPlantTypes.join(", ");

    // Format metric name for display
    const metricDisplay = this.formatMetricName(alert.metric);

    // Format values with appropriate units
    const currentValueDisplay = this.formatValue(
      alert.currentValue,
      alert.metric
    );
    const thresholdDisplay = this.formatValue(alert.threshold, alert.metric);

    return `🌱 ALERTA CLIMÁTICA - ${alert.gardenName}

⚠️ ${alertTypeDisplay}
📊 ${metricDisplay}: ${currentValueDisplay} (umbral: ${thresholdDisplay})
🪴 Plantas afectadas: ${plantNames}`;
  }

  /**
   * Send SMS via Twilio API
   * Requirements: 10.1, 10.3
   *
   * @param to Phone number to send to
   * @param message Message content
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    if (!this.twilioClient || !this.config) {
      throw new Error("Twilio client not initialized");
    }

    await this.twilioClient.messages.create({
      body: message,
      from: this.config.fromNumber,
      to: to,
    });
  }

  /**
   * Format alert type for display
   */
  private formatAlertType(alertType: string): string {
    const typeMap: Record<string, string> = {
      HIGH_TEMPERATURE: "Temperatura Alta",
      LOW_TEMPERATURE: "Temperatura Baja",
      HEAVY_RAIN: "Lluvia Intensa",
      STRONG_WIND: "Viento Fuerte",
    };
    return typeMap[alertType] || alertType;
  }

  /**
   * Format metric name for display
   */
  private formatMetricName(metric: string): string {
    const metricMap: Record<string, string> = {
      temperature: "Temperatura",
      precipitation: "Precipitación",
      windSpeed: "Velocidad del viento",
    };
    return metricMap[metric] || metric;
  }

  /**
   * Format value with appropriate units
   */
  private formatValue(value: number, metric: string): string {
    const rounded = Math.round(value * 10) / 10;
    const unitMap: Record<string, string> = {
      temperature: "°C",
      precipitation: "mm/h",
      windSpeed: "km/h",
    };
    const unit = unitMap[metric] || "";
    return `${rounded}${unit}`;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if the service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
