/**
 * AlertHistoryService
 *
 * Responsible for persisting weather alerts to MongoDB and retrieving alert history.
 * Handles MongoDB connection, indexing, and error management.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { MongoClient, Db, Collection } from "mongodb";
import type { Document } from "mongodb";
import type { Alert } from "../models/index.ts";

export interface AlertDocument extends Alert {
  createdAt: Date;
}

export interface AlertHistoryFilters {
  gardenId?: string;
  userId?: number;
  alertType?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AlertHistoryService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<Document> | null = null;
  private mongoUrl: string;
  private isConnected: boolean = false;

  constructor(mongoUrl: string) {
    this.mongoUrl = mongoUrl;
  }

  /**
   * Initialize MongoDB connection and setup collection with indexes
   * Requirements: 7.1, 7.2
   */
  async initialize(): Promise<void> {
    try {
      console.log("[AlertHistoryService] Connecting to MongoDB...");

      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();

      this.db = this.client.db("weather_alerts_db");
      this.collection = this.db.collection("weather_alerts");

      // Create indexes for efficient querying
      // Requirements: 7.4
      await this.createIndexes();

      this.isConnected = true;
      console.log("[AlertHistoryService] Successfully connected to MongoDB");
    } catch (error) {
      console.error(
        "[AlertHistoryService] Failed to connect to MongoDB:",
        error
      );
      this.isConnected = false;
      // Don't throw - service should continue without MongoDB
      // Requirements: 7.3
    }
  }

  /**
   * Create indexes for efficient querying
   * Requirements: 7.4
   */
  private async createIndexes(): Promise<void> {
    if (!this.collection) {
      return;
    }

    try {
      // Index for queries by garden and time
      await this.collection.createIndex(
        { gardenId: 1, timestamp: -1 },
        { name: "gardenId_timestamp" }
      );

      // Index for queries by user and time
      await this.collection.createIndex(
        { userId: 1, timestamp: -1 },
        { name: "userId_timestamp" }
      );

      // Index for general historical queries
      await this.collection.createIndex(
        { timestamp: -1 },
        { name: "timestamp_desc" }
      );

      console.log("[AlertHistoryService] Indexes created successfully");
    } catch (error) {
      console.error("[AlertHistoryService] Failed to create indexes:", error);
      // Don't throw - indexes are optional optimization
    }
  }

  /**
   * Save an alert to MongoDB
   * Requirements: 7.1, 7.2, 7.3
   *
   * @param alert The alert to save
   * @returns true if saved successfully, false otherwise
   */
  async saveAlert(alert: Alert): Promise<boolean> {
    if (!this.isConnected || !this.collection) {
      console.warn(
        "[AlertHistoryService] MongoDB not connected, skipping alert persistence"
      );
      return false;
    }

    try {
      const alertDocument: AlertDocument = {
        ...alert,
        createdAt: new Date(),
      };

      await this.collection.insertOne(alertDocument as Document);

      console.log(
        `[AlertHistoryService] Alert ${alert.alertId} saved to MongoDB`
      );
      return true;
    } catch (error) {
      // Requirements: 7.3 - Log error but don't block alert emission
      console.error(
        `[AlertHistoryService] Failed to save alert ${alert.alertId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Retrieve alert history with optional filters
   * Requirements: 7.4
   *
   * @param filters Optional filters for the query
   * @param limit Maximum number of alerts to return (default: 100)
   * @returns Array of alerts ordered by timestamp descending
   */
  async getAlertHistory(
    filters: AlertHistoryFilters = {},
    limit: number = 100
  ): Promise<AlertDocument[]> {
    if (!this.isConnected || !this.collection) {
      console.warn(
        "[AlertHistoryService] MongoDB not connected, returning empty history"
      );
      return [];
    }

    try {
      // Build query from filters
      const query: Document = {};

      if (filters.gardenId) {
        query.gardenId = filters.gardenId;
      }

      if (filters.userId) {
        query.userId = filters.userId;
      }

      if (filters.alertType) {
        query.alertType = filters.alertType;
      }

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate;
        }
      }

      // Query with descending timestamp order
      // Requirements: 7.4
      const alerts = await this.collection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      console.log(
        `[AlertHistoryService] Retrieved ${alerts.length} alerts from history`
      );

      return alerts as unknown as AlertDocument[];
    } catch (error) {
      console.error(
        "[AlertHistoryService] Failed to retrieve alert history:",
        error
      );
      return [];
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log("[AlertHistoryService] MongoDB connection closed");
      } catch (error) {
        console.error(
          "[AlertHistoryService] Error closing MongoDB connection:",
          error
        );
      }
    }
  }

  /**
   * Check if service is connected to MongoDB
   */
  isReady(): boolean {
    return this.isConnected;
  }
}
