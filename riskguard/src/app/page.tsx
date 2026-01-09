"use client";

import { useEffect, useState } from "react";

type Signal = {
  id: string;
  createdAt: string;
  state: "RISK_ON" | "TRANSITION" | "RISK_OFF";
  confidence: number;
  targetEquityMin: number;
  targetEquityMax: number;
  rationale: string;
  detailsJson?: string;
};

function deriveRiskBullets(detailsJson: string | undefined): string[] {
  if (!detailsJson) return [];
  
  try {
    const details = JSON.parse(detailsJson);
    const bullets: string[] = [];
    
    // Trend analysis
    if (details.trend !== undefined) {
      const trendPct = (details.trend * 100).toFixed(0);
      if (details.trend > 0.6) {
        bullets.push(`Strong market trend (${trendPct}% strength) supports risk-on positioning`);
      } else if (details.trend < 0.4) {
        bullets.push(`Weak market trend (${trendPct}% strength) indicates deteriorating conditions`);
      } else {
        bullets.push(`Moderate market trend (${trendPct}% strength) suggests mixed signals`);
      }
    }
    
    // Volatility analysis
    if (details.volatility !== undefined) {
      const volPct = (details.volatility * 100).toFixed(0);
      if (details.volatility > 0.6) {
        bullets.push(`Elevated volatility (${volPct}%) increases downside risk`);
      } else if (details.volatility < 0.4) {
        bullets.push(`Low volatility (${volPct}%) indicates stable market conditions`);
      } else {
        bullets.push(`Moderate volatility (${volPct}%) within normal range`);
      }
    }
    
    // Breadth analysis
    if (details.breadth !== undefined) {
      const breadthPct = (details.breadth * 100).toFixed(0);
      if (details.breadth > 0.6) {
        bullets.push(`Broad market participation (${breadthPct}%) supports bullish outlook`);
      } else if (details.breadth < 0.4) {
        bullets.push(`Narrow market participation (${breadthPct}%) suggests weakening breadth`);
      } else {
        bullets.push(`Moderate market breadth (${breadthPct}%) shows mixed participation`);
      }
    }
    
    // Risk score summary
    if (details.score !== undefined) {
      const scorePct = (details.score * 100).toFixed(0);
      if (details.score > 0.7) {
        bullets.push(`High risk score (${scorePct}%) warrants defensive positioning`);
      } else if (details.score < 0.45) {
        bullets.push(`Low risk score (${scorePct}%) supports risk-on allocation`);
      } else {
        bullets.push(`Moderate risk score (${scorePct}%) requires careful monitoring`);
      }
    }
    
    return bullets.slice(0, 5); // Limit to 5 bullets
  } catch {
    return [];
  }
}

export default function Home() {
  const [latest, setLatest] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [exposureFloor, setExposureFloor] = useState<number>(20);

  async function runSignal() {
    setLoading(true);
    try {
      await fetch("/api/signals/run", { method: "POST" });
      const res = await fetch("/api/signals");
      const data = await res.json();
      setLatest(data.signals?.[0] ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/signals");
      const data = await res.json();
      setLatest(data.signals?.[0] ?? null);

      // Load settings for exposure floor
      const settingsRes = await fetch("/api/settings");
      const settings = await settingsRes.json();
      setExposureFloor(settings.exposureFloor ?? 20);
    })();
  }, []);

  const stateLabel =
    latest?.state === "RISK_ON"
      ? "Risk-On"
      : latest?.state === "TRANSITION"
      ? "Transition"
      : latest?.state === "RISK_OFF"
      ? "Risk-Off"
      : "—";

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">RiskGuard</h1>
          <p className="text-sm text-gray-600">
            Dynamic risk regime signals (event-driven). Minimum exposure floor: {exposureFloor}%.
          </p>
        </header>

        <section className="rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Current Risk State</div>
              <div className="text-3xl font-semibold">{stateLabel}</div>
            </div>
            <button
              onClick={runSignal}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Running…" : "Run signal"}
            </button>
          </div>

          {latest ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Confidence: {(latest.confidence * 100).toFixed(0)}%
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Recommended Equity Exposure</div>
                <div className="text-xl font-semibold">
                  {latest.targetEquityMin}% – {latest.targetEquityMax}%
                </div>
                <div className="mt-2 text-sm text-gray-700">{latest.rationale}</div>
              </div>

              {latest.detailsJson && (
                <div className="rounded-xl border p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-700">Risk Explanation</div>
                  <ul className="space-y-1.5">
                    {deriveRiskBullets(latest.detailsJson).map((bullet, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Updated: {new Date(latest.createdAt).toLocaleString()}
              </div>

              <div className="flex gap-4">
                <a className="text-sm underline" href="/history">
                  View signal history
                </a>
                <a className="text-sm underline" href="/settings">
                  Settings
                </a>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              No signals yet. Click “Run signal” to generate the first one.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
