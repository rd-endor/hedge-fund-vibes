// src/utils/backtestEngine.ts
// Backtesting engine to evaluate risk framework performance

import { collectHistoricalDataRange } from './backtestDataCollector';
import type { HistoricalDataPoint } from './backtestDataCollector';

export interface BacktestResult {
  date: string;
  riskScore: number;
  mode: 'bull' | 'caution' | 'bear';
  suggestedExposure: number;
  actualSP500Price: number;
  portfolioValue: number;
  buyHoldValue: number;
  drawdown: number;
  buyHoldDrawdown: number;
}

export interface BacktestMetrics {
  startDate: string;
  endDate: string;
  totalReturn: number;
  buyHoldReturn: number;
  maxDrawdown: number;
  buyHoldMaxDrawdown: number;
  drawdownReduction: number;
  sharpeRatio: number;
  buyHoldSharpeRatio: number;
  winRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  results: BacktestResult[];
}

/**
 * Calculate risk score from historical data point
 * This is a simplified version that uses available data
 */
async function calculateRiskScoreFromData(data: HistoricalDataPoint): Promise<{
  totalScore: number;
  mode: 'bull' | 'caution' | 'bear';
  suggestedExposure: number;
}> {
  // Use the actual risk engine if we have enough data
  // Otherwise, calculate a simplified score
  
  let totalScore = 0;
  
  // Technical score (simplified)
  if (data.sp500) {
    let techScore = 0;
    if (data.sp500.price < data.sp500.ma10Month) techScore += 7.5;
    if (data.sp500.price < data.sp500.ma200) techScore += 4;
    if (data.sp500.price < data.sp500.ma50) techScore += 2.5;
    totalScore += techScore;
  }
  
  if (data.vix) {
    let volScore = 0;
    if (data.vix.current > 30) volScore += 7.5;
    else if (data.vix.current > 25) volScore += 5;
    else if (data.vix.current > 20) volScore += 2.5;
    totalScore += volScore;
  }
  
  // Macro score (simplified)
  if (data.yields) {
    const spread = data.yields.yield10Y - data.yields.yield2Y;
    if (spread < -0.5) totalScore += 4;
    else if (spread < -0.1) totalScore += 2;
    else if (spread < 0) totalScore += 1;
  }
  
  if (data.fed) {
    const rateChange = data.fed.fedFundsRate - data.fed.fedFundsRatePrev;
    if (rateChange > 1.0) totalScore += 6;
    else if (rateChange > 0.25) totalScore += 4;
  }
  
  // Determine mode and exposure
  let mode: 'bull' | 'caution' | 'bear';
  let suggestedExposure: number;
  
  if (totalScore >= 65) {
    mode = 'bear';
    suggestedExposure = 40;
  } else if (totalScore >= 45) {
    mode = 'caution';
    suggestedExposure = 60;
  } else {
    mode = 'bull';
    suggestedExposure = 80;
  }
  
  return { totalScore, mode, suggestedExposure };
}

/**
 * Run backtest for a date range
 */
