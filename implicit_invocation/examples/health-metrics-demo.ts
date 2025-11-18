/**
 * Health Check and Metrics Demo
 *
 * Demonstrates the health check and metrics endpoints
 */

async function testHealthEndpoint() {
  console.log("\n=== Testing Health Check Endpoint ===\n");

  try {
    const response = await fetch("http://localhost:3002/health");
    const data = await response.json();

    console.log("Status Code:", response.status);
    console.log("Health Check Result:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to fetch health check:", error);
  }
}

async function testMetricsEndpoint() {
  console.log("\n=== Testing Metrics Endpoint ===\n");

  try {
    const response = await fetch("http://localhost:3002/metrics");
    const data = await response.json();

    console.log("Status Code:", response.status);
    console.log("Metrics:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
  }
}

async function main() {
  console.log("Health Check and Metrics Demo");
  console.log("==============================");
  console.log("Make sure the server is running on port 3002");

  // Wait a moment for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testHealthEndpoint();
  await testMetricsEndpoint();

  console.log("\n=== Demo Complete ===\n");
}

main();
