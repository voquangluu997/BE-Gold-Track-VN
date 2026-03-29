// src/modules/crawler/sources/primary/crawler-24h.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface GoldPriceData {
  brand: string;
  city: string;
  buyPrice: number;
  sellPrice: number;
  type: string;
  source: string;
}

export interface ExchangeRateData {
  currency: string;
  buyPrice: number;
  sellPrice: number;
  bank: string;
  source: string;
}

@Injectable()
export class Crawler24hService {
  private readonly logger = new Logger(Crawler24hService.name);
  
  private readonly GOLD_URL = 'https://www.24h.com.vn/gia-vang-hom-nay-c425.html';
  private readonly CURRENCY_URL = 'https://www.24h.com.vn/ty-gia-ngoai-te-ttcb-c426.html';

  private readonly brandMapping: Record<string, string> = {
    'SJC': 'SJC',
    'DOJI HN': 'DOJI HN',
    'DOJI SG': 'DOJI SG',
    'BTMH': 'BTMH',
    'BTMC SJC': 'BTMC SJC',
    'Phú Qúy SJC': 'PHU QUY SJC',
    'PNJ TP.HCM': 'PNJ TP.HCM',
    'PNJ Hà Nội': 'PNJ HA NOI',
  };

  private readonly currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'KRW', 
    'SGD', 'AUD', 'CAD', 'CHF', 'CNY', 
    'HKD', 'THB'
  ];

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(this.GOLD_URL, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async crawlAll(): Promise<{ goldPrices: GoldPriceData[]; exchangeRates: ExchangeRateData[] }> {
    this.logger.log('Crawling all data from 24h.com.vn (primary)...');

    const [goldResult, currencyResult] = await Promise.allSettled([
      this.crawlGold(),
      this.crawlCurrency(),
    ]);

    let goldPrices: GoldPriceData[] = [];
    let exchangeRates: ExchangeRateData[] = [];

    if (goldResult.status === 'fulfilled') {
      goldPrices = goldResult.value;
      this.logger.log(`24h gold: ${goldPrices.length} domestic prices`);
    } else {
      this.logger.error(`24h gold crawl failed: ${goldResult.reason.message}`);
    }

    if (currencyResult.status === 'fulfilled') {
      exchangeRates = currencyResult.value;
      this.logger.log(`24h currency: ${exchangeRates.length} rates`);
    } else {
      this.logger.error(`24h currency crawl failed: ${currencyResult.reason.message}`);
    }

    return { goldPrices, exchangeRates };
  }

  async crawlGold(): Promise<GoldPriceData[]> {
    const goldPrices: GoldPriceData[] = [];

    try {
      const response = await axios.get(this.GOLD_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const rows = $('table tbody tr');
      
      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        const brandRaw = $(cells[0]).text().trim();
        const buyRaw = $(cells[1]).text().trim();
        const sellRaw = $(cells[2]).text().trim();

        if (this.isAdContent(brandRaw)) return;

        const brand = this.extractGoldBrand(brandRaw);
        const buyPrice = this.parsePrice(buyRaw);
        const sellPrice = this.parsePrice(sellRaw);

        if (brand && buyPrice > 0 && sellPrice > 0) {
          const city = this.getCityFromBrand(brandRaw);
          goldPrices.push({
            brand,
            city,
            buyPrice,
            sellPrice,
            type: '9999',
            source: '24h.com.vn',
          });
        }
      });

      return goldPrices;
    } catch (error) {
      this.logger.error(`24h gold crawl failed: ${error.message}`);
      throw error;
    }
  }

  async crawlCurrency(): Promise<ExchangeRateData[]> {
    const rates: ExchangeRateData[] = [];

    try {
      const response = await axios.get(this.CURRENCY_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      const rateTable = $('table.gia-vang-search-data-table').first();

      if (!rateTable.length) return rates;

      const rows = rateTable.find('tbody tr');

      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        const currencyRaw = $(cells[0]).text().trim();
        const buyRaw = $(cells[1]).text().trim();
        const sellRaw = $(cells[2]).text().trim();

        const currency = this.extractCurrencyCode(currencyRaw);
        if (!currency || !this.currencies.includes(currency)) return;

        const buyPrice = this.parsePrice(buyRaw);
        const sellPrice = this.parsePrice(sellRaw);

        if (buyPrice > 0 && sellPrice > 0) {
          rates.push({
            currency,
            buyPrice,
            sellPrice,
            bank: 'Vietcombank',
            source: '24h.com.vn',
          });
        }
      });

      return rates;
    } catch (error) {
      this.logger.error(`24h currency crawl failed: ${error.message}`);
      throw error;
    }
  }

  private isAdContent(text: string): boolean {
    const adKeywords = ['adsbygoogle', 'webgia', 'xem tại', 'web giá', 'webgiá', 'webgia.com'];
    return adKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private extractGoldBrand(text: string): string {
    for (const [key, value] of Object.entries(this.brandMapping)) {
      if (text.toLowerCase() === key.toLowerCase()) return value;
    }
    return '';
  }

  private getCityFromBrand(brandText: string): string {
    if (brandText.includes('SG') || brandText.includes('TP.HCM')) return 'HCMC';
    if (brandText.includes('Hà Nội')|| brandText.includes('HN')) return 'HANOI';
    return 'Other';
  }

  private extractCurrencyCode(text: string): string {
    const match = text.match(/^([A-Z]{3})/);
    if (match) return match[1];
    return '';
  }

  private parsePrice(priceText: string): number {
    if (!priceText) return 0;
    let cleaned = priceText.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
}