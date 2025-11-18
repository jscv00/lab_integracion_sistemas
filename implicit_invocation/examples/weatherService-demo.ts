/**
 * WeatherService Demo
 *
 * Simple demonstration of WeatherService functionality
 */

import { WeatherService } from "../services/WeatherService.ts";

async function main() {
  const weatherService = new WeatherService();

  console.log("=== WeatherService Demo ===\n");

  // Test with Madrid coordinates
  console.log("Fetching weather for Madrid (40.4168, -3.7038)...");
  const madridWeather = await weatherService.fetchWeather(40.4168, -3.7038);

  if (madridWeather) {
    console.log("\n✅ Weather data received:");
    console.log(`  Temperature: ${madridWeather.temperature}°C`);
    console.log(`  Max Temperature: ${madridWeather.temperatureMax}°C`);
    console.log(`  Min Temperature: ${madridWeather.temperatureMin}°C`);
    console.log(`  Precipitation: ${madridWeather.precipitation}mm`);
    console.log(`  Wind Speed: ${madridWeather.windSpeed}km/h`);
    console.log(`  Timestamp: ${madridWeather.timestamp.toISOString()}`);
  } else {
    console.log("\n❌ Failed to fetch weather data");
  }

  console.log("\n=== Demo Complete ===");
}

main();
