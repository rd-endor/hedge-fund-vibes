// src/utils/apiConfig.ts

export const API_KEYS = {
  fred: 'b7948b3d3332a2cb63951120723cf014',           // Replace with your FRED key
  alphaVantage: 'Z6S8G9AZSQQVAA4P'  // Replace with your Alpha Vantage key
};

// Rate limiting helper
export class APIRateLimiter {
  private lastCall: number = 0;
  private minInterval: number = 13000; // 13 seconds (Alpha Vantage free tier: 5 calls/min)

  async waitIfNeeded() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
  }
}

export const rateLimiter = new APIRateLimiter();

// Cache helper
export class DataCache {
  set(key: string, data: any, expiryHours: number = 24) {
    const item = {
      data,
      expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  get(key: string): any | null {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item);
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  }
}

export const cache = new DataCache();