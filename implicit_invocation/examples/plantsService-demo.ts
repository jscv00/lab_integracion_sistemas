/**
 * PlantsService Demo
 *
 * Demonstrates the usage of PlantsService for fetching plant and user data
 * from Backend Mi Huerta with caching and retry logic.
 */

import { PlantsService } from "../services/PlantsService.ts";

async function main() {
  // Initialize service with backend URL
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  const plantsService = new PlantsService(backendUrl);

  console.log("=== PlantsService Demo ===\n");

  try {
    // Test 1: Fetch user information
    console.log("1. Fetching user information...");
    const user = await plantsService.fetchUser(1);
    console.log("User:", user);
    console.log();

    // Test 2: Fetch plants for a user
    console.log("2. Fetching plants for user 1...");
    const plants = await plantsService.fetchUserPlants(1);
    console.log(`Found ${plants.length} plants:`);
    plants.forEach((plant) => {
      console.log(`  - ${plant.name} (${plant.type})`);
    });
    console.log();

    // Test 3: Check cache
    console.log("3. Checking cache...");
    const cachedPlants = plantsService.getCachedPlants(1);
    if (cachedPlants) {
      console.log(`Cache hit! Found ${cachedPlants.length} cached plants`);
    } else {
      console.log("Cache miss");
    }
    console.log();

    // Test 4: Load all user plants (simulating multiple users)
    console.log("4. Loading plants for multiple users...");
    await plantsService.loadAllUserPlants([1, 2, 3]);
    console.log("Completed loading plants for all users");
    console.log();

    // Test 5: Start automatic cache updates (for demo, we won't wait)
    console.log("5. Starting automatic cache updates (24-hour interval)...");
    plantsService.startAutomaticCacheUpdates([1, 2, 3]);
    console.log("Automatic updates scheduled");
    console.log();

    // Clean up
    plantsService.stopAutomaticCacheUpdates();
    console.log("Demo completed successfully!");
  } catch (error) {
    console.error("Demo failed:", error);
    process.exit(1);
  }
}

main();
