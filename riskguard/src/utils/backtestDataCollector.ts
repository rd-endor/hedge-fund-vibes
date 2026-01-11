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
 * Helper to add timeout to fetch requests
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Fetch full VIX time series once (like S&P 500)
 * This avoids making 52+ separate API calls
 * Note: VIX may not be available from Alpha Vantage (it's an index, not a stock)
 */
async function fetchVIXTimeSeries(): Promise<Record<string, any> | null> {
  try {
    const cacheKey = 'vix_full_timeseries';
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('Using cached VIX data');
      return cached;
    }

    await rateLimiter.waitIfNeeded();
    // Note: Free tier only supports 'compact' (last 100 data points), not 'full'
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=VIX&outputsize=compact&apikey=${API_KEYS.alphaVantage}`;
    
    console.log('Fetching VIX from Alpha Vantage...');
    const response = await fetchWithTimeout(url, 30000);
    
    if (!response.ok) {
      console.warn(`VIX API returned status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data['Error Message']) {
      console.warn(`VIX API error: ${data['Error Message']}`);
      return null;
    }
    if (data['Note']) {
      console.warn(`VIX API rate limit: ${data['Note']}`);
      return null;
    }
    if (data['Information'] && data['Information'].includes('premium')) {
      console.warn('VIX: Premium feature required (free tier limited to last 100 data points)');
      return null;
    }
    if (!data['Time Series (Daily)']) {
      console.warn('VIX: No time series data available (VIX may not be supported by Alpha Vantage)');
      return null;
    }
    
    const timeSeries = data['Time Series (Daily)'];
    cache.set(cacheKey, timeSeries, 24 * 365);
    return timeSeries;
  } catch (error: any) {
    console.warn('Error fetching VIX time series (optional, continuing):', error.message || error);
    return null;
  }
}

/**
 * Batch fetch FRED data for multiple series and date range
 * FRED API supports fetching date ranges efficiently
 * This fetches all needed data in parallel upfront
 */
