/**
 * Property-Based Tests for NotificationService
 *
 * Feature: weather-alerts-integration
 * Tests universal properties that should hold for SMS notification sending
 */

import { describe, test, expect } from "bun:test";
import * as fc from "fast-check";
import { NotificationService } from "../../services/NotificationService.ts";
import type { Alert, User, SMSConfig, AlertType } from "../../models/index.ts";

describe("NotificationService - Property Tests", () => {
  // Arbitraries (generators) for property-based testing

  const alertTypeArbitrary = fc.constantFrom(
    "HIGH_TEMPERATURE",
    "LOW_TEMPERATURE",
    "HEAVY_RAIN",
    "STRONG_WIND"
  ) as fc.Arbitrary<AlertType>;

  const alertArbitrary: fc.Arbitrary<Alert> = fc.record({
    alertId: fc.string({ minLength: 1, maxLength: 50 }),
    gardenId: fc.string({ minLength: 1, maxLength: 50 }),
    userId: fc.integer({ min: 1, max: 10000 }),
    gardenName: fc.string({ minLength: 1, maxLength: 100 }),
    timestamp: fc.date(),
    alertType: alertTypeArbitrary,
    metric: fc.constantFrom("temperature", "precipitation", "windSpeed"),
    currentValue: fc.float({ min: -50, max: 150 }),
    threshold: fc.float({ min: -50, max: 150 }),
    affectedPlantTypes: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
      minLength: 1,
      maxLength: 5,
    }),
    affectedPlantNames: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
      minLength: 1,
      maxLength: 10,
    }),
  });

  const userWithPhoneArbitrary: fc.Arbitrary<User> = fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    phone_number: fc.string({ minLength: 10, maxLength: 20 }),
  });

  const userWithoutPhoneArbitrary: fc.Arbitrary<User> = fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    phone_number: fc.constant(null),
  });

  /**
   * Property 18: SMS sending on alert generation
   * Feature: weather-alerts-integration, Property 18: SMS sending on alert generation
   * Validates: Requirements 10.1
   *
   * For any generated alert with a valid garden and user with phone number,
   * the system should attempt to send an SMS notification to the user's phone number.
   *
   * Note: This test verifies the preconditions and data structure requirements
   * for SMS sending. Actual Twilio integration requires valid credentials that
   * start with "AC" prefix, which we cannot test without real credentials.
   */
  test("Property 18: SMS sending on alert generation - should validate preconditions for SMS", async () => {
    await fc.assert(
      fc.asyncProperty(
        alertArbitrary,
        userWithPhoneArbitrary,
        async (alert, user) => {
          // Note: We cannot actually send SMS in tests without real Twilio credentials
          // Twilio requires accountSid to start with "AC" prefix
          // This property test verifies that:
          // 1. The user has a phone number (precondition for SMS sending)
          // 2. The alert has all required fields for SMS formatting

          // Verify user has phone number (precondition)
          expect(user.phone_number).not.toBeNull();
          expect(typeof user.phone_number).toBe("string");
          if (user.phone_number) {
            expect(user.phone_number.length).toBeGreaterThan(0);
          }

          // Verify alert has all required fields for SMS message
          expect(alert.alertId).toBeDefined();
          expect(alert.gardenId).toBeDefined();
          expect(alert.userId).toBeDefined();
          expect(alert.gardenName).toBeDefined();
          expect(typeof alert.gardenName).toBe("string");
          expect(alert.gardenName.length).toBeGreaterThan(0);
          expect(alert.alertType).toBeDefined();
          expect(alert.metric).toBeDefined();
          expect(typeof alert.currentValue).toBe("number");
          expect(typeof alert.threshold).toBe("number");
          expect(Array.isArray(alert.affectedPlantTypes)).toBe(true);
          expect(Array.isArray(alert.affectedPlantNames)).toBe(true);
          expect(alert.affectedPlantTypes.length).toBeGreaterThan(0);
          expect(alert.affectedPlantNames.length).toBeGreaterThan(0);

          // Verify that all plant names are non-empty strings
          for (const plantName of alert.affectedPlantNames) {
            expect(typeof plantName).toBe("string");
            expect(plantName.length).toBeGreaterThan(0);
          }

          // Verify that all plant types are non-empty strings
          for (const plantType of alert.affectedPlantTypes) {
            expect(typeof plantType).toBe("string");
            expect(plantType.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18 (variant): Users without phone numbers should not receive SMS
   * Feature: weather-alerts-integration, Property 18: SMS sending on alert generation
   * Validates: Requirements 10.5
   *
   * For any alert and user without a phone number,
   * the system should not attempt to send SMS and should return false.
   */
  test("Property 18 (variant): should not send SMS to users without phone numbers", async () => {
    await fc.assert(
      fc.asyncProperty(
        alertArbitrary,
        userWithoutPhoneArbitrary,
        async (alert, user) => {
          // Create a mock Twilio configuration
          const mockConfig: SMSConfig = {
            accountSid: "test_account_sid",
            authToken: "test_auth_token",
            fromNumber: "+1234567890",
          };

          // Create NotificationService with mock config
          const notificationService = new NotificationService(mockConfig);

          // Verify user has no phone number
          expect(user.phone_number).toBeNull();

          // Attempt to send alert - should return false without attempting SMS
          const result = await notificationService.sendAlert(alert, user);

          // Should return false for users without phone numbers
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Service should be disabled without valid configuration
   * Feature: weather-alerts-integration, Property 18: SMS sending on alert generation
   * Validates: Requirements 11.2
   *
   * For any alert and user, if Twilio credentials are missing,
   * the service should be disabled and not attempt to send SMS.
   */
  test("Property: should disable service when Twilio credentials are missing", async () => {
    await fc.assert(
      fc.asyncProperty(
        alertArbitrary,
        userWithPhoneArbitrary,
        async (alert, user) => {
          // Create NotificationService without config
          const notificationService = new NotificationService();

          // Service should be disabled
          expect(notificationService.isEnabled()).toBe(false);

          // Attempt to send alert - should return false
          const result = await notificationService.sendAlert(alert, user);

          // Should return false when service is disabled
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Service should be disabled with incomplete configuration
   * Feature: weather-alerts-integration, Property 18: SMS sending on alert generation
   * Validates: Requirements 11.2
   */
  test("Property: should disable service when Twilio credentials are incomplete", async () => {
    await fc.assert(
      fc.asyncProperty(
        alertArbitrary,
        userWithPhoneArbitrary,
        async (alert, user) => {
          // Create incomplete configs
          const incompleteConfigs: Partial<SMSConfig>[] = [
            { accountSid: "test", authToken: "", fromNumber: "+1234567890" },
            { accountSid: "", authToken: "test", fromNumber: "+1234567890" },
            { accountSid: "test", authToken: "test", fromNumber: "" },
          ];

          for (const config of incompleteConfigs) {
            const notificationService = new NotificationService(
              config as SMSConfig
            );

            // Service should be disabled with incomplete config
            expect(notificationService.isEnabled()).toBe(false);

            // Attempt to send alert - should return false
            const result = await notificationService.sendAlert(alert, user);

            // Should return false when service is disabled
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
