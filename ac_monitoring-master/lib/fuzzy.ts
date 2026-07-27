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

/**
 * Membership Function: Triangular
 */
function triangularMF(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/**
 * Membership Function: Trapezoidal
 *
 * Uses strict < for lower bound so that left-shoulder trapezoids
 * (where a === b) correctly return 1.0 at x = a = b.
 */
function trapezoidalMF(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

/**
 * Fuzzifikasi untuk disparitasSuhuOut (°C)
 * Range: 0-10°C
 *
 * Disparitas = |setpoint - supply_temp|
 * AC baru diservis: supply ≈ setpoint, disparitas ≈ 0-4 → Normal
 * AC bermasalah: supply jauh dari setpoint, disparitas > 5 → Tinggi
 */
function fuzzifyDisparitasSuhu(disparity: number): {
  normal: number;
  tinggi: number;
} {
  const dispClamped = Math.max(0, Math.min(10, disparity));

  return {
    // Normal: 0-5°C (trapesium: -1, 0, 5, 7)
    normal: trapezoidalMF(dispClamped, -1, 0, 5, 7),
    // Tinggi: >5°C (trapesium: 5, 7, 10, 12)
    tinggi: trapezoidalMF(dispClamped, 5, 7, 10, 12),
  };
}

/**
 * Fuzzifikasi untuk deltaSuhuRoom (°C)
 * Range: -10 sampai 10°C
 *
 * delta = indoor - outdoor
 * AC mendinginkan ruangan: indoor < outdoor → delta negatif → Turun (baik)
 * Suhu ruangan stabil/nyaman: delta sekitar 0 → TetapNaik
 * AC baru diservis: indoor ≈ outdoor → delta ≈ 0
 */
function fuzzifyDeltaSuhuRoom(delta: number): {
  turun: number;
  tetapNaik: number;
} {
  const deltaClamped = Math.max(-10, Math.min(10, delta));

  return {
    // Turun: Suhu indoor jauh di bawah outdoor (trapesium: -10, -8, -2, -0.5)
    turun: trapezoidalMF(deltaClamped, -10, -8, -2, -0.5),
    // TetapNaik: Suhu stagnan/ruangan nyaman (trapesium: -2, -0.5, 5, 10)
    tetapNaik: trapezoidalMF(deltaClamped, -2, -0.5, 5, 10),
  };
}

/**
 * Fuzzifikasi untuk konsumsikWh (Watt)
 * Range: 0-3000W
 *
 * AC standby/normal: 0-1800W → Normal
 * AC overload: >2000W → TidakNormal
 */
function fuzzifyKonsumsiKwh(power: number): {
  normal: number;
  tidakNormal: number;
} {
  const powerClamped = Math.max(0, Math.min(3000, power));

  return {
    // Normal: Daya AC normal dan standby (trapesium: -1, 0, 1800, 2200)
    normal: trapezoidalMF(powerClamped, -1, 0, 1800, 2200),
    // TidakNormal: Daya overload (trapesium: 1800, 2200, 2800, 3200)
    tidakNormal: trapezoidalMF(powerClamped, 1800, 2200, 2800, 3200),
  };
}

/**
 * Output Membership Functions untuk Status Score (0-100)
 */
function outputMembershipHealthy(score: number): number {
  // Healthy: Triangular (50, 80, 100)
  return triangularMF(score, 50, 80, 100);
}

function outputMembershipWarning(score: number): number {
  // Warning: Triangular (0, 20, 50)
  return triangularMF(score, 0, 20, 50);
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
  // Ini rule utama untuk AC baru diservis: disparitas kecil, suhu stabil, daya normal
  const rule4 = Math.min(disparityMF.normal, deltaMF.tetapNaik, powerMF.normal);

  // RULE 5: IF (disparitas Normal) AND (delta Turun) AND (power TidakNormal) THEN warning
  const rule5 = Math.min(disparityMF.normal, deltaMF.turun, powerMF.tidakNormal);

  // RULE 6: IF (disparitas Tinggi) AND (delta Turun) AND (power Normal) THEN warning
  const rule6 = Math.min(disparityMF.tinggi, deltaMF.turun, powerMF.normal);

  // RULE 7: IF (disparitas Tinggi) AND (delta Turun) AND (power TidakNormal) THEN warning
  const rule7 = Math.min(disparityMF.tinggi, deltaMF.turun, powerMF.tidakNormal);

  return {
    healthyStrength: Math.max(rule1, rule4),
    warningStrength: Math.max(rule2, rule3, rule5, rule6, rule7),
  };
}

/**
 * Defuzzifikasi Centroid (Center of Gravity)
 */
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

  // Jika tidak ada rule yang aktif, default ke healthy (AC beroperasi normal)
  return denominator === 0 ? 80 : numerator / denominator;
}

/**
 * Fungsi Utama: Evaluasi Status Kesehatan AC
 */
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

/**
 * Adapter: Evaluasi status dari data SensorReading
 *
 * Jika data sensor tidak lengkap (field bernilai 0 dari merge default),
 * fungsi ini akan mengembalikan "healthy" karena kita tidak bisa
 * membuat penilaian yang akurat dari data yang tidak lengkap.
 */
export function deriveACStatusFromSensors(reading: {
  setpoint?: number;
  supply_temp?: number;
  indoor_temp?: number;
  outdoor_temp?: number;
  power?: number;
}): "healthy" | "warning" {
  const hasSupplyTemp = typeof reading.supply_temp === "number" && reading.supply_temp > 0;
  const hasIndoorTemp = typeof reading.indoor_temp === "number" && reading.indoor_temp > 0;
  const hasOutdoorTemp = typeof reading.outdoor_temp === "number" && reading.outdoor_temp > 0;

  // Jika data sensor kunci tidak tersedia, default ke healthy
  // (data 0 berasal dari merge default Firebase, bukan sensor asli)
  if (!hasSupplyTemp && !hasIndoorTemp) return "healthy";

  const rawSetpoint = reading.setpoint && reading.setpoint > 0 ? reading.setpoint : 22;
  const setpoint = Math.max(16, Math.min(30, rawSetpoint));
  const supplyTemp = hasSupplyTemp
    ? Math.max(16, Math.min(30, reading.supply_temp!))
    : setpoint;
  const indoorTemp = hasIndoorTemp ? reading.indoor_temp! : 24;
  const outdoorTemp = hasOutdoorTemp ? reading.outdoor_temp! : indoorTemp + 2;
  const power = reading.power ?? 0;

  const disparitasSuhuOut = Math.abs(supplyTemp - setpoint);
  const deltaSuhuRoom = indoorTemp - outdoorTemp;

  const { status } = evaluateACHealth(disparitasSuhuOut, deltaSuhuRoom, power);

  return status;
}
