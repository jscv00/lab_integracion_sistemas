/**
 * WeatherService Error Handling Test
 *
 * Test error handling capabilities
 */

import { WeatherService } from "../services/WeatherService.ts";

async function main() {
  const weatherService = new WeatherService();

  console.log("=== WeatherService Error Handling Test ===\n");

  // Test with valid coordinates
  console.log("Test 1: Valid coordinates (Madrid)");
  const validWeather = await weatherService.fetchWeather(40.4168, -3.7038);
  console.log(validWeather ? "✅ Success" : "❌ Failed");

  // Test with extreme coordinates (should still work or return null gracefully)
  console.log("\nTest 2: Extreme coordinates (North Pole)");
  const extremeWeather = await weatherService.fetchWeather(90, 0);
  console.log(extremeWeather ? "✅ Success" : "❌ Failed (expected)");

  console.log("\n=== Test Complete ===");
}

main();
