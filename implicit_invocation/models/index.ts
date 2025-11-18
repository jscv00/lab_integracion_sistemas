/**
 * Data Models
 *
 * This module exports TypeScript interfaces and types for the weather alerts system.
 * Models represent the structure of data flowing through the system.
 */

// Garden configuration model
export interface Garden {
  gardenId: string;
  userId: number;
  name: string;
  latitude: number;
  longitude: number;
}

// Plant sensitivity profile model
export interface SensitivityProfile {
  plantType: string;
  maxTemperature: number; // °C
  minTemperature: number; // °C
  maxPrecipitation: number; // mm/h
  maxWindSpeed: number; // km/h
}

// Weather data from Open-Meteo API
export interface WeatherData {
  temperature: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number;
  windSpeed: number;
  timestamp: Date;
}

// Plant data from Backend Mi Huerta
export interface Plant {
  id: number;
  user_id: number;
  name: string;
  type: string;
  planted_at: string;
  notes: string;
  created_at: string;
}

// User data from Backend Mi Huerta
export interface User {
  id: number;
  name: string;
  phone_number: string | null;
}

// Alert types
export type AlertType =
  | "HIGH_TEMPERATURE"
  | "LOW_TEMPERATURE"
  | "HEAVY_RAIN"
  | "STRONG_WIND";

// Alert model
export interface Alert {
  alertId: string;
  gardenId: string;
  userId: number;
  gardenName: string;
  timestamp: Date;
  alertType: AlertType;
  metric: string;
  currentValue: number;
  threshold: number;
  affectedPlantTypes: string[];
  affectedPlantNames: string[];
}

// SMS configuration
export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}
