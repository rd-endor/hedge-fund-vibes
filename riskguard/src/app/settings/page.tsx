"use client";

import { useEffect, useState } from "react";

type Settings = {
  exposureFloor: number;
  riskOffMaxExposure: number;
  confidenceEscalationThreshold: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        setSettings(data);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const error = await res.json();
        setMessage(`Error: ${error.error || "Failed to save settings"}`);
        return;
      }

      setMessage("Settings saved successfully!");
    } catch (error) {
      setMessage("Failed to save settings");
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-sm text-gray-600">Loading settings...</div>
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-sm text-gray-600">Failed to load settings</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <a className="text-sm underline" href="/">
            ← Back
          </a>
        </header>

        <form onSubmit={handleSubmit} className="rounded-2xl border p-5 shadow-sm space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="exposureFloor" className="block text-sm font-medium text-gray-700 mb-1">
                Exposure Floor (%)
              </label>
              <input
                id="exposureFloor"
                type="number"
                min="0"
                max="100"
                value={settings.exposureFloor}
                onChange={(e) =>
                  setSettings({ ...settings, exposureFloor: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Minimum equity exposure percentage (default: 20%)</p>
            </div>

            <div>
              <label htmlFor="riskOffMaxExposure" className="block text-sm font-medium text-gray-700 mb-1">
                Risk-Off Max Exposure (%)
              </label>
              <input
                id="riskOffMaxExposure"
                type="number"
                min="0"
                max="100"
                value={settings.riskOffMaxExposure}
                onChange={(e) =>
                  setSettings({ ...settings, riskOffMaxExposure: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum equity exposure when in RISK_OFF state (default: 40%)
              </p>
            </div>

            <div>
              <label
                htmlFor="confidenceEscalationThreshold"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confidence Escalation Threshold
              </label>
              <input
                id="confidenceEscalationThreshold"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={settings.confidenceEscalationThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    confidenceEscalationThreshold: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum confidence increase (0.0-1.0) to trigger signal storage (default: 0.08 = 8%)
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
      </div>
    </main>
  );
}

