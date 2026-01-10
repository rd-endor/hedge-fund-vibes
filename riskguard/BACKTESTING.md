# Backtesting Documentation

## Overview

The backtesting feature allows you to evaluate the risk framework's performance during historical market periods. This helps determine if the framework would have minimized drawdowns during major market crashes.

## Features

- **Historical Period Analysis**: Test the framework against specific crisis periods (2001, 2008, 2019, 2020, 2022)
- **Custom Date Ranges**: Run backtests for any date range
- **Performance Metrics**: Comprehensive metrics including returns, drawdowns, Sharpe ratios, and prediction accuracy
- **Visualizations**: Interactive charts showing portfolio performance, risk scores, and drawdowns

## How to Use

### Running a Backtest

1. Navigate to the Backtest page from the main dashboard
2. Choose one of the pre-configured crisis periods or select a custom date range
3. Click "Run Backtest" to start the analysis
4. Review the results including:
   - Performance metrics
   - Portfolio value comparison charts
   - Risk score timeline
   - Drawdown analysis

### Pre-configured Crisis Periods

- **2001**: Dot-com bubble burst
- **2008**: Global financial crisis
- **2019**: Pre-COVID market conditions
- **2020**: COVID-19 pandemic crash
- **2022**: Market volatility period

### Understanding the Metrics

#### Performance Metrics

- **Total Return**: Percentage return of the framework-managed portfolio
- **Buy & Hold Return**: Percentage return of a buy-and-hold strategy
- **Max Drawdown**: Maximum peak-to-trough decline in portfolio value
- **Drawdown Reduction**: Improvement in drawdown vs buy-and-hold
- **Sharpe Ratio**: Risk-adjusted return measure (higher is better)

#### Prediction Metrics

- **Win Rate**: Percentage of times the framework correctly predicted market crashes
- **False Positive Rate**: Percentage of risk signals that didn't result in crashes
- **False Negative Rate**: Percentage of crashes that weren't predicted

## Data Sources

The backtesting system uses historical data from:

- **FRED API**: Federal Reserve Economic Data for interest rates, yields, and economic indicators
- **Alpha Vantage**: Historical stock price data (S&P 500, VIX)
- **Cached Data**: Historical data is cached to improve performance

## Limitations

- Historical data availability may vary by date range
- Some data sources may have limited historical coverage (especially pre-2000)
- Web scraping sources (AAII, CBOE) may have rate limits
- Backtesting uses weekly sampling to reduce API calls

## Technical Details

### Backtesting Engine

The backtesting engine (`backtestEngine.ts`) simulates portfolio performance by:

1. Collecting historical data for the specified date range
2. Calculating risk scores for each time period
3. Adjusting portfolio exposure based on risk scores
4. Comparing performance against buy-and-hold strategy
5. Calculating comprehensive performance metrics

### Data Collection

Historical data collection (`backtestDataCollector.ts`) fetches:

- S&P 500 price data and moving averages
- VIX volatility data
- Federal Reserve interest rates and balance sheet data
- Yield curve data (10Y, 2Y, 3M)

## Interpreting Results

### Positive Indicators

- **Drawdown Reduction > 0%**: Framework reduced losses vs buy-and-hold
- **Higher Sharpe Ratio**: Better risk-adjusted returns
- **Win Rate > 50%**: Framework correctly predicted most crashes
- **Lower False Negative Rate**: Framework rarely missed crashes

### Areas for Improvement

- **High False Positive Rate**: Framework may be too conservative
- **Negative Drawdown Reduction**: Framework underperformed buy-and-hold
- **Low Win Rate**: Framework predictions may need refinement

## Best Practices

1. **Test Multiple Periods**: Don't rely on a single backtest result
2. **Consider Market Context**: Different market regimes may affect performance
3. **Review Metrics Holistically**: Consider all metrics together, not just returns
4. **Understand Limitations**: Past performance doesn't guarantee future results

## Future Enhancements

- More granular data collection (daily instead of weekly)
- Additional historical periods
- Monte Carlo simulation
- Walk-forward analysis
- Comparison with other risk management strategies

