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
      condition = Math.floor(elapsed / cycleInterval) % 2 === 0 ? "healthy" : "warning";
    }

    console.log(`[TestSensorService] Generating ${condition} condition data`);

    const rawSetpoint = baseSensorData.setpoint;
    const setpoint = (typeof rawSetpoint === "number" && rawSetpoint >= 16 && rawSetpoint <= 30)
      ? rawSetpoint
      : 20;

    const rawOutdoor = baseSensorData.outdoor_temp;
    const outdoorTemp = (typeof rawOutdoor === "number" && rawOutdoor > 0)
      ? rawOutdoor
      : 30;

    if (condition === "healthy") {
      // Healthy condition: supply_temp is within 16-30°C (e.g. setpoint + 1°C = 21°C)
      const supplyTemp = Math.min(30, Math.max(16, setpoint + 1));
      return {
        ...baseSensorData,
        setpoint: setpoint,
        supply_temp: supplyTemp, // 21°C (Healthy & within 16-30°C)
        indoor_temp: outdoorTemp - 5, // e.g. 25°C
        outdoor_temp: outdoorTemp,
        power: 1200,
        humidity: 45,
      };
    } else if (condition === "warning") {
      // Warning condition: supply_temp is within 16-30°C (e.g. setpoint + 7°C = 27°C)
      const supplyTemp = Math.min(30, Math.max(16, setpoint + 7));
      return {
        ...baseSensorData,
        setpoint: setpoint,
        supply_temp: supplyTemp, // 27°C (Warning & within 16-30°C)
        indoor_temp: outdoorTemp + 1, // e.g. 31°C
        outdoor_temp: outdoorTemp,
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
