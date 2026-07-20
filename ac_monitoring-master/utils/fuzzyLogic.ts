/**
 * Logika Fuzzy Mamdani untuk Monitoring Kesehatan AC
 * Dengan Validasi Batas Suhu dan Konfigurasi Universe of Discourse
 *
 * Konfigurasi Batas Suhu:
 * - Setpoint minimal: 16°C
 * - Setpoint maksimal: 30°C
 * - Universe of Discourse disparitas: 0°C - 14°C
 *
 * Input Variables:
 * - disparitasSuhuOut: |Setpoint - Suhu Keluaran| (0-14°C)
 * - deltaSuhuRoom: Indoor Temp - Outdoor Temp
 * - konsumsikWh: Power consumption (Watt)
 *
 * Output: statusSkor (0-100) → Threshold: >= 60 = "healthy", < 60 = "warning"
 */

// ============================================================================
// KONFIGURASI BATAS DAN UNIVERSE OF DISCOURSE
// ============================================================================

const CONFIG = {
  SETPOINT_MIN: 16, // °C - Minimal setpoint yang valid
  SETPOINT_MAX: 30, // °C - Maksimal setpoint yang valid
  DISPARITY_MIN: 0, // °C - Universe of Discourse min
  DISPARITY_MAX: 14, // °C - Universe of Discourse max (30 - 16)
  POWER_MIN: 0, // W
  POWER_MAX: 3000, // W
} as const;

// ============================================================================
// FUNGSI VALIDASI & CLAMPING
// ============================================================================

/**
 * Validasi dan normalisasi setpoint AC
 * Memastikan nilai berada dalam rentang 16°C - 30°C
 */
function validateSetpoint(setpoint: number): number {
  if (setpoint < CONFIG.SETPOINT_MIN) {
    console.warn(
      `[Fuzzy Validation] Setpoint ${setpoint}°C di bawah minimum ${CONFIG.SETPOINT_MIN}°C. Dipaksa ke ${CONFIG.SETPOINT_MIN}°C`
    );
    return CONFIG.SETPOINT_MIN;
  }
  if (setpoint > CONFIG.SETPOINT_MAX) {
    console.warn(
      `[Fuzzy Validation] Setpoint ${setpoint}°C di atas maksimum ${CONFIG.SETPOINT_MAX}°C. Dipaksa ke ${CONFIG.SETPOINT_MAX}°C`
    );
    return CONFIG.SETPOINT_MAX;
  }
  return setpoint;
}

/**
 * Clamp nilai ke range tertentu
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// MEMBERSHIP FUNCTIONS
// ============================================================================

/**
 * Triangular Membership Function
 * Bentuk segitiga dengan 3 parameter (a, b, c)
 * b adalah puncak (peak value = 1)
 */
