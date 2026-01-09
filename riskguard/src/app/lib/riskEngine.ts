export type RiskState = "RISK_ON" | "TRANSITION" | "RISK_OFF";

export type RiskResult = {
  state: RiskState;
  confidence: number; // 0..1
  targetEquityMin: number; // exposure floor (default 20)
  targetEquityMax: number; // depends on state
  rationale: string;
  details: Record<string, unknown>;
};

export type RiskEngineSettings = {
  exposureFloor: number;
  riskOffMaxExposure: number;
};

/**
 * V1 placeholder engine (deterministic-ish):
 * - uses a stable pseudo-random seed per day so "Run signal" doesn't change every click
 * - replace later with real market data + computed indicators
 */
export function computeRisk(
  date = new Date(),
  settings: RiskEngineSettings = { exposureFloor: 20, riskOffMaxExposure: 40 }
): RiskResult {
  // stable-ish seed per day
  const seed = Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
      date.getUTCDate()
    ).padStart(2, "0")}`
  );

  // simple seeded RNG
  let x = seed % 2147483647;
  const rand = () => (x = (x * 48271) % 2147483647) / 2147483647;

  // Mock inputs (later: real market data)
  const mock = {
    trend: rand(), // 0..1 (higher = better)
    volatility: rand(), // 0..1 (higher = worse)
    breadth: rand(), // 0..1 (higher = better)
  };

  // Risk score: higher => worse
  const score = 0.5 * (1 - mock.trend) + 0.3 * mock.volatility + 0.2 * (1 - mock.breadth);

  let state: RiskState = "RISK_ON";
  let confidence = 0.65;
  let targetEquityMax = 80;
  let rationale = "Market conditions appear healthy. Maintain normal exposure.";

  if (score > 0.55 && score <= 0.7) {
    state = "TRANSITION";
    confidence = Math.min(0.8, 0.65 + (score - 0.55));
    targetEquityMax = 60;
    rationale = "Early signs of deterioration. Stay alert; no action required yet.";
  } else if (score > 0.7) {
    state = "RISK_OFF";
    confidence = Math.min(0.95, 0.75 + (score - 0.7));
    targetEquityMax = settings.riskOffMaxExposure;
    rationale = "Risk signals elevated. Consider reducing equity exposure to limit drawdowns.";
  }

  return {
    state,
    confidence,
    targetEquityMin: settings.exposureFloor,
    targetEquityMax,
    rationale,
    details: { ...mock, score },
  };
}
