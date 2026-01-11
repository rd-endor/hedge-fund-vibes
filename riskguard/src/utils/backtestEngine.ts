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

// ==========================================
// SCORING FUNCTIONS (mirrored from completeRiskEngine.ts)
// ==========================================

function calculateTrendScore(sp500: { price: number; ma50: number; ma200: number; ma10Month: number }): number {
  let score = 0;
  if (sp500.price < sp500.ma10Month) score += 12;
  if (sp500.price < sp500.ma200) score += 8;
  if (sp500.price < sp500.ma50) score += 5;
  if (sp500.ma50 < sp500.ma200) score += 5;
  return Math.min(15, score * 0.5);
}

function calculateVIXScore(vix: { current: number; sixMonthAvg: number }): number {
  let score = 0;
  if (vix.current > 30) score += 15;
  else if (vix.current > 25) score += 10;
  else if (vix.current > 20) score += 5;
  
  const vixRatio = vix.current / vix.sixMonthAvg;
  if (vixRatio > 1.5) score += 5;
  
  return Math.min(10, score * 0.5);
}

function calculateBreadthScore(breadth: { advancing: number; declining: number; avgCorrelation: number }): number {
  let score = 0;
  const ratio = breadth.advancing / breadth.declining;
  if (ratio < 0.6) score += 16;
  else if (ratio < 0.8) score += 8;
  else if (ratio < 1.0) score += 4;
  if (ratio < 0.4) score += 9;
  return Math.min(15, score * 0.6);
}

function calculateVelocityScore(sp500: { price: number; priceWeekAgo: number }): number {
  const weeklyChange = (sp500.price - sp500.priceWeekAgo) / sp500.priceWeekAgo;
  if (weeklyChange < -0.05) return 7;
  if (weeklyChange < -0.03) return 5;
  if (weeklyChange < -0.02) return 3;
  return 0;
}

function calculateCorrelationScore(breadth: { avgCorrelation: number }): number {
  if (breadth.avgCorrelation > 0.8) return 3;
  if (breadth.avgCorrelation > 0.7) return 2;
  if (breadth.avgCorrelation > 0.6) return 1;
  return 0;
}

function calculateFedScore(fed: { fedFundsRate: number; fedFundsRatePrev: number; balanceSheet: number; balanceSheetPrev: number }): number {
  let score = 0;
  const rateChange = fed.fedFundsRate - fed.fedFundsRatePrev;
  if (rateChange > 1.0) score += 6;
  else if (rateChange > 0.25) score += 4;
  else if (rateChange < -0.25) score -= 2;
  
  const bsChange = (fed.balanceSheet - fed.balanceSheetPrev) / fed.balanceSheetPrev;
  if (bsChange < -0.10) score += 4;
  else if (bsChange < -0.05) score += 2;
  else if (bsChange > 0.05) score -= 2;
  
  return Math.max(0, Math.min(10, score));
}

function calculateYieldCurveScore(yields: { yield10Y: number; yield2Y: number; yield3M: number }): number {
  let score = 0;
  const spread_10y2y = yields.yield10Y - yields.yield2Y;
  if (spread_10y2y < -0.50) score += 5;
  else if (spread_10y2y < -0.10) score += 3;
  else if (spread_10y2y < 0) score += 1;
  
  const spread_10y3m = yields.yield10Y - yields.yield3M;
  if (spread_10y3m < -0.50) score += 3;
  else if (spread_10y3m < 0) score += 1;
  
  return Math.min(8, score);
}

function calculateISMScore(ism: { current: number; trend: number }): number {
  let score = 0;
  if (ism.current < 45) score += 5;
  else if (ism.current < 50) score += 3;
  else if (ism.current > 55) score -= 2;
  if (ism.current < ism.trend - 2) score += 2;
  return Math.max(0, Math.min(7, score));
}

function calculateFearGreedScore(index: number): number {
  if (index > 80) return 5;
  else if (index > 65) return 3;
  else if (index < 20) return -3;
  return 0;
}

/**
 * Calculate risk score from historical data point using full risk engine logic
 * This mirrors the complete risk engine calculation but works with historical data
 */
