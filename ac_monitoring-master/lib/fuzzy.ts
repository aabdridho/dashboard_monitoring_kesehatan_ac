/**
 * Logika Fuzzy Mamdani untuk Monitoring Kesehatan AC
 *
 * Input Variables:
 * - disparitasSuhuOut: Selisih |Setpoint - Suhu Keluaran| dalam °C
 * - deltaSuhuRoom: Tren penurunan suhu ruangan terhadap outdoor
 * - konsumsikWh: Konsumsi energi AC dalam Watt
 *
 * Output Variable:
 * - statusSkor: 0-100 (Centroid Defuzzification)
 * - Threshold: >= 60 = "healthy", < 60 = "warning"
 */

/**
 * Membership Function: Triangular
 * Menghitung derajat keanggotaan untuk bentuk segitiga
 */
function triangularMF(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/**
 * Membership Function: Trapezoidal
 * Menghitung derajat keanggotaan untuk bentuk trapesium
 */
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
    // Normal: Mendekati 0°C (segitiga: 0, 0, 2)
    normal: triangularMF(dispClamped, 0, 0, 2),
    // Tinggi: Selisih besar (trapesium: 1.5, 3, 6, 8)
    tinggi: trapezoidalMF(dispClamped, 1.5, 3, 6, 8),
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
    // TetapNaik: Suhu stagnan atau naik (trapesium: -1, 0.5, 2, 5)
    tetapNaik: trapezoidalMF(deltaClamped, -1, 0.5, 2, 5),
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
    // Normal: Konsumsi stabil (trapesium: 0, 200, 1200, 1800)
    normal: trapezoidalMF(powerClamped, 0, 200, 1200, 1800),
    // TidakNormal: Konsumsi tinggi/overload (trapesium: 1500, 2000, 2500, 3000)
    tidakNormal: trapezoidalMF(powerClamped, 1500, 2000, 2500, 3000),
  };
}

/**
 * Output Membership Functions untuk Status Score (0-100)
 */
function outputMembershipHealthy(score: number): number {
  // Healthy: Triangular (60, 80, 100)
  return triangularMF(score, 60, 80, 100);
}

function outputMembershipWarning(score: number): number {
  // Warning: Triangular (0, 20, 60)
  return triangularMF(score, 0, 20, 60);
}

/**
 * Inferensi Mamdani & Agregasi
 * Mengevaluasi rules dan mengagregasi menggunakan MAX
 */
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
  const rule1 =
    Math.min(disparityMF.normal, deltaMF.turun, powerMF.normal);

  // RULE 2: IF (disparitas Tinggi) AND (delta TetapNaik) AND (power Normal) THEN warning
  const rule2 =
    Math.min(disparityMF.tinggi, deltaMF.tetapNaik, powerMF.normal);

  // RULE 3: IF (disparitas Tinggi) AND (delta TetapNaik) AND (power TidakNormal) THEN warning
  const rule3 =
    Math.min(disparityMF.tinggi, deltaMF.tetapNaik, powerMF.tidakNormal);

  // Agregasi: MAX untuk setiap output
  return {
    healthyStrength: rule1,
    warningStrength: Math.max(rule2, rule3),
  };
}

/**
 * Defuzzifikasi Centroid (Center of Gravity)
 * Mengkonversi fuzzy output menjadi crisp value (0-100)
 */
function defuzzifyCentroid(
  healthyStrength: number,
  warningStrength: number
): number {
  // Sampling resolution untuk Centroid
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

/**
 * Fungsi Utama: Evaluasi Status Kesehatan AC
 *
 * @param disparitasSuhuOut - Selisih |Setpoint - Suhu Keluaran| dalam °C
 * @param deltaSuhuRoom - Tren penurunan suhu ruangan vs outdoor dalam °C
 * @param konsumsikWh - Konsumsi energi dalam Watt
 * @returns { status: "healthy" | "warning", score: number }
 */
export function evaluateACHealth(
  disparitasSuhuOut: number,
  deltaSuhuRoom: number,
  konsumsikWh: number
): { status: "healthy" | "warning"; score: number } {
  // Fuzzifikasi input
  const disparityMF = fuzzifyDisparitasSuhu(disparitasSuhuOut);
  const deltaMF = fuzzifyDeltaSuhuRoom(deltaSuhuRoom);
  const powerMF = fuzzifyKonsumsiKwh(konsumsikWh);

  // Debug logging (optional)
  console.log(
    "[Fuzzy Debug] Disparitas Suhu:",
    disparitasSuhuOut,
    "=>",
    disparityMF
  );
  console.log(
    "[Fuzzy Debug] Delta Suhu Room:",
    deltaSuhuRoom,
    "=>",
    deltaMF
  );
  console.log(
    "[Fuzzy Debug] Konsumsi kWh:",
    konsumsikWh,
    "=>",
    powerMF
  );

  // Inferensi Mamdani
  const ruleResult = evaluateMamdaniRules(disparityMF, deltaMF, powerMF);
  console.log(
    "[Fuzzy Debug] Rule Results - Healthy:",
    ruleResult.healthyStrength,
    "Warning:",
    ruleResult.warningStrength
  );

  // Defuzzifikasi Centroid
  const score = defuzzifyCentroid(
    ruleResult.healthyStrength,
    ruleResult.warningStrength
  );
  console.log("[Fuzzy Debug] Final Score (Centroid):", score);

  // Konversi ke status
  const status = score >= 60 ? "healthy" : "warning";

  return { status, score };
}

/**
 * Adapter untuk digunakan dengan SensorReading dari aplikasi
 */
export function deriveACStatusFromSensors(reading: {
  setpoint?: number;
  supply_temp?: number;
  indoor_temp?: number;
  outdoor_temp?: number;
  power?: number;
}): "healthy" | "warning" {
  const rawSetpoint = reading.setpoint ?? 21;
  const setpoint = Math.max(16, Math.min(30, rawSetpoint));
  const rawSupplyTemp = reading.supply_temp ?? setpoint;
  const supplyTemp = Math.max(16, Math.min(30, rawSupplyTemp));
  const indoorTemp = reading.indoor_temp ?? 24;
  const outdoorTemp = reading.outdoor_temp ?? indoorTemp + 2;
  const power = reading.power ?? 0;

  // Hitung input variabel
  const disparitasSuhuOut = Math.abs(supplyTemp - setpoint);
  const deltaSuhuRoom = indoorTemp - outdoorTemp;

  // Evaluasi menggunakan Fuzzy Logic
  const { status } = evaluateACHealth(disparitasSuhuOut, deltaSuhuRoom, power);

  return status;
}

