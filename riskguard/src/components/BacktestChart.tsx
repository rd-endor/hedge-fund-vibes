// src/components/BacktestChart.tsx
// Chart component for visualizing backtest results

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { BacktestResult } from '../utils/backtestEngine';

interface BacktestChartProps {
  results: BacktestResult[];
  showRiskScore?: boolean;
  showDrawdown?: boolean;
}

export function BacktestChart({ results, showRiskScore = false, showDrawdown = false }: BacktestChartProps) {
  const chartData = results.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    portfolioValue: Math.round(r.portfolioValue),
    buyHoldValue: Math.round(r.buyHoldValue),
    riskScore: r.riskScore,
    drawdown: r.drawdown * 100,
    buyHoldDrawdown: r.buyHoldDrawdown * 100,
    mode: r.mode
  }));

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="value" />
          {showRiskScore && <YAxis yAxisId="score" orientation="right" domain={[0, 100]} />}
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            formatter={(value: any, name?: string) => {
              if (name === 'portfolioValue' || name === 'buyHoldValue') {
                return `$${value.toLocaleString()}`;
              }
              if (name === 'riskScore') {
                return `${value.toFixed(1)}`;
              }
              if (name === 'drawdown' || name === 'buyHoldDrawdown') {
                return `${value.toFixed(2)}%`;
              }
              return value;
            }}
          />
          <Legend />
          <Line 
            yAxisId="value"
            type="monotone" 
            dataKey="portfolioValue" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Framework Portfolio"
            dot={false}
          />
          <Line 
            yAxisId="value"
            type="monotone" 
            dataKey="buyHoldValue" 
            stroke="#6b7280" 
            strokeWidth={2}
            name="Buy & Hold"
            dot={false}
          />
          {showRiskScore && (
            <Line 
              yAxisId="score"
              type="monotone" 
              dataKey="riskScore" 
              stroke="#ef4444" 
              strokeWidth={1}
              name="Risk Score"
              dot={false}
            />
          )}
          {showDrawdown && (
            <>
              <Line 
                yAxisId="value"
                type="monotone" 
                dataKey="drawdown" 
                stroke="#f59e0b" 
                strokeWidth={1}
                name="Framework Drawdown %"
                dot={false}
              />
              <Line 
                yAxisId="value"
                type="monotone" 
                dataKey="buyHoldDrawdown" 
                stroke="#dc2626" 
                strokeWidth={1}
                name="Buy & Hold Drawdown %"
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskScoreChart({ results }: { results: BacktestResult[] }) {
  const chartData = results.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    riskScore: r.riskScore,
    mode: r.mode,
    suggestedExposure: r.suggestedExposure
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis domain={[0, 100]} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            formatter={(value: any) => `${value.toFixed(1)}`}
          />
          <Legend />
          <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="3 3" label="Bear Threshold" />
          <ReferenceLine y={45} stroke="#f59e0b" strokeDasharray="3 3" label="Caution Threshold" />
          <Line 
            type="monotone" 
            dataKey="riskScore" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Risk Score"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