async function calculateHistoricalRiskScore(data: HistoricalDataPoint): Promise<{
  totalScore: number;
  mode: 'bull' | 'caution' | 'bear';
  suggestedExposure: number;
  breakdown: {
    technical: { trend: number; volatility: number; breadth: number; velocity: number; correlation: number; total: number };
    macro: { fedPolicy: number; yieldCurve: number; ism: number; globalLiquidity: number; total: number };
    sentiment: { putCall: number; aaii: number; fearGreed: number; cot: number; total: number };
  };
}> {
  // Technical scores
  const technical = {
    trend: data.sp500 ? calculateTrendScore(data.sp500) : 0,
    volatility: data.vix ? calculateVIXScore(data.vix) : 0,
    breadth: data.breadth ? calculateBreadthScore(data.breadth) : 0,
    velocity: data.sp500 ? calculateVelocityScore(data.sp500) : 0,
    correlation: data.breadth ? calculateCorrelationScore(data.breadth) : 0,
    total: 0
  };
  technical.total = technical.trend + technical.volatility + technical.breadth + 
                    technical.velocity + technical.correlation;
  
  // Macro scores
  const macro = {
    fedPolicy: data.fed ? calculateFedScore(data.fed) : 0,
    yieldCurve: data.yields ? calculateYieldCurveScore(data.yields) : 0,
    ism: data.ism ? calculateISMScore(data.ism) : 0,
    globalLiquidity: data.globalLiquidity !== undefined ? data.globalLiquidity : 2,
    total: 0
  };
  macro.total = macro.fedPolicy + macro.yieldCurve + macro.ism + macro.globalLiquidity;
  
  // Sentiment scores
  const putCallRatio = data.putCallRatio !== undefined ? data.putCallRatio : 1.0;
  const putCallScore = putCallRatio > 1.2 ? 6 : putCallRatio > 1.0 ? 4 : putCallRatio > 0.8 ? 2 : 0;
  
  const aaiiSentiment = data.aaii || { bullish: 33, bearish: 33, neutral: 34 };
  const aaiiScore = aaiiSentiment.bearish > 45 ? 5 : aaiiSentiment.bearish > 35 ? 3 : aaiiSentiment.bearish > 25 ? 1 : 0;
  
  const fearGreedIndex = data.fearGreed !== undefined ? data.fearGreed : 50;
  
  const sentiment = {
    putCall: putCallScore,
    aaii: aaiiScore,
    fearGreed: calculateFearGreedScore(fearGreedIndex),
    cot: data.cot !== undefined ? data.cot : 1,
    total: 0
  };
  sentiment.total = sentiment.putCall + sentiment.aaii + sentiment.fearGreed + sentiment.cot;
  
  const totalScore = technical.total + macro.total + sentiment.total;
  
  // Determine mode and exposure (same logic as complete risk engine)
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
  
  return { totalScore, mode, suggestedExposure, breakdown: { technical, macro, sentiment } };
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
    
    // Portfolio tracking for risk engine strategy
    let portfolioValue = initialCapital;
    let equityValue = 0; // Will be set based on first risk score
    let cashValue = initialCapital; // Start with all cash, will allocate on first step
    
    // Buy-and-hold strategy (always 100% equity, no rebalancing)
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
    
    // Track previous exposure to detect changes
    let previousExposure: number | null = null;
    
    for (let i = 0; i < validDataPoints.length; i++) {
      const data = validDataPoints[i];
      if (!data.sp500) continue; // Skip if no price data (shouldn't happen after filter)
    
      // Calculate risk score using full risk engine
      const { totalScore, mode, suggestedExposure } = await calculateHistoricalRiskScore(data);
    
      // Get current and previous prices
      const currentPrice = data.sp500.price;
      const prevData = i > 0 ? validDataPoints[i - 1] : null;
      const previousPrice = prevData?.sp500?.price ?? currentPrice;
    
      // Calculate market return
      const marketReturn = (currentPrice - previousPrice) / previousPrice;
      
      // On first iteration, allocate based on risk score before applying any returns
      // On subsequent iterations, apply returns first, then rebalance if needed
      if (previousExposure === null) {
        // First time: allocate based on initial risk score
        const targetEquity = portfolioValue * (suggestedExposure / 100);
        equityValue = targetEquity;
        cashValue = portfolioValue - targetEquity;
        // portfolioValue remains the same (just reallocated)
        previousExposure = suggestedExposure;
      } else {
        // Apply market return to existing equity position (cash earns no return)
        equityValue = equityValue * (1 + marketReturn);
        portfolioValue = equityValue + cashValue;
        
        // REBALANCE if exposure changed
        if (previousExposure !== suggestedExposure) {
          // Calculate target equity allocation based on current portfolio value
          const targetEquity = portfolioValue * (suggestedExposure / 100);
          const rebalanceAmount = targetEquity - equityValue;
          
          if (rebalanceAmount > 0) {
            // Need to buy more equity - use cash
            const cashToUse = Math.min(cashValue, rebalanceAmount);
            equityValue += cashToUse;
            cashValue -= cashToUse;
          } else if (rebalanceAmount < 0) {
            // Need to sell equity - add to cash
            const equityToSell = Math.min(equityValue, Math.abs(rebalanceAmount));
            equityValue -= equityToSell;
            cashValue += equityToSell;
          }
          
          // Update portfolio value after rebalancing
          portfolioValue = equityValue + cashValue;
          previousExposure = suggestedExposure;
        }
      }
      
      // Update buy-and-hold (always 100% equity, no rebalancing needed)
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

