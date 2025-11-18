/**
 * PlantsService
 *
 * Responsible for querying plant and user data from Backend Mi Huerta.
 * Implements caching with 24-hour TTL and retry logic with exponential backoff.
 *
 * Requirements: 5.1, 5.2, 8.1, 8.2, 8.4, 9.1, 9.2
 */

import type { Plant, User } from "../models/index.ts";

interface CacheEntry {
  plants: Plant[];
  timestamp: Date;
  lastUpdated: Date;
}

export class PlantsService {
  private backendUrl: string;
  private cache: Map<number, CacheEntry>;
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
    this.cache = new Map<number, CacheEntry>();
  }

  /**
   * Fetch plants for a specific user from Backend Mi Huerta
   * Requirements: 5.1, 8.1, 8.2, 9.1, 9.2
   *
   * @param userId The user ID to fetch plants for
   * @returns Array of Plant objects
   * @throws Error if all retries fail and no cache is available
   */
  async fetchUserPlants(
    userId: number,
    recordLatency?: (latency: number) => void
  ): Promise<Plant[]> {
    const url = `${this.backendUrl}/api/plants?userId=${userId}`;
    const startTime = Date.now();

    try {
      const plants = await this.fetchWithRetry<Plant[]>(url);
      const latency = Date.now() - startTime;

      // Record latency if callback provided
      if (recordLatency) {
        recordLatency(latency);
      }

      // Update cache with fresh data
      this.setCachedPlants(userId, plants);

      console.log(
        `[PlantsService] Successfully fetched ${plants.length} plants for user ${userId} (${latency}ms)`
      );
      return plants;
    } catch (error) {
      const latency = Date.now() - startTime;
      if (recordLatency) {
        recordLatency(latency);
      }

      console.error(
        `[PlantsService] Failed to fetch plants for user ${userId} after all retries:`,
        error
      );

      // Fallback to cache
      const cachedPlants = this.getCachedPlants(userId);
      if (cachedPlants !== null) {
        console.log(
          `[PlantsService] Using cached plants for user ${userId} (cache may be stale)`
        );
        return cachedPlants;
      }

      // No cache available, throw error
      throw new Error(
        `Failed to fetch plants for user ${userId} and no cache available`
      );
    }
  }

  /**
   * Fetch user information from Backend Mi Huerta
   * Requirements: 8.1, 8.2, 9.1
   *
   * @param userId The user ID to fetch
   * @param recordLatency Optional callback to record API latency
   * @returns User object
   * @throws Error if all retries fail
   */
  async fetchUser(
    userId: number,
    recordLatency?: (latency: number) => void
  ): Promise<User> {
    const url = `${this.backendUrl}/api/users/${userId}`;
    const startTime = Date.now();

    try {
      const user = await this.fetchWithRetry<User>(url);
      const latency = Date.now() - startTime;

      // Record latency if callback provided
      if (recordLatency) {
        recordLatency(latency);
      }

      console.log(
        `[PlantsService] Successfully fetched user ${userId} (${latency}ms)`
      );
      return user;
    } catch (error) {
      const latency = Date.now() - startTime;
      if (recordLatency) {
        recordLatency(latency);
      }

      console.error(
        `[PlantsService] Failed to fetch user ${userId} after all retries:`,
        error
      );
      throw error;
    }
  }

  /**
   * Load plants for all users at system initialization
   * Requirements: 5.1, 5.2
   *
   * @param userIds Array of user IDs to load plants for
   */
  async loadAllUserPlants(userIds: number[]): Promise<void> {
    console.log(
      `[PlantsService] Loading plants for ${userIds.length} users...`
    );

    const promises = userIds.map(async (userId) => {
      try {
        await this.fetchUserPlants(userId);
      } catch (error) {
        console.error(
          `[PlantsService] Failed to load plants for user ${userId}:`,
          error
        );
        // Continue with other users even if one fails
      }
    });

    await Promise.all(promises);
    console.log(`[PlantsService] Completed initial plant loading`);
  }

  /**
   * Start automatic cache updates every 24 hours
   * Requirements: 5.2, 9.2
   *
   * @param userIds Array of user IDs to update
   */
  startAutomaticCacheUpdates(userIds: number[]): void {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Set up 24-hour update interval
    this.updateInterval = setInterval(async () => {
      console.log(`[PlantsService] Starting automatic cache update...`);
      await this.loadAllUserPlants(userIds);
    }, this.cacheTTL);

    console.log(
      `[PlantsService] Automatic cache updates scheduled every 24 hours`
    );
  }

  /**
   * Stop automatic cache updates
   */
  stopAutomaticCacheUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log(`[PlantsService] Automatic cache updates stopped`);
    }
  }

  /**
   * Get cached plants for a user
   * Requirements: 8.4, 9.2
   *
   * @param userId The user ID
   * @returns Array of cached plants or null if not in cache or expired
   */
  getCachedPlants(userId: number): Plant[] | null {
    const entry = this.cache.get(userId);

    if (!entry) {
      return null;
    }

    // Check if cache is expired (TTL of 24 hours)
    const now = new Date();
    const age = now.getTime() - entry.lastUpdated.getTime();

    if (age > this.cacheTTL) {
      console.log(
        `[PlantsService] Cache expired for user ${userId} (age: ${Math.round(
          age / 1000 / 60
        )} minutes)`
      );
      return null;
    }

    return entry.plants;
  }

  /**
   * Set cached plants for a user
   * Requirements: 8.4
   *
   * @param userId The user ID
   * @param plants Array of plants to cache
   */
  setCachedPlants(userId: number, plants: Plant[]): void {
    const now = new Date();
    this.cache.set(userId, {
      plants,
      timestamp: now,
      lastUpdated: now,
    });
  }

  /**
   * Fetch with retry logic using exponential backoff
   * Requirements: 9.1, 9.2
   *
   * @param url The URL to fetch
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @returns Parsed JSON response
   * @throws Error if all retries fail
   */
  private async fetchWithRetry<T>(
    url: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          // Calculate backoff delay: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(
            `[PlantsService] Attempt ${
              attempt + 1
            } failed, retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Failed to fetch after all retries");
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
