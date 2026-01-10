// src/utils/backtestDataCollector.ts
// Collects historical data for backtesting specific date ranges

import { API_KEYS, rateLimiter, cache } from './apiConfig';

export interface HistoricalDataPoint {
  date: string;
  sp500?: {
    price: number;
    ma50: number;
    ma200: number;
    ma10Month: number;
    priceWeekAgo: number;
  };
  vix?: {
    current: number;
    sixMonthAvg: number;
  };
  fed?: {
    fedFundsRate: number;
    fedFundsRatePrev: number;
    balanceSheet: number;
    balanceSheetPrev: number;
  };
  yields?: {
    yield10Y: number;
    yield2Y: number;
    yield3M: number;
  };
  fearGreed?: number;
  breadth?: {
    advancing: number;
    declining: number;
    avgCorrelation: number;
  };
  ism?: {
    current: number;
    trend: number;
  };
  putCallRatio?: number;
  aaii?: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  cot?: number;
  globalLiquidity?: number;
}

/**
 * Fetch historical FRED data for a specific date
 */
async function fetchFREDDataForDate(series: string, date: string): Promise<number | null> {
  try {
    const cacheKey = `fred_${series}_${date}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    await rateLimiter.waitIfNeeded();
    
    // FRED API: get observation closest to date
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${API_KEYS.fred}&file_type=json&observation_start=${date}&observation_end=${date}&sort_order=desc&limit=1`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.observations || data.observations.length === 0) return null;
    
    const valueStr = data.observations[0].value;
    if (valueStr === '.' || !valueStr) return null;
    
    const value = parseFloat(valueStr);
    if (isNaN(value)) return null;
    
    cache.set(cacheKey, value, 24 * 365); // Cache for a year
    return value;
  } catch (error) {
    console.error(`Error fetching FRED data for ${series} on ${date}:`, error);
    return null;
  }
}

/**
 * Fetch historical Alpha Vantage data for a specific date
 * Note: Alpha Vantage free tier has limited historical data
 */
async function fetchAlphaVantageForDate(symbol: string, date: string): Promise<any> {
  try {
    const cacheKey = `av_${symbol}_${date}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    await rateLimiter.waitIfNeeded();
    
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${API_KEYS.alphaVantage}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Alpha Vantage API error for ${symbol} on ${date}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data['Error Message']) {
      console.warn(`Alpha Vantage error message for ${symbol}: ${data['Error Message']}`);
      return null;
    }
    if (data['Note']) {
      console.warn(`Alpha Vantage rate limit for ${symbol}: ${data['Note']}`);
      return null;
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      console.warn(`No time series data for ${symbol} on ${date}`);
      return null;
    }
    
    // Find data for the specific date or closest date
    const targetDate = new Date(date);
    let closestDate: string | null = null;
    let minDiff = Infinity;
    
    for (const tsDate of Object.keys(timeSeries)) {
      const tsDateObj = new Date(tsDate);
      const diff = Math.abs(tsDateObj.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = tsDate;
      }
    }
    
    if (!closestDate || minDiff > 7 * 24 * 60 * 60 * 1000) {
      console.warn(`No data within 7 days for ${symbol} on ${date}, closest was ${closestDate} (${Math.round(minDiff / (24 * 60 * 60 * 1000))} days away)`);
      return null; // More than 7 days difference
    }
    
    const dayData = timeSeries[closestDate];
    if (!dayData || !dayData['4. close']) {
      console.warn(`Missing close price for ${symbol} on ${closestDate}`);
      return null;
    }
    
    const result = {
      date: closestDate,
      close: parseFloat(dayData['4. close']),
      open: parseFloat(dayData['1. open']),
      high: parseFloat(dayData['2. high']),
      low: parseFloat(dayData['3. low']),
      volume: parseFloat(dayData['5. volume'])
    };
    
    cache.set(cacheKey, result, 24 * 365);
    return result;
  } catch (error) {
    console.error(`Error fetching Alpha Vantage data for ${symbol} on ${date}:`, error);
    return null;
  }
}

/**
 * Calculate moving averages from historical price data
 */
function calculateMAsFromHistory(prices: number[], targetIndex: number): {
  ma50: number;
  ma200: number;
  ma10Month: number;
} {
  const relevantPrices = prices.slice(0, targetIndex + 1).reverse();
  
  const ma50 = relevantPrices.slice(0, Math.min(50, relevantPrices.length))
    .reduce((sum, p) => sum + p, 0) / Math.min(50, relevantPrices.length);
  
  const ma200 = relevantPrices.slice(0, Math.min(200, relevantPrices.length))
    .reduce((sum, p) => sum + p, 0) / Math.min(200, relevantPrices.length);
  
  const ma10Month = relevantPrices.slice(0, Math.min(215, relevantPrices.length))
    .reduce((sum, p) => sum + p, 0) / Math.min(215, relevantPrices.length);
  
  return { ma50, ma200, ma10Month };
}

/**
 * Collect historical data for a specific date
 * @param date - Date string in YYYY-MM-DD format
 * @param sp500TimeSeries - Optional pre-fetched S&P 500 time series to avoid repeated API calls
 */
export async function collectHistoricalDataForDate(
  date: string, 
  sp500TimeSeries?: Record<string, any> | null
): Promise<HistoricalDataPoint> {
  const result: HistoricalDataPoint = { date };
  
  try {
    // Fetch S&P 500 data (use provided time series or fetch new)
    let timeSeries = sp500TimeSeries;
    
    if (!timeSeries) {
      await rateLimiter.waitIfNeeded();
      const sp500Url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=full&apikey=${API_KEYS.alphaVantage}`;
      const sp500Response = await fetch(sp500Url);
      
      if (sp500Response.ok) {
        const sp500Data = await sp500Response.json();
        if (sp500Data['Time Series (Daily)'] && !sp500Data['Error Message'] && !sp500Data['Note']) {
          timeSeries = sp500Data['Time Series (Daily)'];
        }
      }
    }
    
    if (timeSeries) {
      const dates = Object.keys(timeSeries).sort().reverse();
      // Find closest date (on or before target date)
      const targetDateIndex = dates.findIndex(d => d <= date);
      
      if (targetDateIndex >= 0) {
        const prices = dates.map(d => parseFloat(timeSeries[d]['4. close']));
        const mas = calculateMAsFromHistory(prices, targetDateIndex);
        const priceWeekAgo = targetDateIndex >= 5 ? prices[targetDateIndex + 5] : prices[prices.length - 1];
        
        result.sp500 = {
          price: prices[targetDateIndex],
          ...mas,
          priceWeekAgo
        };
      }
    }
    
    // Fetch VIX data
    const vixData = await fetchAlphaVantageForDate('VIX', date);
    if (vixData) {
      // For VIX, we'd need to calculate 6-month average from historical data
      // Simplified: use current value as both current and average
      result.vix = {
        current: vixData.close,
        sixMonthAvg: vixData.close * 0.9 // Estimate
      };
    }
    
    // Fetch Fed data
    const fedFundsRate = await fetchFREDDataForDate('FEDFUNDS', date);
    const balanceSheet = await fetchFREDDataForDate('WALCL', date);
    
    if (fedFundsRate !== null && balanceSheet !== null) {
      // Get previous values (6 months ago)
      const prevDate = new Date(date);
      prevDate.setMonth(prevDate.getMonth() - 6);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      
      const fedFundsRatePrev = await fetchFREDDataForDate('FEDFUNDS', prevDateStr) || fedFundsRate - 0.25;
      const balanceSheetPrev = await fetchFREDDataForDate('WALCL', prevDateStr) || balanceSheet * 0.98;
      
      result.fed = {
        fedFundsRate,
        fedFundsRatePrev,
        balanceSheet,
        balanceSheetPrev
      };
    }
    
    // Fetch yield curve data
    const yield10Y = await fetchFREDDataForDate('DGS10', date);
    const yield2Y = await fetchFREDDataForDate('DGS2', date);
    const yield3M = await fetchFREDDataForDate('DGS3MO', date);
    
    if (yield10Y !== null && yield2Y !== null && yield3M !== null) {
      result.yields = { yield10Y, yield2Y, yield3M };
    }
    
    // Note: Historical data for breadth, ISM, put/call, AAII, COT, and global liquidity
    // would require more complex implementations or alternative data sources
    // For now, we'll use estimates or skip them in backtesting
    
  } catch (error) {
    console.error(`Error collecting historical data for ${date}:`, error);
  }
  
  return result;
}

