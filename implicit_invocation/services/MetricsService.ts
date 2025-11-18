/**
 * MetricsService
 *
 * Tracks system metrics including alert counts, SMS success rates,
 * and API latencies.
 *
 * Requirements: Task 13 - Metrics and observability
 */

export interface AlertMetrics {
  HIGH_TEMPERATURE: number;
  LOW_TEMPERATURE: number;
  HEAVY_RAIN: number;
  STRONG_WIND: number;
}

export interface SMSMetrics {
  sent: number;
  failed: number;
  successRate: number;
}

export interface APILatencyMetrics {
  openmeteo: {
    count: number;
    totalLatency: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
  };
  backend: {
    count: number;
    totalLatency: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
  };
}

export interface SystemMetrics {
  alerts: AlertMetrics;
  sms: SMSMetrics;
  apiLatency: APILatencyMetrics;
  uptime: number;
  lastReset: Date;
}

export class MetricsService {
  private alertCounts: AlertMetrics;
  private smsSent: number;
  private smsFailed: number;
  private openMeteoLatencies: number[];
  private backendLatencies: number[];
  private startTime: Date;

  constructor() {
    this.alertCounts = {
      HIGH_TEMPERATURE: 0,
      LOW_TEMPERATURE: 0,
      HEAVY_RAIN: 0,
      STRONG_WIND: 0,
    };
    this.smsSent = 0;
    this.smsFailed = 0;
    this.openMeteoLatencies = [];
    this.backendLatencies = [];
    this.startTime = new Date();
  }

  /**
   * Record an alert generation
   */
  recordAlert(alertType: string): void {
    if (alertType in this.alertCounts) {
      this.alertCounts[alertType as keyof AlertMetrics]++;
    }
  }

  /**
   * Record a successful SMS send
   */
  recordSMSSuccess(): void {
    this.smsSent++;
  }

  /**
   * Record a failed SMS send
   */
  recordSMSFailure(): void {
    this.smsFailed++;
  }

  /**
   * Record Open-Meteo API latency
   */
  recordOpenMeteoLatency(latencyMs: number): void {
    this.openMeteoLatencies.push(latencyMs);
    // Keep only last 100 measurements
    if (this.openMeteoLatencies.length > 100) {
      this.openMeteoLatencies.shift();
    }
  }

  /**
   * Record Backend API latency
   */
  recordBackendLatency(latencyMs: number): void {
    this.backendLatencies.push(latencyMs);
    // Keep only last 100 measurements
    if (this.backendLatencies.length > 100) {
      this.backendLatencies.shift();
    }
  }

  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics {
    const totalSMS = this.smsSent + this.smsFailed;
    const successRate = totalSMS > 0 ? this.smsSent / totalSMS : 0;

    const uptime = Date.now() - this.startTime.getTime();

    return {
      alerts: { ...this.alertCounts },
      sms: {
        sent: this.smsSent,
        failed: this.smsFailed,
        successRate: Math.round(successRate * 100) / 100,
      },
      apiLatency: {
        openmeteo: this.calculateLatencyStats(this.openMeteoLatencies),
        backend: this.calculateLatencyStats(this.backendLatencies),
      },
      uptime: Math.floor(uptime / 1000), // Convert to seconds
      lastReset: this.startTime,
    };
  }

  /**
   * Calculate latency statistics
   */
  private calculateLatencyStats(latencies: number[]): {
    count: number;
    totalLatency: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
  } {
    if (latencies.length === 0) {
      return {
        count: 0,
        totalLatency: 0,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
      };
    }

    const total = latencies.reduce((sum, lat) => sum + lat, 0);
    const avg = total / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);

    return {
      count: latencies.length,
      totalLatency: Math.round(total),
      averageLatency: Math.round(avg * 10) / 10,
      minLatency: Math.round(min),
      maxLatency: Math.round(max),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.alertCounts = {
      HIGH_TEMPERATURE: 0,
      LOW_TEMPERATURE: 0,
      HEAVY_RAIN: 0,
      STRONG_WIND: 0,
    };
    this.smsSent = 0;
    this.smsFailed = 0;
    this.openMeteoLatencies = [];
    this.backendLatencies = [];
    this.startTime = new Date();
  }
}
