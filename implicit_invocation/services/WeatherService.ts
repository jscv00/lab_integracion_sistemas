/**
 * WeatherService
 *
 * Service responsible for fetching weather data from Open-Meteo API.
 * Handles API requests, response parsing, and error management.
 */

import type { WeatherData } from "../models/index.ts";

export class WeatherService {
  private readonly baseUrl = "https://api.open-meteo.com/v1/forecast";

  /**
   * Fetch current weather data for a specific location
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns WeatherData object or null if API fails
   */
  async fetchWeather(
    latitude: number,
    longitude: number,
    recordLatency?: (latency: number) => void
  ): Promise<WeatherData | null> {
    const startTime = Date.now();

    try {
      const url = this.buildWeatherUrl(latitude, longitude);
      console.log(
        `[WeatherService] Fetching weather for lat=${latitude}, lon=${longitude}`
      );

      const response = await fetch(url);
      const latency = Date.now() - startTime;

      // Record latency if callback provided
      if (recordLatency) {
        recordLatency(latency);
      }

      if (!response.ok) {
        console.error(
          `[WeatherService] Open-Meteo API returned status ${response.status}`
        );
        return null;
      }

      const data = await response.json();
      const weatherData = this.parseWeatherResponse(data);

      console.log(
        `[WeatherService] Successfully fetched weather: temp=${weatherData.temperature}°C, precip=${weatherData.precipitation}mm, wind=${weatherData.windSpeed}km/h (${latency}ms)`
      );

      return weatherData;
    } catch (error) {
      const latency = Date.now() - startTime;
      if (recordLatency) {
        recordLatency(latency);
      }

      console.error(
        `[WeatherService] Error fetching weather data:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Build the Open-Meteo API URL with required parameters
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Complete API URL
   */
  private buildWeatherUrl(latitude: number, longitude: number): string {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: "temperature_2m,precipitation,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min",
      timezone: "auto",
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Parse Open-Meteo API response into WeatherData object
   *
   * @param data - Raw API response
   * @returns Parsed WeatherData object
   */
  private parseWeatherResponse(data: any): WeatherData {
    const current = data.current || {};
    const daily = data.daily || {};

    return {
      temperature: current.temperature_2m ?? 0,
      temperatureMax: daily.temperature_2m_max?.[0] ?? 0,
      temperatureMin: daily.temperature_2m_min?.[0] ?? 0,
      precipitation: current.precipitation ?? 0,
      windSpeed: current.wind_speed_10m ?? 0,
      timestamp: new Date(),
    };
  }
}
