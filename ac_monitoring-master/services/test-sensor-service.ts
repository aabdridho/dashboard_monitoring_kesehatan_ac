import type { SensorReading } from "@/types/sensor";

export type TestCondition = "healthy" | "warning" | "mixed" | "none";

interface TestServiceConfig {
  condition: TestCondition;
  cycleInterval?: number; // ms untuk switching antar kondisi
}

class TestSensorService {
  private config: TestServiceConfig = { condition: "none" };
  private cycleTime = 0;

  setCondition(condition: TestCondition, cycleInterval = 5000) {
    this.config = { condition, cycleInterval };
    this.cycleTime = Date.now();
    console.log(
      `[TestSensorService] Condition set to: ${condition} with cycle interval: ${cycleInterval}ms`
    );
  }

  getCondition(): TestCondition {
    return this.config.condition;
  }

  generateTestReading(baseSensorData: Partial<SensorReading>): Partial<SensorReading> {
    if (this.config.condition === "none") {
      return baseSensorData;
    }

    const now = Date.now();
    const elapsed = now - this.cycleTime;
    const cycleInterval = this.config.cycleInterval || 5000;

    let condition = this.config.condition;
    if (this.config.condition === "mixed") {
      // Berganti kondisi setiap cycleInterval
      condition = Math.floor(elapsed / cycleInterval) % 2 === 0 ? "healthy" : "warning";
    }

    console.log(`[TestSensorService] Generating ${condition} condition data`);

    const setpoint = baseSensorData.setpoint ?? 21;
    const outdoorTemp = baseSensorData.outdoor_temp ?? 30;

    if (condition === "healthy") {
      // RULE 1: Normal disparity, Turun delta, Normal power
      return {
        ...baseSensorData,
        // Disparity Normal: Mendekati 0°C (0-2°C range)
        setpoint: setpoint,
        supply_temp: setpoint + 0.5, // Disparity ≈ 0.5°C (Normal)
        // Delta Turun: Indoor jauh di bawah outdoor
        indoor_temp: outdoorTemp - 5, // Indoor 5°C lebih rendah (Turun)
        outdoor_temp: outdoorTemp,
        // Power Normal: Konsumsi stabil (200-1800W)
        power: 1200,
        humidity: 45,
      };
    } else if (condition === "warning") {
      // RULE 2 & 3: Tinggi disparity, TetapNaik delta, Normal/TidakNormal power
      return {
        ...baseSensorData,
        // Disparity Tinggi: Selisih besar (3-8°C range)
        setpoint: setpoint,
        supply_temp: setpoint + 5, // Disparity ≈ 5°C (Tinggi)
        // Delta TetapNaik: Indoor mendekati/di atas outdoor
        indoor_temp: outdoorTemp + 1, // Indoor 1°C lebih tinggi (TetapNaik)
        outdoor_temp: outdoorTemp,
        // Power TidakNormal: Konsumsi tinggi (2000-3000W)
        power: 2500,
        humidity: 60,
      };
    }

    return baseSensorData;
  }

  reset() {
    this.config = { condition: "none" };
    console.log("[TestSensorService] Reset to normal mode");
  }
}

let testService: TestSensorService | null = null;

export function getTestSensorService(): TestSensorService {
  if (!testService) {
    testService = new TestSensorService();
  }
  return testService;
}
