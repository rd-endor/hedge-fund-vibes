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
};

export default function HistoryPage() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/signals");
      const data = await res.json();
      setSignals(data.signals ?? []);
    })();
  }, []);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Signal History</h1>
          <a className="text-sm underline" href="/">
            ← Back
          </a>
        </header>

        <div className="space-y-3">
          {signals.map((s) => (
            <div key={s.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{s.state.replace("_", "-")}</div>
                <div className="text-xs text-gray-500">
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Confidence: {(s.confidence * 100).toFixed(0)}%
              </div>
              <div className="mt-2 text-sm">
                Exposure: <span className="font-semibold">{s.targetEquityMin}%–{s.targetEquityMax}%</span>
              </div>
              <div className="mt-2 text-sm text-gray-700">{s.rationale}</div>
            </div>
          ))}
          {signals.length === 0 && (
            <div className="text-sm text-gray-600">No signals yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}
