import { useState } from "react";
import { runBacktest, runCrisisBacktests } from "../../utils/backtestEngine";
import type { BacktestMetrics } from "../../utils/backtestEngine";
import { BacktestChart, RiskScoreChart, ExposureTimelineChart } from "../../components/BacktestChart";
import { BacktestMetrics as BacktestMetricsComponent } from "../../components/BacktestMetrics";
import { RefreshCw, Calendar, Play } from "lucide-react";

export default function BacktestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestMetrics | null>(null);
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2020-12-31");
  const [error, setError] = useState<string | null>(null);

  const crisisPeriods = {
    "2001": { start: "2001-01-01", end: "2001-12-31", label: "2001 Dot-com Crash" },
    "2008": { start: "2008-01-01", end: "2008-12-31", label: "2008 Financial Crisis" },
    "2019": { start: "2019-01-01", end: "2019-12-31", label: "2019 Pre-COVID" },
    "2020": { start: "2020-01-01", end: "2020-12-31", label: "2020 COVID Crash" },
    "2022": { start: "2022-01-01", end: "2022-12-31", label: "2022 Market Volatility" },
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const metrics = await runBacktest(startDate, endDate);
      setResults(metrics);
    } catch (err: any) {
      setError(err.message || "Failed to run backtest");
      console.error("Backtest error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrisisBacktest = async (period: keyof typeof crisisPeriods) => {
    const periodData = crisisPeriods[period];
    setStartDate(periodData.start);
    setEndDate(periodData.end);
    
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log(`Starting backtest for ${periodData.label}...`);
      const metrics = await runBacktest(periodData.start, periodData.end);
      console.log(`Backtest completed for ${periodData.label}:`, metrics);
      setResults(metrics);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to run backtest";
      console.error("Backtest error:", err);
      setError(`${errorMessage}. Check console for details. Historical data may not be available for this period.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAllCrises = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const allResults = await runCrisisBacktests();
      console.log("All crisis backtests completed:", allResults);
      // For now, show the first result. In future, could show comparison view
      const firstKey = Object.keys(allResults)[0];
      if (firstKey && allResults[firstKey]) {
        setResults(allResults[firstKey]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to run crisis backtests");
      console.error("Crisis backtest error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Backtesting</h1>
          <p className="text-sm text-gray-600">
            Test the risk framework's performance during historical market periods
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Note:</strong> Alpha Vantage free tier provides only the last 100 trading days (~4-5 months) of data. 
            For longer backtests, use a premium API key or select recent date ranges. Check browser console (F12) for progress.
          </div>
        </header>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quick Select: Crisis Periods
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(crisisPeriods).map(([key, period]) => (
                  <button
                    key={key}
                    onClick={() => handleCrisisBacktest(key as keyof typeof crisisPeriods)}
                    disabled={loading}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {period.label}
                  </button>
                ))}
                <button
                  onClick={handleRunAllCrises}
                  disabled={loading}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run All Crises
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRunBacktest}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Backtest
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-semibold">Error</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
            <div className="text-red-500 text-xs mt-2">
              Note: Historical data for older periods (2001, 2008) may not be available from free APIs. 
              Try 2019, 2020, or 2022 for better results.
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <div className="text-blue-800 font-semibold">Running Backtest...</div>
            <div className="text-blue-600 text-sm mt-1">
              This may take 1-2 minutes. Fetching historical data from APIs...
            </div>
            <div className="text-blue-500 text-xs mt-2">
              Progress is logged to the browser console (F12)
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
              <BacktestMetricsComponent metrics={results} />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio Value Comparison</h2>
              <BacktestChart results={results.results} showRiskScore={false} showDrawdown={false} />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Score Over Time</h2>
              <RiskScoreChart results={results.results} />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Drawdown Analysis</h2>
              <BacktestChart results={results.results} showDrawdown={true} />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Exposure Timeline</h2>
              <p className="text-sm text-gray-600 mb-4">
                Shows when the risk model suggests being fully invested (green) vs reducing allocation (yellow/red)
              </p>
              <ExposureTimelineChart results={results.results} />
            </div>
          </div>
        )}

        {!results && !loading && !error && (
          <div className="bg-white rounded-xl p-12 shadow-lg border border-gray-200 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Select a date range or choose a crisis period to run a backtest
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

