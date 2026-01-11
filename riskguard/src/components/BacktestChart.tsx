// src/components/BacktestChart.tsx
// Chart component for visualizing backtest results

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
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

/**
 * Exposure Timeline Chart - Shows when you'd be invested vs reduced allocation
 * Color-coded by mode: Bull (green), Caution (yellow), Bear (red)
 */
export function ExposureTimelineChart({ results }: { results: BacktestResult[] }) {
  const chartData = results.map(r => {
    const date = new Date(r.date);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dateFull: r.date,
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      suggestedExposure: r.suggestedExposure,
      mode: r.mode,
      riskScore: r.riskScore
    };
  });

  // Get color based on mode
  const getColor = (mode: string) => {
    switch (mode) {
      case 'bull': return '#10b981'; // green
      case 'caution': return '#f59e0b'; // yellow/amber
      case 'bear': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  // Group by month for summary
  const monthlySummary = results.reduce((acc, r) => {
    const date = new Date(r.date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        totalDays: 0,
        bullDays: 0,
        cautionDays: 0,
        bearDays: 0,
        avgExposure: 0,
        exposureSum: 0
      };
    }
    
    acc[monthKey].totalDays++;
    acc[monthKey].exposureSum += r.suggestedExposure;
    acc[monthKey].avgExposure = acc[monthKey].exposureSum / acc[monthKey].totalDays;
    
    if (r.mode === 'bull') acc[monthKey].bullDays++;
    else if (r.mode === 'caution') acc[monthKey].cautionDays++;
    else if (r.mode === 'bear') acc[monthKey].bearDays++;
    
    return acc;
  }, {} as Record<string, { month: string; totalDays: number; bullDays: number; cautionDays: number; bearDays: number; avgExposure: number; exposureSum: number }>);

  const monthlyData = Object.values(monthlySummary).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Bar chart showing exposure over time */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 100]} label={{ value: 'Exposure %', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              formatter={(value: any, name?: string, props?: any) => {
                if (name === 'suggestedExposure') {
                  return [`${value}% (${props.payload.mode})`, 'Exposure'];
                }
                return value;
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Bar dataKey="suggestedExposure" name="Market Exposure %">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.mode)} />
              ))}
            </Bar>
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label="Bull (80%)" />
            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label="Caution (60%)" />
            <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" label="Bear (40%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly summary table */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Month</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Avg Exposure</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Bull Days</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Caution Days</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Bear Days</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Recommendation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyData.map((month, idx) => {
                const dominantMode = month.bullDays > month.cautionDays && month.bullDays > month.bearDays 
                  ? 'bull' 
                  : month.cautionDays > month.bearDays 
                    ? 'caution' 
                    : 'bear';
                const recommendation = dominantMode === 'bull' 
                  ? 'Invested' 
                  : dominantMode === 'caution' 
                    ? 'Reduced' 
                    : 'Defensive';
                
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{month.month}</td>
                    <td className="px-4 py-2 text-sm text-center text-gray-700">{month.avgExposure.toFixed(0)}%</td>
                    <td className="px-4 py-2 text-sm text-center text-emerald-600">{month.bullDays}</td>
                    <td className="px-4 py-2 text-sm text-center text-amber-600">{month.cautionDays}</td>
                    <td className="px-4 py-2 text-sm text-center text-red-600">{month.bearDays}</td>
                    <td className={`px-4 py-2 text-sm text-center font-semibold ${
                      dominantMode === 'bull' ? 'text-emerald-600' : 
                      dominantMode === 'caution' ? 'text-amber-600' : 
                      'text-red-600'
                    }`}>
                      {recommendation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

