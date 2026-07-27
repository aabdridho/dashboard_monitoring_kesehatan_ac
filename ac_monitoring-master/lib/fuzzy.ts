/**
 * Fuzzy Logic Membership Functions & Mamdani Inference Engine
 *
 * Input Variables (Sesuai Spesifikasi 81 Rule):
 * - Suhu Ruangan (Indoor): 22 - 30 °C
 * - Suhu Luar (Outdoor): 18 - 32 °C
 * - Suhu Keluaran AC (AC Supply): 16 - 30 °C
 * - Daya Listrik (Watt): 0 - 1327 W
 *
 * Output Variable:
 * - Status AC: 0-100 (Centroid Defuzzification)
 * - Threshold: >= 50 = "Warning", < 50 = "Sehat"
 */

// ============================================================================
// 1. FUNGSI KEANGGOTAAN (MEMBERSHIP FUNCTIONS)
// ============================================================================

function fuzzySegitiga(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > b && x < c) return (c - x) / (c - b);
  return 0;
}

function fuzzyTrapesium(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number
): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

// ============================================================================
// 2. FUZZIFIKASI INPUT SENSOR
// ============================================================================

function fuzzifyIndoor(x: number) {
  return {
    dingin: fuzzyTrapesium(x, 22, 22, 24, 26),
    normal: fuzzySegitiga(x, 24, 26, 28),
    panas: fuzzyTrapesium(x, 26, 28, 30, 30),
  };
}

function fuzzifyOutdoor(x: number) {
  return {
    rendah: fuzzyTrapesium(x, 18, 18, 21, 25),
    sedang: fuzzySegitiga(x, 21, 25, 29),
    tinggi: fuzzyTrapesium(x, 25, 29, 32, 32),
  };
}

function fuzzifyAC(x: number) {
  return {
    dingin: fuzzyTrapesium(x, 16, 16, 19, 22),
    normal: fuzzySegitiga(x, 19, 22, 25),
    panas: fuzzyTrapesium(x, 22, 25, 30, 30),
  };
}

function fuzzifyDaya(x: number) {
  return {
    rendah: fuzzyTrapesium(x, 0, 0, 300, 600),
    sedang: fuzzySegitiga(x, 300, 650, 1000),
    tinggi: fuzzyTrapesium(x, 650, 1000, 1327, 1327),
  };
}

// ============================================================================
// 3. EVALUASI ATURAN (INFERENCE ENGINE - 81 RULES)
// ============================================================================