export async function runBacktest(
  startDate: string,
  endDate: string,
  initialCapital: number = 100000
): Promise<BacktestMetrics> {
  console.log(`Running backtest from ${startDate} to ${endDate}`);
  
  try {
    // Collect historical data (weekly sampling to reduce API calls)
    const historicalData = await collectHistoricalDataRange(startDate, endDate, 'weekly');
    
    if (historicalData.length === 0) {
      throw new Error('No historical data collected for backtest period. The APIs may not have data for this date range.');
    }
    
    // Check if we have enough data with S&P 500 prices
    const dataWithPrices = historicalData.filter(d => d.sp500);
    if (dataWithPrices.length === 0) {
      throw new Error('No S&P 500 price data available for this period. Historical data may not be available from Alpha Vantage for dates before 2010.');
    }
    
    console.log(`Using ${dataWithPrices.length} data points with price information`);
  
    const results: BacktestResult[] = [];
    let portfolioValue = initialCapital;
    let buyHoldValue = initialCapital;
    let maxDrawdown = 0;
    let buyHoldMaxDrawdown = 0;
    let peakPortfolio = initialCapital;
    let peakBuyHold = initialCapital;
    
    // Track predictions vs actual crashes
    let correctPredictions = 0;
    let totalPredictions = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    
    // Use only data points with price information
    const validDataPoints = historicalData.filter(d => d.sp500);
    
    for (let i = 0; i < validDataPoints.length; i++) {
      const data = validDataPoints[i];
      if (!data.sp500) continue; // Skip if no price data (shouldn't happen after filter)
    
    // Calculate risk score
    const { totalScore, mode, suggestedExposure } = await calculateRiskScoreFromData(data);
    
      // Get current and previous prices
      const currentPrice = data.sp500.price;
      const prevData = i > 0 ? validDataPoints[i - 1] : null;
      const previousPrice = prevData?.sp500?.price ?? currentPrice;
    
      // Calculate returns
      const marketReturn = (currentPrice - previousPrice) / previousPrice;
      
      // Update portfolio based on suggested exposure
      const exposure = suggestedExposure / 100;
      const portfolioReturn = marketReturn * exposure;
      portfolioValue = portfolioValue * (1 + portfolioReturn);
      
      // Update buy-and-hold
      buyHoldValue = buyHoldValue * (1 + marketReturn);
      
      // Calculate drawdowns
      if (portfolioValue > peakPortfolio) peakPortfolio = portfolioValue;
      if (buyHoldValue > peakBuyHold) peakBuyHold = buyHoldValue;
      
      const drawdown = (peakPortfolio - portfolioValue) / peakPortfolio;
      const buyHoldDrawdown = (peakBuyHold - buyHoldValue) / peakBuyHold;
      
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      if (buyHoldDrawdown > buyHoldMaxDrawdown) buyHoldMaxDrawdown = buyHoldDrawdown;
      
      // Track predictions (simplified: consider >50 score as risk prediction, >10% drop as crash)
      if (totalScore > 50) {
        totalPredictions++;
        if (marketReturn < -0.1) {
          correctPredictions++;
        } else {
          falsePositives++;
        }
      } else if (marketReturn < -0.1 && totalScore <= 50) {
        falseNegatives++;
      }
      
      results.push({
        date: data.date,
        riskScore: totalScore,
        mode,
        suggestedExposure,
        actualSP500Price: currentPrice,
        portfolioValue,
        buyHoldValue,
        drawdown,
        buyHoldDrawdown
      });
    }
  
    // Calculate final metrics
    const totalReturn = (portfolioValue - initialCapital) / initialCapital;
    const buyHoldReturn = (buyHoldValue - initialCapital) / initialCapital;
    const drawdownReduction = buyHoldMaxDrawdown > 0 
      ? (buyHoldMaxDrawdown - maxDrawdown) / buyHoldMaxDrawdown 
      : 0;
  
  // Calculate Sharpe ratios (simplified, using returns)
  const returns = results.map((r, i) => {
    if (i === 0) return 0;
    return (r.portfolioValue - results[i - 1].portfolioValue) / results[i - 1].portfolioValue;
  }).filter(r => !isNaN(r));
  
  const buyHoldReturns = results.map((r, i) => {
    if (i === 0) return 0;
    return (r.buyHoldValue - results[i - 1].buyHoldValue) / results[i - 1].buyHoldValue;
  }).filter(r => !isNaN(r));
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const avgBuyHoldReturn = buyHoldReturns.reduce((a, b) => a + b, 0) / buyHoldReturns.length;
  
  const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const buyHoldStdDev = Math.sqrt(buyHoldReturns.reduce((sum, r) => sum + Math.pow(r - avgBuyHoldReturn, 2), 0) / buyHoldReturns.length);
  
  const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(52) : 0; // Annualized
  const buyHoldSharpeRatio = buyHoldStdDev > 0 ? (avgBuyHoldReturn / buyHoldStdDev) * Math.sqrt(52) : 0;
  
  const winRate = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  const falsePositiveRate = totalPredictions > 0 ? falsePositives / totalPredictions : 0;
  const falseNegativeRate = (correctPredictions + falseNegatives) > 0 
    ? falseNegatives / (correctPredictions + falseNegatives) 
    : 0;
  
    return {
      startDate,
      endDate,
      totalReturn,
      buyHoldReturn,
      maxDrawdown,
      buyHoldMaxDrawdown,
      drawdownReduction,
      sharpeRatio,
      buyHoldSharpeRatio,
      winRate,
      falsePositiveRate,
      falseNegativeRate,
      results
    };
  } catch (error) {
    console.error('Error in runBacktest:', error);
    throw error;
  }
}

/**
 * Run backtest for predefined crisis periods
 */
export async function runCrisisBacktests(): Promise<Record<string, BacktestMetrics>> {
  const crises = {
    '2001': { start: '2001-01-01', end: '2001-12-31' },
    '2008': { start: '2008-01-01', end: '2008-12-31' },
    '2019': { start: '2019-01-01', end: '2019-12-31' },
    '2020': { start: '2020-01-01', end: '2020-12-31' },
    '2022': { start: '2022-01-01', end: '2022-12-31' }
  };
  
  const results: Record<string, BacktestMetrics> = {};
  
  for (const [name, dates] of Object.entries(crises)) {
    try {
      console.log(`Running backtest for ${name}...`);
      results[name] = await runBacktest(dates.start, dates.end);
      console.log(`Completed backtest for ${name}`);
    } catch (error) {
      console.error(`Error running backtest for ${name}:`, error);
    }
  }
  
  return results;
}

