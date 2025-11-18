/**
 * Unit Tests for PlantsService
 *
 * Tests plant and user data fetching, caching, and retry logic
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { PlantsService } from "../../services/PlantsService.ts";

describe("PlantsService", () => {
  let service: PlantsService;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

  beforeEach(() => {
    service = new PlantsService(backendUrl);
  });

  describe("fetchUser", () => {
    test("should fetch user information successfully", async () => {
      const user = await service.fetchUser(1);

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.name).toBeDefined();
      expect(typeof user.name).toBe("string");
      // phone_number can be null or string
      expect(
        user.phone_number === null || typeof user.phone_number === "string"
      ).toBe(true);
    });

    test("should throw error for non-existent user", async () => {
      // Using a very high user ID that likely doesn't exist
      await expect(service.fetchUser(999999)).rejects.toThrow();
    });
  });

  describe("fetchUserPlants", () => {
    test("should fetch plants for a user successfully", async () => {
      const plants = await service.fetchUserPlants(1);

      expect(Array.isArray(plants)).toBe(true);
      // User 1 should have plants based on the demo
      if (plants.length > 0) {
        const plant = plants[0];
        if (plant) {
          expect(plant).toBeDefined();
          expect(plant.id).toBeDefined();
          expect(plant.user_id).toBe(1);
          expect(plant.name).toBeDefined();
          expect(plant.type).toBeDefined();
          expect(plant.created_at).toBeDefined();
        }
      }
    });

    test("should return empty array for user with no plants", async () => {
      // User 3 has no plants based on the demo
      const plants = await service.fetchUserPlants(3);

      expect(Array.isArray(plants)).toBe(true);
      expect(plants.length).toBe(0);
    });

    test("should update cache after successful fetch", async () => {
      const userId = 1;

      // Fetch plants
      await service.fetchUserPlants(userId);

      // Check cache
      const cachedPlants = service.getCachedPlants(userId);
      expect(cachedPlants).not.toBeNull();
      expect(Array.isArray(cachedPlants)).toBe(true);
    });
  });

  describe("cache management", () => {
    test("should return null for non-existent cache entry", () => {
      const cachedPlants = service.getCachedPlants(999999);
      expect(cachedPlants).toBeNull();
    });

    test("should store and retrieve plants from cache", async () => {
      const userId = 1;

      // Fetch plants to populate cache
      const plants = await service.fetchUserPlants(userId);

      // Retrieve from cache
      const cachedPlants = service.getCachedPlants(userId);

      expect(cachedPlants).not.toBeNull();
      expect(cachedPlants?.length).toBe(plants.length);
    });

    test("should use setCachedPlants to manually set cache", () => {
      const userId = 123;
      const mockPlants = [
        {
          id: 1,
          user_id: userId,
          name: "Test Plant",
          type: "tomato",
          planted_at: "2024-01-15",
          notes: "Test notes",
          created_at: "2024-01-10T10:30:00Z",
        },
      ];

      service.setCachedPlants(userId, mockPlants);

      const cachedPlants = service.getCachedPlants(userId);
      expect(cachedPlants).not.toBeNull();
      expect(cachedPlants?.length).toBe(1);
      expect(cachedPlants?.[0]?.name).toBe("Test Plant");
    });
  });

  describe("loadAllUserPlants", () => {
    test("should load plants for multiple users", async () => {
      const userIds = [1, 2, 3];

      await service.loadAllUserPlants(userIds);

      // Check that cache is populated for all users
      for (const userId of userIds) {
        const cachedPlants = service.getCachedPlants(userId);
        expect(cachedPlants).not.toBeNull();
        expect(Array.isArray(cachedPlants)).toBe(true);
      }
    });

    test("should continue loading other users even if one fails", async () => {
      // Mix of valid and invalid user IDs
      const userIds = [1, 999999, 2];

      // Should not throw error
      await service.loadAllUserPlants(userIds);

      // Valid users should have cache
      expect(service.getCachedPlants(1)).not.toBeNull();
      expect(service.getCachedPlants(2)).not.toBeNull();
    });
  });

  describe("automatic cache updates", () => {
    test("should start and stop automatic cache updates", () => {
      const userIds = [1, 2];

      // Should not throw error
      service.startAutomaticCacheUpdates(userIds);

      // Clean up
      service.stopAutomaticCacheUpdates();
    });
  });

  describe("retry logic with invalid backend", () => {
    test("should use cache when backend is unavailable", async () => {
      const userId = 1;

      // First, populate cache with valid backend
      await service.fetchUserPlants(userId);

      // Create a new service with invalid backend URL
      const invalidService = new PlantsService("http://localhost:9999");

      // Manually set cache in the invalid service
      const cachedPlants = service.getCachedPlants(userId);
      if (cachedPlants) {
        invalidService.setCachedPlants(userId, cachedPlants);
      }

      // Should use cache and not throw error
      const plants = await invalidService.fetchUserPlants(userId);
      expect(Array.isArray(plants)).toBe(true);
      expect(plants.length).toBeGreaterThan(0);
    });

    test("should throw error when backend fails and no cache available", async () => {
      const invalidService = new PlantsService("http://localhost:9999");

      // Should throw error after retries
      await expect(invalidService.fetchUserPlants(1)).rejects.toThrow();
    });
  });
});