function evaluateRules(
  indoor: ReturnType<typeof fuzzifyIndoor>,
  outdoor: ReturnType<typeof fuzzifyOutdoor>,
  ac: ReturnType<typeof fuzzifyAC>,
  daya: ReturnType<typeof fuzzifyDaya>
) {
  let sehat = 0;
  let warning = 0;

  const applyRule = (
    indKey: keyof typeof indoor,
    outKey: keyof typeof outdoor,
    acKey: keyof typeof ac,
    dayaKey: keyof typeof daya,
    status: "sehat" | "warning"
  ) => {
    // Operator AND = MIN
    const alpha = Math.min(
      indoor[indKey],
      outdoor[outKey],
      ac[acKey],
      daya[dayaKey]
    );

    // Agregasi OR = MAX
    if (status === "sehat") {
      sehat = Math.max(sehat, alpha);
    } else {
      warning = Math.max(warning, alpha);
    }
  };

  // 81 Aturan Base Rule
  // --- INDOOR DINGIN ---
  // Outdoor Rendah
  applyRule("dingin", "rendah", "dingin", "rendah", "sehat");
  applyRule("dingin", "rendah", "dingin", "sedang", "sehat");
  applyRule("dingin", "rendah", "dingin", "tinggi", "warning");
  applyRule("dingin", "rendah", "normal", "rendah", "sehat");
  applyRule("dingin", "rendah", "normal", "sedang", "sehat");
  applyRule("dingin", "rendah", "normal", "tinggi", "warning");
  applyRule("dingin", "rendah", "panas", "rendah", "warning");
  applyRule("dingin", "rendah", "panas", "sedang", "warning");
  applyRule("dingin", "rendah", "panas", "tinggi", "warning");

  // Outdoor Sedang
  applyRule("dingin", "sedang", "dingin", "rendah", "sehat");
  applyRule("dingin", "sedang", "dingin", "sedang", "sehat");
  applyRule("dingin", "sedang", "dingin", "tinggi", "sehat");
  applyRule("dingin", "sedang", "normal", "rendah", "sehat");
  applyRule("dingin", "sedang", "normal", "sedang", "sehat");
  applyRule("dingin", "sedang", "normal", "tinggi", "sehat");
  applyRule("dingin", "sedang", "panas", "rendah", "warning");
  applyRule("dingin", "sedang", "panas", "sedang", "warning");
  applyRule("dingin", "sedang", "panas", "tinggi", "warning");

  // Outdoor Tinggi
  applyRule("dingin", "tinggi", "dingin", "rendah", "warning");
  applyRule("dingin", "tinggi", "dingin", "sedang", "sehat");
  applyRule("dingin", "tinggi", "dingin", "tinggi", "sehat");
  applyRule("dingin", "tinggi", "normal", "rendah", "warning");
  applyRule("dingin", "tinggi", "normal", "sedang", "sehat");
  applyRule("dingin", "tinggi", "normal", "tinggi", "sehat");
  applyRule("dingin", "tinggi", "panas", "rendah", "warning");
  applyRule("dingin", "tinggi", "panas", "sedang", "warning");
  applyRule("dingin", "tinggi", "panas", "tinggi", "warning");

  // --- INDOOR NORMAL ---
  // Outdoor Rendah
  applyRule("normal", "rendah", "dingin", "rendah", "sehat");
  applyRule("normal", "rendah", "dingin", "sedang", "sehat");
  applyRule("normal", "rendah", "dingin", "tinggi", "warning");
  applyRule("normal", "rendah", "normal", "rendah", "sehat");
  applyRule("normal", "rendah", "normal", "sedang", "sehat");
  applyRule("normal", "rendah", "normal", "tinggi", "warning");
  applyRule("normal", "rendah", "panas", "rendah", "warning");
  applyRule("normal", "rendah", "panas", "sedang", "warning");
  applyRule("normal", "rendah", "panas", "tinggi", "warning");

  // Outdoor Sedang
  applyRule("normal", "sedang", "dingin", "rendah", "sehat");
  applyRule("normal", "sedang", "dingin", "sedang", "sehat");
  applyRule("normal", "sedang", "dingin", "tinggi", "sehat");
  applyRule("normal", "sedang", "normal", "rendah", "sehat");
  applyRule("normal", "sedang", "normal", "sedang", "sehat");
  applyRule("normal", "sedang", "normal", "tinggi", "sehat");
  applyRule("normal", "sedang", "panas", "rendah", "warning");
  applyRule("normal", "sedang", "panas", "sedang", "warning");
  applyRule("normal", "sedang", "panas", "tinggi", "warning");

  // Outdoor Tinggi
  applyRule("normal", "tinggi", "dingin", "rendah", "warning");
  applyRule("normal", "tinggi", "dingin", "sedang", "sehat");
  applyRule("normal", "tinggi", "dingin", "tinggi", "sehat");
  applyRule("normal", "tinggi", "normal", "rendah", "warning");
  applyRule("normal", "tinggi", "normal", "sedang", "sehat");
  applyRule("normal", "tinggi", "normal", "tinggi", "sehat");
  applyRule("normal", "tinggi", "panas", "rendah", "warning");
  applyRule("normal", "tinggi", "panas", "sedang", "warning");
  applyRule("normal", "tinggi", "panas", "tinggi", "warning");

  // --- INDOOR PANAS ---
  // Outdoor Rendah
  applyRule("panas", "rendah", "dingin", "rendah", "sehat");
  applyRule("panas", "rendah", "dingin", "sedang", "sehat");
  applyRule("panas", "rendah", "dingin", "tinggi", "warning");
  applyRule("panas", "rendah", "normal", "rendah", "warning");
  applyRule("panas", "rendah", "normal", "sedang", "warning");
  applyRule("panas", "rendah", "normal", "tinggi", "warning");
  applyRule("panas", "rendah", "panas", "rendah", "warning");
  applyRule("panas", "rendah", "panas", "sedang", "warning");
  applyRule("panas", "rendah", "panas", "tinggi", "warning");

  // Outdoor Sedang
  applyRule("panas", "sedang", "dingin", "rendah", "sehat");
  applyRule("panas", "sedang", "dingin", "sedang", "sehat");
  applyRule("panas", "sedang", "dingin", "tinggi", "sehat");
  applyRule("panas", "sedang", "normal", "rendah", "warning");
  applyRule("panas", "sedang", "normal", "sedang", "warning");
  applyRule("panas", "sedang", "normal", "tinggi", "warning");
  applyRule("panas", "sedang", "panas", "rendah", "warning");
  applyRule("panas", "sedang", "panas", "sedang", "warning");
  applyRule("panas", "sedang", "panas", "tinggi", "warning");

  // Outdoor Tinggi
  applyRule("panas", "tinggi", "dingin", "rendah", "warning");
  applyRule("panas", "tinggi", "dingin", "sedang", "sehat");
  applyRule("panas", "tinggi", "dingin", "tinggi", "sehat");
  applyRule("panas", "tinggi", "normal", "rendah", "warning");
  applyRule("panas", "tinggi", "normal", "sedang", "warning");
  applyRule("panas", "tinggi", "normal", "tinggi", "warning");
  applyRule("panas", "tinggi", "panas", "rendah", "warning");
  applyRule("panas", "tinggi", "panas", "sedang", "warning");
  applyRule("panas", "tinggi", "panas", "tinggi", "warning");

  return { sehat, warning };
}

