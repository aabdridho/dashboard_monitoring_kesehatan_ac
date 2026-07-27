/**
 * Fuzzy Logic Membership Functions & Mamdani Inference Engine
 *
 * Input Variables:
 * - disparitasSuhuOut: Selisih |Setpoint - Suhu Supply| (°C)
 * - deltaSuhuRoom: Selisih Suhu Indoor vs Outdoor (°C)
 * - konsumsikWh: Konsumsi energi AC dalam Watt
 *
 * Output Variable:
 * - statusSkor: 0-100 (Centroid Defuzzification)
 * - Threshold: >= 60 = "healthy", < 60 = "warning"
 */

function triangularMF(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

function trapezoidalMF(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

/**
 * Fuzzifikasi untuk disparitasSuhuOut (°C)
 * Range: 0-8°C
 */
function fuzzifyDisparitasSuhu(disparity: number): {
  normal: number;
  tinggi: number;
} {
  const dispClamped = Math.max(0, Math.min(8, disparity));

  return {
    // Normal: Mendekati 0-4.5°C (trapesium: 0, 0, 4.5, 6)
    normal: trapezoidalMF(dispClamped, 0, 0, 4.5, 6),
    // Tinggi: Selisih besar di atas 4.5°C (trapesium: 4.5, 6, 8, 10)
    tinggi: trapezoidalMF(dispClamped, 4.5, 6, 8, 10),
  };
}

/**
 * Fuzzifikasi untuk deltaSuhuRoom (°C)
 * Range: -5 sampai 5°C (negatif = turun, positif = naik/stabil)
 */
function fuzzifyDeltaSuhuRoom(delta: number): {
  turun: number;
  tetapNaik: number;
} {
  const deltaClamped = Math.max(-5, Math.min(5, delta));

  return {
    // Turun: Suhu indoor turun signifikan (trapesium: -5, -4, -1.5, -0.5)
    turun: trapezoidalMF(deltaClamped, -5, -4, -1.5, -0.5),
    // TetapNaik: Suhu stagnan/ruangan nyaman (trapesium: -1, 0, 3, 5)
    tetapNaik: trapezoidalMF(deltaClamped, -1, 0, 3, 5),
  };
}

/**
 * Fuzzifikasi untuk konsumsikWh (Watt)
 * Range: 0-3000W
 */
function fuzzifyKonsumsiKwh(power: number): {
  normal: number;
  tidakNormal: number;
} {
  const powerClamped = Math.max(0, Math.min(3000, power));

  return {
    // Normal: Konsumsi daya normal AC (0W-1800W)
    normal: trapezoidalMF(powerClamped, 0, 0, 1800, 2200),
    // TidakNormal: Konsumsi daya overload/sangat tinggi (> 2000W)
    tidakNormal: trapezoidalMF(powerClamped, 1800, 2200, 2800, 3000),
  };
}

function outputMembershipHealthy(score: number): number {
  return triangularMF(score, 60, 80, 100);
}

function outputMembershipWarning(score: number): number {
  return triangularMF(score, 0, 20, 60);
}

interface MamdaniRuleResult {
  healthyStrength: number;
  warningStrength: number;
}

function evaluateMamdaniRules(
  disparityMF: ReturnType<typeof fuzzifyDisparitasSuhu>,
  deltaMF: ReturnType<typeof fuzzifyDeltaSuhuRoom>,
  powerMF: ReturnType<typeof fuzzifyKonsumsiKwh>
): MamdaniRuleResult {
  // RULE 1: IF (disparitas Normal) AND (delta Turun) AND (power Normal) THEN healthy
  const rule1 = Math.min(disparityMF.normal, deltaMF.turun, powerMF.normal);

  // RULE 2: IF (disparitas Tinggi) AND (delta TetapNaik) AND (power Normal) THEN warning
  const rule2 = Math.min(disparityMF.tinggi, deltaMF.tetapNaik, powerMF.normal);

  // RULE 3: IF (disparitas Tinggi) AND (delta TetapNaik) AND (power TidakNormal) THEN warning
  const rule3 = Math.min(disparityMF.tinggi, deltaMF.tetapNaik, powerMF.tidakNormal);

  // RULE 4: IF (disparitas Normal) AND (delta TetapNaik) AND (power Normal) THEN healthy
  const rule4 = Math.min(disparityMF.normal, deltaMF.tetapNaik, powerMF.normal);

  // RULE 5: IF (disparitas Normal) AND (delta Turun) AND (power TidakNormal) THEN warning
  const rule5 = Math.min(disparityMF.normal, deltaMF.turun, powerMF.tidakNormal);

  // RULE 6: IF (disparitas Normal) AND (delta TetapNaik) AND (power TidakNormal) THEN warning
  const rule6 = Math.min(disparityMF.normal, deltaMF.tetapNaik, powerMF.tidakNormal);

  return {
    healthyStrength: Math.max(rule1, rule4),
    warningStrength: Math.max(rule2, rule3, rule5, rule6),
  };
}

function defuzzifyCentroid(
  healthyStrength: number,
  warningStrength: number
): number {
  const samples = 100;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i <= samples; i++) {
    const score = (i / samples) * 100;
    const membershipValue = Math.max(
      outputMembershipHealthy(score) * healthyStrength,
      outputMembershipWarning(score) * warningStrength
    );

    numerator += score * membershipValue;
    denominator += membershipValue;
  }

  return denominator === 0 ? 50 : numerator / denominator;
}

export function evaluateACHealth(
  disparitasSuhuOut: number,
  deltaSuhuRoom: number,
  konsumsikWh: number
): { status: "healthy" | "warning"; score: number } {
  const disparityMF = fuzzifyDisparitasSuhu(disparitasSuhuOut);
  const deltaMF = fuzzifyDeltaSuhuRoom(deltaSuhuRoom);
  const powerMF = fuzzifyKonsumsiKwh(konsumsikWh);

  const ruleResult = evaluateMamdaniRules(disparityMF, deltaMF, powerMF);

  const score = defuzzifyCentroid(
    ruleResult.healthyStrength,
    ruleResult.warningStrength
  );

  const status = score >= 60 ? "healthy" : "warning";

  return { status, score };
}

export function deriveACStatusFromSensors(reading: {
  setpoint?: number;
  supply_temp?: number;
  indoor_temp?: number;
  outdoor_temp?: number;
  power?: number;
}): "healthy" | "warning" {
  const rawSetpoint = reading.setpoint && reading.setpoint > 0 ? reading.setpoint : 22;
  const setpoint = Math.max(16, Math.min(30, rawSetpoint));
  const rawSupplyTemp = reading.supply_temp && reading.supply_temp > 0 ? reading.supply_temp : setpoint;
  const supplyTemp = Math.max(16, Math.min(30, rawSupplyTemp));
  const indoorTemp = reading.indoor_temp && reading.indoor_temp > 0 ? reading.indoor_temp : 24;
  const outdoorTemp = reading.outdoor_temp && reading.outdoor_temp > 0 ? reading.outdoor_temp : indoorTemp + 2;
  const power = reading.power ?? 0;

  const disparitasSuhuOut = Math.abs(supplyTemp - setpoint);
  const deltaSuhuRoom = indoorTemp - outdoorTemp;

  const { status } = evaluateACHealth(disparitasSuhuOut, deltaSuhuRoom, power);

  return status;
}