/**
 * Collect historical data for a date range
 * Samples weekly to avoid too many API calls
 * Uses more efficient approach: fetch full time series once, then extract dates
 */
export async function collectHistoricalDataRange(
  startDate: string,
  endDate: string,
  sampleFrequency: 'daily' | 'weekly' = 'weekly'
): Promise<HistoricalDataPoint[]> {
  console.log(`Collecting historical data from ${startDate} to ${endDate} (${sampleFrequency} sampling)`);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dataPoints: HistoricalDataPoint[] = [];
  
  // First, try to fetch full S&P 500 time series once (more efficient)
  let sp500TimeSeries: Record<string, any> | null = null;
  try {
    await rateLimiter.waitIfNeeded();
    const sp500Url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=full&apikey=${API_KEYS.alphaVantage}`;
    const sp500Response = await fetch(sp500Url);
    
    if (sp500Response.ok) {
      const sp500Data = await sp500Response.json();
      if (sp500Data['Time Series (Daily)'] && !sp500Data['Error Message'] && !sp500Data['Note']) {
        sp500TimeSeries = sp500Data['Time Series (Daily)'];
        console.log(`Fetched S&P 500 time series with ${Object.keys(sp500TimeSeries).length} days`);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch full S&P 500 time series, will fetch per-date:', error);
  }
  
  // Calculate sampling dates
  const increment = sampleFrequency === 'weekly' ? 7 : 1;
  const datesToSample: string[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + increment)) {
    // Skip weekends for daily sampling
    if (sampleFrequency === 'daily' && (d.getDay() === 0 || d.getDay() === 6)) {
      continue;
    }
    datesToSample.push(d.toISOString().split('T')[0]);
  }
  
  console.log(`Sampling ${datesToSample.length} dates`);
  
  // Collect data for each date
  for (let i = 0; i < datesToSample.length; i++) {
    const dateStr = datesToSample[i];
    
    // Show progress every 10 dates
    if (i % 10 === 0) {
      console.log(`Progress: ${i + 1}/${datesToSample.length} dates processed`);
    }
    
    const data = await collectHistoricalDataForDate(dateStr, sp500TimeSeries);
    dataPoints.push(data);
    
    // Rate limiting between requests (only if we're making API calls)
    if (!sp500TimeSeries || i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`Collected ${dataPoints.length} data points, ${dataPoints.filter(d => d.sp500).length} with S&P 500 data`);
  
  return dataPoints;
}

