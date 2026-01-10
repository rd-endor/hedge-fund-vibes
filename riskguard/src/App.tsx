import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Info, ChevronDown, ChevronUp, BarChart3, DollarSign, Users, AlertCircle, Clock } from 'lucide-react';
import { calculateCompleteRiskScore } from './utils/completeRiskEngine';
import BacktestPage from './app/backtest/page';

interface CompleteRiskAssessment {
  mode: 'bull' | 'caution' | 'bear';
  confidence: number;
  totalScore: number;
  breakdown: {
    technical: { trend: number; volatility: number; breadth: number; velocity: number; correlation: number; total: number };
    macro: { fedPolicy: number; yieldCurve: number; ism: number; globalLiquidity: number; total: number };
    sentiment: { putCall: number; aaii: number; fearGreed: number; cot: number; total: number };
  };
  reasons: string[];
  suggestedExposure: number;
  rawData?: any;
}

function StatusBadge({ mode, confidence }: { mode: string; confidence: number }) {
  const config = {
    bull: { icon: TrendingUp, bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', label: 'BULL MODE' },
    caution: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', label: 'CAUTION' },
    bear: { icon: TrendingDown, bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'BEAR MODE' }
  };
  const { icon: Icon, bg, border, text, label } = config[mode as keyof typeof config];
  return (
    <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${bg} border-2 ${border}`}>
      <Icon className={`w-5 h-5 ${text}`} />
      <span className={`font-bold ${text}`}>{label}</span>
      <span className="text-xs text-gray-600">• {confidence}% confidence</span>
    </div>
  );
}

function PillarCard({ title, icon: Icon, score, maxScore, factors, expanded, onToggle }: any) {
  const percentage = Math.abs((score / maxScore) * 100);
  const colorClass = percentage > 70 ? 'bg-red-500' : percentage > 40 ? 'bg-amber-500' : 'bg-emerald-500';
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${percentage > 70 ? 'bg-red-100' : percentage > 40 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Icon className={`w-5 h-5 ${percentage > 70 ? 'text-red-600' : percentage > 40 ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">Max {maxScore} points</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${score < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>{score}</div>
          <div className="text-xs text-gray-500">{Math.round(percentage)}%</div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${colorClass}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      
      <button onClick={onToggle} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900">
        <span>View breakdown</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          {factors.map((factor: any) => (
            <div key={factor.name} className="flex justify-between text-sm">
              <span className="text-gray-600">{factor.name}</span>
              <span className="font-medium">{factor.score}/{factor.max}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard({ userStockPercent, setUserStockPercent }: any) {
  const [marketStatus, setMarketStatus] = useState<CompleteRiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMarketData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading market data...');
      const status = await calculateCompleteRiskScore();
      setMarketStatus(status);
      setLastUpdated(new Date());
      console.log('✅ Data loaded successfully');
    } catch (err: any) {
      const errorMsg = err?.message || err?.toString() || 'Failed to load market data';
      setError(errorMsg);
      console.error('❌ Error loading data:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, []);

  if (loading && !marketStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Fetching market data from APIs...</p>
        <p className="text-xs text-gray-500 mt-2">This may take 15-30 seconds on first load</p>
      </div>
    );
  }

  if (error && !marketStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadMarketData}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!marketStatus) return null;

  const technicalFactors = [
    { name: 'Trend (10-mo MA)', score: marketStatus.breakdown.technical.trend, max: 15 },
    { name: 'Volatility (VIX)', score: marketStatus.breakdown.technical.volatility, max: 10 },
    { name: 'Market Breadth', score: marketStatus.breakdown.technical.breadth, max: 15 },
    { name: 'Velocity', score: marketStatus.breakdown.technical.velocity, max: 7 },
    { name: 'Correlation', score: marketStatus.breakdown.technical.correlation, max: 3 }
  ];

  const macroFactors = [
    { name: 'Fed Policy', score: marketStatus.breakdown.macro.fedPolicy, max: 10 },
    { name: 'Yield Curve', score: marketStatus.breakdown.macro.yieldCurve, max: 8 },
    { name: 'ISM Manufacturing', score: marketStatus.breakdown.macro.ism, max: 7 },
    { name: 'Global Liquidity', score: marketStatus.breakdown.macro.globalLiquidity, max: 5 }
  ];

  const sentimentFactors = [
    { name: 'Put/Call Ratio', score: marketStatus.breakdown.sentiment.putCall, max: 6 },
    { name: 'AAII Survey', score: marketStatus.breakdown.sentiment.aaii, max: 5 },
    { name: 'Fear & Greed', score: marketStatus.breakdown.sentiment.fearGreed, max: 5 },
    { name: 'COT Positioning', score: marketStatus.breakdown.sentiment.cot, max: 4 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">BULL/BEAR</h1>
              <p className="text-xs text-gray-500">3-Pillar Risk Framework</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <Link
              to="/backtest"
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Backtest
            </Link>
            <button 
              onClick={loadMarketData} 
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Using Cached Data</p>
                <p className="text-xs text-amber-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200 mb-6">
          <div className="flex flex-col items-center text-center mb-6">
            <StatusBadge mode={marketStatus.mode} confidence={marketStatus.confidence} />
            <div className="mt-6 grid grid-cols-3 gap-8 w-full max-w-2xl">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Technical</div>
                <div className="text-3xl font-bold text-gray-900">{marketStatus.breakdown.technical.total}</div>
                <div className="text-xs text-gray-500">/ 50 points</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Macro</div>
                <div className="text-3xl font-bold text-gray-900">{marketStatus.breakdown.macro.total}</div>
                <div className="text-xs text-gray-500">/ 30 points</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Sentiment</div>
                <div className={`text-3xl font-bold ${marketStatus.breakdown.sentiment.total < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {marketStatus.breakdown.sentiment.total}
                </div>
                <div className="text-xs text-gray-500">/ 20 points</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Total Risk Score</span>
              <span className="text-2xl font-bold text-gray-900">{marketStatus.totalScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  marketStatus.totalScore >= 65 ? 'bg-red-500' :
                  marketStatus.totalScore >= 45 ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, marketStatus.totalScore)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <PillarCard
            title="Technical"
            icon={BarChart3}
            score={marketStatus.breakdown.technical.total}
            maxScore={50}
            factors={technicalFactors}
            expanded={expandedPillar === 'technical'}
            onToggle={() => setExpandedPillar(expandedPillar === 'technical' ? null : 'technical')}
          />
          <PillarCard
            title="Macro"
            icon={DollarSign}
            score={marketStatus.breakdown.macro.total}
            maxScore={30}
            factors={macroFactors}
            expanded={expandedPillar === 'macro'}
            onToggle={() => setExpandedPillar(expandedPillar === 'macro' ? null : 'macro')}
          />
          <PillarCard
            title="Sentiment"
            icon={Users}
            score={marketStatus.breakdown.sentiment.total}
            maxScore={20}
            factors={sentimentFactors}
            expanded={expandedPillar === 'sentiment'}
            onToggle={() => setExpandedPillar(expandedPillar === 'sentiment' ? null : 'sentiment')}
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-6">Your Stock Exposure</h3>
          <div className="relative py-8">
            <input
              type="range"
              min="20"
              max="100"
              value={userStockPercent}
              onChange={(e) => setUserStockPercent(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-6">
              <div className="text-center flex-1">
                <div className="text-sm text-gray-500 mb-1">Your Position</div>
                <div className="text-3xl font-bold text-gray-900">{userStockPercent}%</div>
              </div>
              <div className="text-center flex-1 bg-emerald-50 rounded-lg p-3">
                <div className="text-sm text-emerald-700 mb-1 flex items-center justify-center gap-1">
                  <Info className="w-4 h-4" />
                  Suggested
                </div>
                <div className="text-3xl font-bold text-emerald-600">{marketStatus.suggestedExposure}%</div>
              </div>
            </div>
          </div>
          {userStockPercent !== marketStatus.suggestedExposure && (
            <button
              onClick={() => setUserStockPercent(marketStatus.suggestedExposure)}
              className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600"
            >
              Adjust to {marketStatus.suggestedExposure}%
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Key Market Signals</h3>
          <ul className="space-y-3">
            {marketStatus.reasons.map((reason, idx) => (
              <li key={idx} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function Onboarding({ onComplete }: { onComplete: (percent: number) => void }) {
  const [stockPercent, setStockPercent] = useState(75);
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
            Welcome to BULL/BEAR
          </h1>
          <p className="text-gray-600">Your intelligent market risk monitor</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              How much of your portfolio is in stocks/ETFs?
            </label>
            <div className="relative py-6">
              <input
                type="range"
                min="0"
                max="100"
                value={stockPercent}
                onChange={(e) => setStockPercent(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-4">
                <span className="text-xs text-gray-500">0%</span>
                <div className="text-center">
                  <div className="font-bold text-4xl bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                    {stockPercent}%
                  </div>
                </div>
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onComplete(stockPercent)}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all"
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userStockPercent, setUserStockPercent] = useState(75);
  const location = useLocation();

  useEffect(() => {
    const onboarded = localStorage.getItem('onboardingComplete');
    const savedPercent = localStorage.getItem('userStockPercent');
    if (onboarded === 'true') {
      setIsOnboarded(true);
      if (savedPercent) setUserStockPercent(Number(savedPercent));
    }
  }, []);

  const handleOnboardingComplete = (stockPercent: number) => {
    setUserStockPercent(stockPercent);
    localStorage.setItem('userStockPercent', stockPercent.toString());
    localStorage.setItem('onboardingComplete', 'true');
    setIsOnboarded(true);
  };

  // Show onboarding if not completed (except for backtest page)
  if (!isOnboarded && location.pathname !== '/backtest') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Routes>
      <Route 
        path="/backtest" 
        element={<BacktestPage />} 
      />
      <Route 
        path="/" 
        element={
          <Dashboard 
            userStockPercent={userStockPercent} 
            setUserStockPercent={(percent: number) => {
              setUserStockPercent(percent);
              localStorage.setItem('userStockPercent', percent.toString());
            }}
          />
        } 
      />
      <Route 
        path="*" 
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
              <Link to="/" className="text-blue-600 hover:underline">Go Home</Link>
            </div>
          </div>
        } 
      />
    </Routes>
  );
}

function App() {
  // Add error boundary
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;