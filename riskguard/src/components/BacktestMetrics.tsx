// src/components/BacktestMetrics.tsx
// Component to display backtest performance metrics

import type { BacktestMetrics as BacktestMetricsType } from '../utils/backtestEngine';
import { TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';

interface BacktestMetricsProps {
  metrics: BacktestMetricsType;
}

export function BacktestMetrics({ metrics }: BacktestMetricsProps) {
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatNumber = (value: number) => value.toFixed(2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="text-sm text-gray-600 mb-1">Total Return</div>
          <div className={`text-2xl font-bold ${metrics.totalReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatPercent(metrics.totalReturn)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {formatPercent(metrics.buyHoldReturn)} buy & hold
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="text-sm text-gray-600 mb-1">Max Drawdown</div>
          <div className="text-2xl font-bold text-red-600">
            {formatPercent(metrics.maxDrawdown)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {formatPercent(metrics.buyHoldMaxDrawdown)} buy & hold
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="text-sm text-gray-600 mb-1">Drawdown Reduction</div>
          <div className={`text-2xl font-bold ${metrics.drawdownReduction > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatPercent(metrics.drawdownReduction)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Improvement vs buy & hold
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="text-sm text-gray-600 mb-1">Sharpe Ratio</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(metrics.sharpeRatio)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {formatNumber(metrics.buyHoldSharpeRatio)} buy & hold
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <div className="text-sm font-semibold text-gray-700">Prediction Accuracy</div>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatPercent(metrics.winRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Win Rate</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="text-sm font-semibold text-gray-700">False Positives</div>
          </div>
          <div className="text-xl font-bold text-amber-600">
            {formatPercent(metrics.falsePositiveRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Risk signals without crash</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <div className="text-sm font-semibold text-gray-700">False Negatives</div>
          </div>
          <div className="text-xl font-bold text-red-600">
            {formatPercent(metrics.falseNegativeRate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Missed crash signals</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow border">
        <div className="text-sm font-semibold text-gray-700 mb-3">Performance Summary</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Period:</span>
            <span className="font-medium">
              {new Date(metrics.startDate).toLocaleDateString()} - {new Date(metrics.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Framework Return:</span>
            <span className={`font-medium ${metrics.totalReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(metrics.totalReturn)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Buy & Hold Return:</span>
            <span className={`font-medium ${metrics.buyHoldReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(metrics.buyHoldReturn)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Outperformance:</span>
            <span className={`font-medium ${metrics.totalReturn >= metrics.buyHoldReturn ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(metrics.totalReturn - metrics.buyHoldReturn)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