function triangularMF(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/**
 * Trapezoidal Membership Function
 * Bentuk trapesium dengan 4 parameter (a, b, c, d)
 * [b, c] adalah plateau (peak area)
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

// ============================================================================
// FUZZIFIKASI INPUT VARIABLES
// ============================================================================

interface FuzzifiedInput {
  normal: number;
  tinggi: number;
}

interface FuzzifiedDelta {
  turun: number;
  tetapNaik: number;
}

interface FuzzifiedPower {
  normal: number;
  tidakNormal: number;
}

/**
 * Fuzzifikasi disparitasSuhuOut
 * Universe: 0°C - 14°C
 */
function fuzzifyDisparitasSuhu(disparity: number): FuzzifiedInput {
  const disp = clamp(disparity, CONFIG.DISPARITY_MIN, CONFIG.DISPARITY_MAX);

  return {
    // Normal: Triangular (0, 0, 2°C) - AC bekerja dengan baik
    normal: triangularMF(disp, 0, 0, 2),
    // Tinggi: Trapezoid (3, 5, 10, 14°C) - AC tidak mampu mendingin
    tinggi: trapezoidalMF(disp, 3, 5, 10, 14),
  };
}

/**
 * Fuzzifikasi deltaSuhuRoom
 * Delta = Indoor Temp - Outdoor Temp
 * Range: -5 sampai 5°C (negatif = turun, positif = naik/stabil)
 */
function fuzzifyDeltaSuhuRoom(delta: number): FuzzifiedDelta {
  const deltaClamped = clamp(delta, -5, 5);

  return {
    // Turun: Trapezoid (-5, -4, -1.5, -0.5) - Indoor jauh lebih dingin dari outdoor
    turun: trapezoidalMF(deltaClamped, -5, -4, -1.5, -0.5),
    // TetapNaik: Trapezoid (-1, 0.5, 2, 5) - Indoor stagnan atau mendekati outdoor
    tetapNaik: trapezoidalMF(deltaClamped, -1, 0.5, 2, 5),
  };
}

/**
 * Fuzzifikasi konsumsikWh (Power consumption)
 * Range: 0W - 3000W
 */
function fuzzifyKonsumsiKwh(power: number): FuzzifiedPower {
  const powerClamped = clamp(power, CONFIG.POWER_MIN, CONFIG.POWER_MAX);

  return {
    // Normal: Trapezoid (0, 200, 1200, 1800W) - Konsumsi stabil
    normal: trapezoidalMF(powerClamped, 0, 200, 1200, 1800),
    // TidakNormal: Trapezoid (1500, 2000, 2500, 3000W) - Overload
    tidakNormal: trapezoidalMF(powerClamped, 1500, 2000, 2500, 3000),
  };
}

// ============================================================================
// OUTPUT MEMBERSHIP FUNCTIONS
// ============================================================================

/**
 * Output MF untuk "healthy" - Triangular (60, 80, 100)
 */
function outputMembershipHealthy(score: number): number {
  return triangularMF(score, 60, 80, 100);
}

/**
 * Output MF untuk "warning" - Triangular (0, 20, 60)
 */
function outputMembershipWarning(score: number): number {
  return triangularMF(score, 0, 20, 60);
}

// ============================================================================
// INFERENSI MAMDANI & AGREGASI
// ============================================================================

interface MamdaniRuleResult {
  healthyStrength: number;
  warningStrength: number;
}

/**
 * Evaluasi Fuzzy Rules menggunakan MIN untuk implikasi
 * dan MAX untuk agregasi output
 */
function evaluateMamdaniRules(
  disparityMF: FuzzifiedInput,
  deltaMF: FuzzifiedDelta,
  powerMF: FuzzifiedPower
): MamdaniRuleResult {
  // RULE 1: IF (disparitas Normal) AND (delta Turun) AND (power Normal) THEN healthy
  // Menggunakan MIN untuk operator AND
  const rule1 = Math.min(disparityMF.normal, deltaMF.turun, powerMF.normal);

  // RULE 2: IF (disparitas Tinggi) AND (delta TetapNaik) AND (power Normal) THEN warning
  const rule2 = Math.min(disparityMF.tinggi, deltaMF.tetapNaik, powerMF.normal);

  // RULE 3: IF (disparitas Tinggi) AND (delta TetapNaik) AND (power TidakNormal) THEN warning
  const rule3 = Math.min(
    disparityMF.tinggi,
    deltaMF.tetapNaik,
    powerMF.tidakNormal
  );

  // Agregasi: MAX untuk mengumpulkan output dari semua rules
  return {
    healthyStrength: rule1,
    warningStrength: Math.max(rule2, rule3),
  };
}

// ============================================================================
// DEFUZZIFIKASI CENTROID (CENTER OF GRAVITY)
// ============================================================================

/**
 * Centroid Defuzzification
 * Mengkonversi fuzzy output menjadi crisp value (0-100)
 * Formula: Σ(score × membership) / Σ(membership)
 */
function defuzzifyCentroid(
  healthyStrength: number,
  warningStrength: number
): number {
  const samples = 100; // Resolution untuk sampling
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i <= samples; i++) {
    const score = (i / samples) * 100;

    // Kombinasi output membership functions dengan rule strengths
    const healthyMembership = outputMembershipHealthy(score) * healthyStrength;
    const warningMembership = outputMembershipWarning(score) * warningStrength;
    const totalMembership = Math.max(healthyMembership, warningMembership);

    numerator += score * totalMembership;
    denominator += totalMembership;
  }

  // Jika tidak ada fuzzy output, return nilai tengah (50)
  return denominator === 0 ? 50 : numerator / denominator;
}

