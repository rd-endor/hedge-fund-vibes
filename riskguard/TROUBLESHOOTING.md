# Troubleshooting Guide

## Blank Screen Issues

If you're seeing a blank screen when running the app, try the following:

### 1. Check Browser Console
Open your browser's developer console (F12 or Cmd+Option+I) and look for:
- JavaScript errors (red text)
- Failed network requests
- CORS errors

### 2. Clear Local Storage
The app uses localStorage. If you're stuck, try:
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

### 3. Check Onboarding
On first load, you should see an onboarding screen asking about your portfolio allocation. If you don't see it:
- Check if `localStorage.getItem('onboardingComplete')` is set
- Clear localStorage (see step 2)

### 4. Data Loading Issues
The app fetches data from multiple APIs. If data loading fails:
- Check your internet connection
- Verify API keys in `src/utils/apiConfig.ts`
- Check browser console for API errors
- The app should show an error screen with a "Try Again" button

### 5. Common Issues

#### CORS Errors
Some APIs may block browser requests. If you see CORS errors:
- The app has fallback to mock data
- For production, you may need a backend proxy

#### API Rate Limits
Alpha Vantage free tier has rate limits (5 calls/minute):
- The app implements rate limiting
- If you hit limits, wait a minute and try again
- Consider upgrading API keys

#### Missing Data
If some data sources fail:
- The app falls back to mock data
- Check console for warnings about failed fetches

### 6. Verify App is Running
1. Check terminal shows: `VITE ready in XXX ms`
2. Open the URL shown (usually `http://localhost:5173`)
3. Check browser shows the page (not "Cannot GET /")

### 7. Reset Everything
If nothing works:
```bash
# Stop the server (Ctrl+C)
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Expected Behavior

1. **First Load**: Onboarding screen → Enter portfolio % → Click "Get Started"
2. **Dashboard**: Loading spinner → Market data loads → Dashboard displays
3. **Navigation**: Click "Backtest" button to go to backtesting page

## Still Having Issues?

Check:
- Node.js version (should be 16+)
- All dependencies installed (`npm install`)
- No port conflicts (try different port)
- Browser compatibility (Chrome, Firefox, Safari latest versions)