async function fetchFREDDataRange(
  series: string[], 
  startDate: string, 
  endDate: string
): Promise<Record<string, Record<string, number>>> {
  const results: Record<string, Record<string, number>> = {};
  
  // FRED API can fetch one series at a time, but we can parallelize
  const promises = series.map(async (ser) => {
    try {
      const cacheKey = `fred_range_${ser}_${startDate}_${endDate}`;
      const cached = cache.get(cacheKey);
      if (cached) return { series: ser, data: cached };

      // FRED doesn't have strict rate limits like Alpha Vantage
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${ser}&api_key=${API_KEYS.fred}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=asc`;
      
      const response = await fetchWithTimeout(url, 30000);
      if (!response.ok) {
        console.warn(`FRED API returned status ${response.status} for ${ser}`);
        return { series: ser, data: null };
      }
      
      const data = await response.json();
      if (!data.observations) return { series: ser, data: null };
      
      const observations: Record<string, number> = {};
      for (const obs of data.observations) {
        if (obs.value && obs.value !== '.') {
          const value = parseFloat(obs.value);
          if (!isNaN(value)) {
            observations[obs.date] = value;
          }
        }
      }
      
      cache.set(cacheKey, observations, 24 * 365);
      return { series: ser, data: observations };
    } catch (error) {
      console.error(`Error fetching FRED range for ${ser}:`, error);
      return { series: ser, data: null };
    }
  });
  
  const fetched = await Promise.all(promises);
  for (const { series, data } of fetched) {
    if (data) {
      results[series] = data;
    }
  }
  
  return results;
}

/**
 * Find closest date in a series data object
 */
function findClosestDate(seriesData: Record<string, number>, target: string): number | null {
  if (!seriesData || Object.keys(seriesData).length === 0) return null;
  
  const dates = Object.keys(seriesData).sort();
  const exact = seriesData[target];
  if (exact !== undefined) return exact;
  
  // Find closest date (on or before target)
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= target) {
      return seriesData[dates[i]];
    }
  }
  
  // If no date before target, return first available
  return seriesData[dates[0]] || null;
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
 * @param vixTimeSeries - Optional pre-fetched VIX time series to avoid repeated API calls
 * @param fredData - Optional pre-fetched FRED data to avoid repeated API calls
 */
export async function collectHistoricalDataForDate(
  date: string, 
  sp500TimeSeries?: Record<string, any> | null,
  vixTimeSeries?: Record<string, any> | null,
  fredData?: Record<string, Record<string, number>> | null
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
      let targetDateIndex = dates.findIndex(d => d <= date);
      
      // If target date is before all available data, use the earliest available date
      if (targetDateIndex === -1) {
        // Use the earliest date (last in reverse-sorted array)
        targetDateIndex = dates.length - 1;
        console.warn(`Date ${date} is before available data. Using earliest available date: ${dates[targetDateIndex]}`);
      }
      
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
    
    // VIX data (using pre-fetched time series)
    if (vixTimeSeries) {
      const dates = Object.keys(vixTimeSeries).sort().reverse();
      const targetDateIndex = dates.findIndex(d => d <= date);
      
      if (targetDateIndex >= 0) {
        const currentVIX = parseFloat(vixTimeSeries[dates[targetDateIndex]]['4. close']);
        
        // Calculate 6-month average (approximately 130 trading days)
        const sixMonthStart = Math.max(0, targetDateIndex - 130);
        const sixMonthPrices = dates.slice(sixMonthStart, targetDateIndex + 1)
          .map(d => parseFloat(vixTimeSeries[d]['4. close']))
          .filter(p => !isNaN(p));
        
        const sixMonthAvg = sixMonthPrices.length > 0
          ? sixMonthPrices.reduce((sum, p) => sum + p, 0) / sixMonthPrices.length
          : currentVIX;
        
        result.vix = {
          current: currentVIX,
          sixMonthAvg
        };
      }
    }
    
    // FRED data (using pre-fetched data)
    if (fredData) {
      // Fed Funds Rate
      const fedFundsRate = findClosestDate(fredData['FEDFUNDS'] || {}, date);
      const balanceSheet = findClosestDate(fredData['WALCL'] || {}, date);
      
      if (fedFundsRate !== null && balanceSheet !== null) {
        // Get previous values (6 months ago)
        const prevDate = new Date(date);
        prevDate.setMonth(prevDate.getMonth() - 6);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const fedFundsRatePrev = findClosestDate(fredData['FEDFUNDS'] || {}, prevDateStr) || fedFundsRate - 0.25;
        const balanceSheetPrev = findClosestDate(fredData['WALCL'] || {}, prevDateStr) || balanceSheet * 0.98;
        
        result.fed = {
          fedFundsRate,
          fedFundsRatePrev,
          balanceSheet,
          balanceSheetPrev
        };
      }
      
      // Yield curve
      const yield10Y = findClosestDate(fredData['DGS10'] || {}, date);
      const yield2Y = findClosestDate(fredData['DGS2'] || {}, date);
      const yield3M = findClosestDate(fredData['DGS3MO'] || {}, date);
      
      if (yield10Y !== null && yield2Y !== null && yield3M !== null) {
        result.yields = { yield10Y, yield2Y, yield3M };
      }
    }
    
    // Add defaults for optional data sources that may not be available historically
    // These use neutral values that won't skew the risk score
    
    if (!result.fearGreed) {
      result.fearGreed = 50; // Neutral Fear & Greed Index
    }
    
    if (!result.breadth) {
      // Neutral breadth: equal advancing/declining, moderate correlation
      result.breadth = {
        advancing: 1500,
        declining: 1500,
        avgCorrelation: 0.5
      };
    }
    
    if (!result.ism) {
      // Neutral ISM: slightly above 50 (expansion)
      result.ism = {
        current: 52,
        trend: 51
      };
    }
    
    if (result.putCallRatio === undefined) {
      result.putCallRatio = 1.0; // Neutral Put/Call ratio
    }
    
    if (!result.aaii) {
      // Neutral AAII sentiment: balanced
      result.aaii = {
        bullish: 33,
        bearish: 33,
        neutral: 34
      };
    }
    
    if (result.cot === undefined) {
      result.cot = 1; // Neutral COT positioning
    }
    
    if (result.globalLiquidity === undefined) {
      result.globalLiquidity = 2; // Neutral global liquidity score
    }
    
  } catch (error) {
    console.error(`Error collecting historical data for ${date}:`, error);
  }
  
  return result;
}

/**
 * Helper to wrap async functions with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`)), timeoutMs)
    )
  ]);
}

/**
 * Collect historical data for a date range
 * OPTIMIZED: Fetches full time series once, batches FRED calls
 * Samples weekly to avoid too many API calls
 */