// ============================================================================
// FUNGSI UTAMA: EVALUASI STATUS KESEHATAN AC
// ============================================================================

export interface ACHealthResult {
  status: "healthy" | "warning";
  score: number;
  debug?: {
    setpoint: number;
    disparity: number;
    deltaSuhuRoom: number;
    power: number;
    ruleStrengths: {
      rule1: number;
      rule2: number;
      rule3: number;
    };
  };
}

/**
 * Evaluasi status kesehatan AC menggunakan Fuzzy Logic Mamdani
 *
 * @param setpoint - Setpoint AC yang diinginkan (°C)
 * @param supplyTemp - Suhu keluaran AC (°C)
 * @param indoorTemp - Suhu ruangan (°C)
 * @param outdoorTemp - Suhu luar (°C)
 * @param power - Konsumsi daya AC (Watt)
 * @param enableDebug - Tampilkan debug info (default: false)
 * @returns { status, score, debug? }
 */
export function evaluateACHealth(
  setpoint: number,
  supplyTemp: number,
  indoorTemp: number,
  outdoorTemp: number,
  power: number,
  enableDebug: boolean = false
): ACHealthResult {
  // Validasi dan normalisasi setpoint
  const validSetpoint = validateSetpoint(setpoint);

  // Hitung input variables
  const disparitasSuhuOut = Math.abs(supplyTemp - validSetpoint);
  const deltaSuhuRoom = indoorTemp - outdoorTemp;

  // Fuzzifikasi input
  const disparityMF = fuzzifyDisparitasSuhu(disparitasSuhuOut);
  const deltaMF = fuzzifyDeltaSuhuRoom(deltaSuhuRoom);
  const powerMF = fuzzifyKonsumsiKwh(power);

  if (enableDebug) {
    console.log("[Fuzzy Debug]", {
      setpoint: validSetpoint,
      supplyTemp,
      disparitasSuhuOut,
      indoorTemp,
      outdoorTemp,
      deltaSuhuRoom,
      power,
      fuzzified: { disparityMF, deltaMF, powerMF },
    });
  }

  // Inferensi Mamdani
  const ruleResult = evaluateMamdaniRules(disparityMF, deltaMF, powerMF);

  if (enableDebug) {
    console.log("[Fuzzy Rules]", {
      rule1_healthy: ruleResult.healthyStrength,
      rule2_warning: ruleResult.warningStrength,
    });
  }

  // Defuzzifikasi Centroid
  const score = defuzzifyCentroid(
    ruleResult.healthyStrength,
    ruleResult.warningStrength
  );

  // Konversi score ke status
  const status = score >= 60 ? "healthy" : "warning";

  if (enableDebug) {
    console.log("[Fuzzy Result]", { score, status });
  }

  return {
    status,
    score,
    debug: enableDebug
      ? {
          setpoint: validSetpoint,
          disparity: disparitasSuhuOut,
          deltaSuhuRoom,
          power,
          ruleStrengths: {
            rule1: ruleResult.healthyStrength,
            rule2: ruleResult.warningStrength,
            rule3: ruleResult.warningStrength, // Agregasi rule 2 & 3
          },
        }
      : undefined,
  };
}

/**
 * Adapter untuk SensorReading dari aplikasi
 * Mengekstrak nilai yang diperlukan dan memanggil evaluateACHealth
 */
export function deriveACStatusFromSensors(reading: {
  setpoint?: number;
  supply_temp?: number;
  indoor_temp?: number;
  outdoor_temp?: number;
  power?: number;
}): "healthy" | "warning" {
  const setpoint = reading.setpoint ?? 21;
  const supplyTemp = reading.supply_temp ?? setpoint;
  const indoorTemp = reading.indoor_temp ?? 24;
  const outdoorTemp = reading.outdoor_temp ?? indoorTemp + 2;
  const power = reading.power ?? 0;

  const { status } = evaluateACHealth(
    setpoint,
    supplyTemp,
    indoorTemp,
    outdoorTemp,
    power
  );

  return status;
}

/**
 * Mendapatkan info konfigurasi fuzzy untuk logging/monitoring
 */
export function getFuzzyConfig() {
  return CONFIG;
}