// ============================================================================
// 4. DEFUZZIFIKASI (METODE CENTROID)
// ============================================================================

function outputSehat(z: number): number {
  return fuzzyTrapesium(z, 0, 0, 40, 60);
}

function outputWarning(z: number): number {
  return fuzzyTrapesium(z, 40, 60, 100, 100);
}

function defuzzifyCentroid(
  sehatStrength: number,
  warningStrength: number
): number {
  let numerator = 0;
  let denominator = 0;

  // Step 0.1 untuk akurasi tinggi pada diskritisasi domain numerik (0-100)
  const step = 0.1;

  for (let z = 0; z <= 100; z += step) {
    const muSehat = outputSehat(z);
    const muWarning = outputWarning(z);

    const mu = Math.max(
      Math.min(sehatStrength, muSehat),
      Math.min(warningStrength, muWarning)
    );

    numerator += z * mu;
    denominator += mu;
  }

  // Jika tidak ada rule aktif, kembalikan ke kondisi sehat secara default
  if (denominator === 0) return 30;

  return numerator / denominator;
}

// ============================================================================
// 5. EKSPOR ADAPTER UNTUK INTEGRASI KE DALAM DASHBOARD (UI & HOOKS)
// ============================================================================

/**
 * Adapter: Evaluasi status dari data SensorReading
 * Ini dipakai oleh useRealtimeSensorData dan useFirebaseHistory.
 */
export function deriveACStatusFromSensors(reading: {
  setpoint?: number; // Tidak terpakai lagi di spesifikasi baru
  supply_temp?: number;
  indoor_temp?: number;
  outdoor_temp?: number;
  power?: number;
}): "healthy" | "warning" {
  // Jika data sensor kunci tidak tersedia dari Firebase (merging lag dsb), default ke healthy
  const hasSupplyTemp =
    typeof reading.supply_temp === "number" && reading.supply_temp > 0;
  const hasIndoorTemp =
    typeof reading.indoor_temp === "number" && reading.indoor_temp > 0;

  if (!hasSupplyTemp && !hasIndoorTemp) return "healthy";

  // Data cleansing / fallback
  const indoorTemp = hasIndoorTemp ? reading.indoor_temp! : 24;
  const outdoorTemp =
    typeof reading.outdoor_temp === "number" && reading.outdoor_temp > 0
      ? reading.outdoor_temp
      : 30;
  const acSupplyTemp = hasSupplyTemp ? reading.supply_temp! : 20;
  const dayaWatt = typeof reading.power === "number" ? reading.power : 0;

  // 1. Fuzzifikasi
  const ind = fuzzifyIndoor(indoorTemp);
  const out = fuzzifyOutdoor(outdoorTemp);
  const ac = fuzzifyAC(acSupplyTemp);
  const daya = fuzzifyDaya(dayaWatt);

  // 2. Evaluasi Aturan (Inference)
  const rules = evaluateRules(ind, out, ac, daya);

  // 3. Defuzzifikasi
  const zScore = defuzzifyCentroid(rules.sehat, rules.warning);

  // 4. Keputusan: z* >= 50 = Warning, z* < 50 = Sehat
  return zScore >= 50 ? "warning" : "healthy";
}
