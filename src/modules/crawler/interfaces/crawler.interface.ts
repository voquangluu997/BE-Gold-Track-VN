export interface GoldPriceData {
    brand: string;      // SJC, PNJ, DOJI, PhuQuy, BTMC
    city: string;       // Hanoi, HCMC, Danang, World
    buyPrice: number;
    sellPrice: number;
    type: string;       // 9999, 24K, 18K, World
    source: string;     // webgia.com, 24h.com.vn
    rawData?: any;
  }
  
  export interface ExchangeRateData {
    currency: string;   // USD, EUR, JPY, GBP
    buyPrice: number;
    sellPrice: number;
    bank: string;       // Vietcombank, etc.
    source: string;
  }
  
  export interface CrawlJobData {
    jobId: string;
    type: 'all' | 'gold' | 'currency';
    timestamp: Date;
    triggeredBy: 'cron' | 'api' | 'manual';
  }
  
  export interface CrawlResult {
    success: boolean;
    source: string;
    timestamp: Date;
    goldPrices: GoldPriceData[];
    exchangeRates: ExchangeRateData[];
    duration: number;
    error?: string;
    fallbackUsed?: boolean;
  }