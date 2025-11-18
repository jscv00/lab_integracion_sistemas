/**
 * WebSocketServer
 *
 * Manages WebSocket connections and broadcasts weather alerts to connected clients.
 * The system operates autonomously without requiring WebSocket clients - SMS is the primary notification channel.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { Alert } from "../models/index.ts";

export class WebSocketServer {
  private clients: Set<WebSocket>;

  constructor() {
    this.clients = new Set<WebSocket>();
  }

  /**
   * Handle new WebSocket connection
   * Requirements: 6.4
   *
   * @param ws The WebSocket connection
   */
  onConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(
      `[WebSocketServer] Client connected. Total clients: ${this.clients.size}`
    );
  }

  /**
   * Handle WebSocket disconnection
   * Requirements: 6.4
   *
   * @param ws The WebSocket connection
   */
  onDisconnection(ws: WebSocket): void {
    this.clients.delete(ws);
    console.log(
      `[WebSocketServer] Client disconnected. Total clients: ${this.clients.size}`
    );
  }

  /**
   * Broadcast alert to all connected WebSocket clients
   * Requirements: 6.1, 6.2, 6.3
   *
   * @param alert The alert to broadcast
   */
  broadcast(alert: Alert): void {
    // System operates without WebSocket clients - this is optional
    if (this.clients.size === 0) {
      console.log(
        "[WebSocketServer] No clients connected, skipping WebSocket broadcast"
      );
      return;
    }

    const message = this.formatAlertMessage(alert);
    const messageStr = JSON.stringify(message);

    console.log(
      `[WebSocketServer] Broadcasting alert ${alert.alertId} to ${this.clients.size} client(s)`
    );

    for (const ws of this.clients) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("[WebSocketServer] Error sending to client:", error);
        // Remove failed client
        this.clients.delete(ws);
      }
    }
  }

  /**
   * Check if there are any connected clients
   * Requirements: 6.2
   *
   * @returns true if clients are connected, false otherwise
   */
  hasConnectedClients(): boolean {
    return this.clients.size > 0;
  }

  /**
   * Get the number of connected clients
   *
   * @returns Number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Format alert as WebSocket message
   * Requirements: 6.3
   *
   * @param alert The alert to format
   * @returns Formatted message object
   */
  private formatAlertMessage(alert: Alert): object {
    return {
      type: "WEATHER_ALERT",
      data: {
        alertId: alert.alertId,
        gardenId: alert.gardenId,
        userId: alert.userId,
        gardenName: alert.gardenName,
        timestamp: alert.timestamp.toISOString(),
        alertType: alert.alertType,
        metric: alert.metric,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        affectedPlantTypes: alert.affectedPlantTypes,
        affectedPlantNames: alert.affectedPlantNames,
      },
    };
  }
}
