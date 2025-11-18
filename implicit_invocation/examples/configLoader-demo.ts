/**
 * ConfigLoader Demo
 *
 * Demonstrates how to use the ConfigLoader service
 */

import { ConfigLoader } from "../services/ConfigLoader.ts";

console.log("=== ConfigLoader Demo ===\n");

// Create ConfigLoader instance
const loader = new ConfigLoader("./config");

// Load gardens configuration
console.log("1. Loading gardens configuration...");
const gardens = loader.loadGardens();
console.log(`   Loaded ${gardens.length} gardens:\n`);
gardens.forEach((garden) => {
  console.log(`   - ${garden.name} (${garden.gardenId})`);
  console.log(`     Owner: User ${garden.userId}`);
  console.log(`     Location: ${garden.latitude}, ${garden.longitude}\n`);
});

// Load sensitivity profiles
console.log("2. Loading plant sensitivity profiles...");
const profiles = loader.loadSensitivityProfiles();
console.log(`   Loaded ${profiles.size} profiles:\n`);
profiles.forEach((profile, plantType) => {
  console.log(`   - ${plantType}:`);
  console.log(
    `     Temp range: ${profile.minTemperature}°C - ${profile.maxTemperature}°C`
  );
  console.log(`     Max precipitation: ${profile.maxPrecipitation} mm/h`);
  console.log(`     Max wind speed: ${profile.maxWindSpeed} km/h\n`);
});

// Demonstrate fallback to default profile
console.log("3. Testing fallback to default profile...");
const unknownPlantType = "exotic-orchid";
const profile = loader.getProfileForPlantType(unknownPlantType, profiles);
console.log(`   Profile for '${unknownPlantType}': ${profile.plantType}`);
console.log(`   (Fell back to default profile)\n`);

console.log("=== Demo Complete ===");