export async function collectHistoricalDataRange(
  startDate: string,
  endDate: string,
  sampleFrequency: 'daily' | 'weekly' = 'weekly'
): Promise<HistoricalDataPoint[]> {
  console.log(`[${new Date().toISOString()}] Collecting historical data from ${startDate} to ${endDate} (${sampleFrequency} sampling)`);
  
  const start = new Date(startDate);
  let end = new Date(endDate);
  const dataPoints: HistoricalDataPoint[] = [];
  
  try {
    // Wrap entire operation in timeout (5 minutes max)
    return await withTimeout(
      (async () => {
    // Fetch all time series data ONCE upfront (in parallel where possible)
    console.log('Fetching time series data...');
    
    // Fetch S&P 500 first (required)
    let sp500TimeSeries: Record<string, any> | null = null;
    try {
      // Check cache first
      const cacheKey = 'sp500_full_timeseries';
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('Using cached S&P 500 time series');
        sp500TimeSeries = cached;
      } else {
        await rateLimiter.waitIfNeeded();
        console.log('Fetching S&P 500 data from Alpha Vantage...');
        // Note: Free tier only supports 'compact' (last 100 data points), not 'full'
        const sp500Url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=compact&apikey=${API_KEYS.alphaVantage}`;
        const sp500Response = await fetchWithTimeout(sp500Url, 30000);
      
      if (!sp500Response.ok) {
        const errorText = await sp500Response.text().catch(() => 'Unable to read response');
        console.error(`S&P 500 API returned status ${sp500Response.status}:`, errorText);
        throw new Error(`Alpha Vantage API returned HTTP ${sp500Response.status}. This may be a rate limit or API key issue.`);
      }
      
      const sp500Data = await sp500Response.json();
      
      // Check for Information message (premium feature notice)
      if (sp500Data['Information']) {
        console.warn('Alpha Vantage Information:', sp500Data['Information']);
        // If it's about premium features, we'll handle it below by checking for time series
      }
      
      // Check for API error messages
      if (sp500Data['Error Message']) {
        console.error('Alpha Vantage API error:', sp500Data['Error Message']);
        throw new Error(`Alpha Vantage API error: ${sp500Data['Error Message']}. Please check your API key.`);
      }
      
      if (sp500Data['Note']) {
        console.error('Alpha Vantage rate limit:', sp500Data['Note']);
        throw new Error(`Alpha Vantage rate limit reached: ${sp500Data['Note']}. Please wait a moment and try again.`);
      }
      
      // Try different possible response formats
      let timeSeries = sp500Data['Time Series (Daily)'] || 
                       sp500Data['Weekly Time Series'] ||
                       sp500Data['Monthly Time Series'];
      
      // Also check for lowercase or other variations
      if (!timeSeries) {
        const allKeys = Object.keys(sp500Data);
        const timeSeriesKey = allKeys.find(key => 
          key.toLowerCase().includes('time') && 
          key.toLowerCase().includes('series')
        );
        if (timeSeriesKey) {
          timeSeries = sp500Data[timeSeriesKey];
          console.log(`Found time series under key: ${timeSeriesKey}`);
        }
      }
      
      if (timeSeries && typeof timeSeries === 'object') {
        sp500TimeSeries = timeSeries;
        const daysCount = Object.keys(sp500TimeSeries).length;
        console.log(`✓ Fetched S&P 500 time series with ${daysCount} days`);
        
        if (daysCount === 0) {
          throw new Error('S&P 500 API returned empty time series data.');
        }
        
        // Check if we have enough data for the requested date range
        const dates = Object.keys(sp500TimeSeries).sort();
        const oldestDate = dates[0];
        const newestDate = dates[dates.length - 1];
        console.log(`S&P 500 data range: ${oldestDate} to ${newestDate} (${daysCount} days)`);
        
        // Warn if the requested start date is before available data
        if (new Date(startDate) < new Date(oldestDate)) {
          console.warn(`Warning: Requested start date ${startDate} is before available data (${oldestDate}). Using available data range.`);
        }
        
        // Cache the time series for future use
        cache.set(cacheKey, sp500TimeSeries, 24 * 365); // Cache for a year
      } else {
        // Check if it's a premium feature message
        if (sp500Data['Information'] && sp500Data['Information'].includes('premium')) {
          throw new Error(`Alpha Vantage free tier limitation: ${sp500Data['Information']}. The free tier only provides the last 100 data points. For longer backtests, consider using a premium API key or a different data source.`);
        }
        
        // Log the full response for debugging
        console.error('S&P 500 API response:', JSON.stringify(sp500Data, null, 2));
        console.error('Available keys:', Object.keys(sp500Data));
        throw new Error(`S&P 500 API did not return time series data. Response structure: ${JSON.stringify(Object.keys(sp500Data))}. This may indicate an API key issue or rate limit.`);
      }
      }
    } catch (error: any) {
      console.error('Failed to fetch S&P 500 time series:', error);
      // Re-throw with more context if it's not already a detailed error
      if (error.message && error.message.includes('Alpha Vantage')) {
        throw error;
      }
      throw new Error(`Failed to fetch S&P 500 data: ${error.message || 'Unknown error'}. Please check your API key and try again.`);
    }
    
    if (!sp500TimeSeries) {
      throw new Error('Failed to fetch S&P 500 data. This is required for backtesting. Please check your API key and network connection.');
    }
    
    // Fetch VIX (optional - may not be available from Alpha Vantage)
    let vixTimeSeries: Record<string, any> | null = null;
    try {
      console.log('Fetching VIX data (optional)...');
      vixTimeSeries = await fetchVIXTimeSeries();
      if (vixTimeSeries) {
        console.log(`✓ Fetched VIX time series with ${Object.keys(vixTimeSeries).length} days`);
      } else {
        console.warn('⚠ VIX data not available (this is optional, backtest will continue)');
      }
    } catch (error) {
      console.warn('Failed to fetch VIX time series (optional, continuing):', error);
    }
    
    // Fetch all FRED data in parallel for the entire date range
    console.log('Fetching FRED data...');
    let fredData: Record<string, Record<string, number>> = {};
    try {
      fredData = await fetchFREDDataRange(
        ['FEDFUNDS', 'WALCL', 'DGS10', 'DGS2', 'DGS3MO'],
        startDate,
        endDate
      );
      console.log(`✓ Fetched FRED data for ${Object.keys(fredData).length} series`);
    } catch (error) {
      console.warn('Failed to fetch some FRED data (continuing with available data):', error);
    }
    
    // Calculate sampling dates
    const increment = sampleFrequency === 'weekly' ? 7 : 1;
    const datesToSample: string[] = [];
    
    // Get the actual date range from S&P 500 data
    let actualStartDate = start;
    if (sp500TimeSeries) {
      const sp500Dates = Object.keys(sp500TimeSeries).sort();
      const earliestSP500Date = sp500Dates[0];
      const latestSP500Date = sp500Dates[sp500Dates.length - 1];
      
      console.log(`S&P 500 data available from ${earliestSP500Date} to ${latestSP500Date}`);
      
      // Adjust start date if it's before available data
      if (new Date(startDate) < new Date(earliestSP500Date)) {
        console.warn(`Requested start date ${startDate} is before available data (${earliestSP500Date}). Using ${earliestSP500Date} as start.`);
        actualStartDate = new Date(earliestSP500Date);
      }
      
      // Adjust end date if it's after available data
      if (new Date(endDate) > new Date(latestSP500Date)) {
        console.warn(`Requested end date ${endDate} is after available data (${latestSP500Date}). Using ${latestSP500Date} as end.`);
        end = new Date(latestSP500Date);
      }
    }
    
    for (let d = new Date(actualStartDate); d <= end; d.setDate(d.getDate() + increment)) {
      // Skip weekends for daily sampling
      if (sampleFrequency === 'daily' && (d.getDay() === 0 || d.getDay() === 6)) {
        continue;
      }
      datesToSample.push(d.toISOString().split('T')[0]);
    }
    
    console.log(`Processing ${datesToSample.length} dates from cached data...`);
    
    // Now collect data for each date (no API calls needed - all data is cached!)
    for (let i = 0; i < datesToSample.length; i++) {
      const dateStr = datesToSample[i];
      
      // Show progress every 10 dates
      if (i % 10 === 0) {
        console.log(`Progress: ${i + 1}/${datesToSample.length} dates processed`);
      }
      
      const data = await collectHistoricalDataForDate(
        dateStr, 
        sp500TimeSeries,
        vixTimeSeries,
        fredData
      );
      dataPoints.push(data);
    }
    
    console.log(`✓ Collected ${dataPoints.length} data points, ${dataPoints.filter(d => d.sp500).length} with S&P 500 data`);
    
    return dataPoints;
      })(),
      5 * 60 * 1000, // 5 minute timeout
      'Data collection timed out'
    );
  } catch (error: any) {
    console.error('Error in collectHistoricalDataRange:', error);
    throw error;
  }
}

