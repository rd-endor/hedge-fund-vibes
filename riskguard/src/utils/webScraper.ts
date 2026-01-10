// src/utils/webScraper.ts
// Generic web scraping utility with rate limiting, error handling, and HTML parsing

interface ScrapeOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  userAgent?: string;
}

class WebScraper {
  private lastCall: number = 0;
  private minInterval: number = 2000; // 2 seconds between requests

  /**
   * Wait if needed to respect rate limits
   */
  private async waitIfNeeded() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
  }

  /**
   * Fetch HTML content from a URL with retry logic
   */
  async fetchHTML(url: string, options: ScrapeOptions = {}): Promise<string> {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 10000,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    } = options;

    await this.waitIfNeeded();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return html;
      } catch (error: any) {
        if (attempt === retries) {
          throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Unexpected error in fetchHTML');
  }

  /**
   * Parse HTML and extract text content using DOMParser
   */
  parseHTML(html: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc;
  }

  /**
   * Extract text content from a CSS selector
   */
  extractText(html: string, selector: string): string | null {
    const doc = this.parseHTML(html);
    const element = doc.querySelector(selector);
    return element?.textContent?.trim() || null;
  }

  /**
   * Extract multiple text contents from CSS selectors
   */
  extractTexts(html: string, selector: string): string[] {
    const doc = this.parseHTML(html);
    const elements = doc.querySelectorAll(selector);
    return Array.from(elements).map(el => el.textContent?.trim() || '');
  }

  /**
   * Extract attribute value from a CSS selector
   */
  extractAttribute(html: string, selector: string, attribute: string): string | null {
    const doc = this.parseHTML(html);
    const element = doc.querySelector(selector);
    return element?.getAttribute(attribute) || null;
  }

  /**
   * Extract numeric value from text (removes non-numeric characters except decimal point)
   */
  extractNumber(text: string | null): number | null {
    if (!text) return null;
    const match = text.replace(/[^\d.-]/g, '').match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * Extract table data from HTML
   */
  extractTable(html: string, tableSelector: string = 'table'): string[][] {
    const doc = this.parseHTML(html);
    const table = doc.querySelector(tableSelector);
    if (!table) return [];

    const rows: string[][] = [];
    const trElements = table.querySelectorAll('tr');

    trElements.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(
        cell => cell.textContent?.trim() || ''
      );
      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    return rows;
  }
}

export const webScraper = new WebScraper();

