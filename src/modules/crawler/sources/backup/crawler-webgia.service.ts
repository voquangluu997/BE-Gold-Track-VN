// src/modules/crawler/sources/primary/crawler-webgia.service.ts
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
export class CrawlerWebgiaService {
  private readonly logger = new Logger(CrawlerWebgiaService.name);
  private readonly URL = 'https://webgia.com/gia-vang/';

  private readonly cityMapping: Record<string, string> = {
    'TP.Hồ Chí Minh': 'HCMC',
    'Hồ Chí Minh': 'HCMC',
    'Hà Nội': 'Hanoi',
    'Đà Nẵng': 'Danang',
    'Hạ Long': 'Halong',
    'Hải Phòng': 'Haiphong',
    'Huế': 'Hue',
    'Nha Trang': 'Nhatrang',
    'Biên Hòa': 'BienHoa',
    'Miền Bắc': 'North',
    'Miền Trung': 'Central',
    'Miền Tây': 'West',
    'Tây Nguyên': 'CentralHighlands',
    'Đông Nam Bộ': 'Southeast',
    'Bạc Liêu': 'BacLieu',
    'Cà Mau': 'CaMau',
    'Quảng Ngãi': 'QuangNgai',
  };

  private readonly brandMapping: Record<string, string> = {
    'SJC': 'SJC',
    'PNJ': 'PNJ',
    'DOJI': 'DOJI',
    'Phú Quý': 'PhuQuy',
    'Bảo Tín Minh Châu': 'BTMC',
    'Mi Hồng': 'MiHong',
    'Ngọc Thẩm': 'NgocTham',
    'Bảo Tín Mạnh Hải': 'BTMH',
  };

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(this.URL, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async crawlAll() {
    this.logger.log('Crawling all data from webgia.com...');

    try {
      const response = await axios.get(this.URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const goldPrices = this.parseDomesticGoldPrices($);
      const worldGoldPrices = this.parseWorldGoldPrice($);
      const exchangeRates = this.parseExchangeRates($);

      this.logger.log(
        `Webgia: ${goldPrices.length} domestic, ${worldGoldPrices.length} world, ${exchangeRates.length} rates`
      );

      return { goldPrices, worldGoldPrices, exchangeRates };
    } catch (error) {
      this.logger.error(`Webgia crawl failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse bảng giá - Chỉ lấy các dòng có số thực
   */
  private parseDomesticGoldPrices($: cheerio.CheerioAPI): GoldPriceData[] {
    const prices: GoldPriceData[] = [];

    // Tìm bảng có class "table" và header "Khu vực"
    const targetTable = $('table.table').filter((_, table) => {
      const header = $(table).find('th').first().text().trim();
      return header === 'Khu vực';
    }).first();

    if (!targetTable.length) {
      this.logger.warn('No gold price table found');
      return prices;
    }

    let currentCity = '';
    const rows = targetTable.find('tbody tr');
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows.eq(i);
      const cells = row.find('td');

      // Trường hợp có thẻ th (rowspan)
      const firstCellIsTh = row.find('th').length > 0;
      
      if (firstCellIsTh) {
        // Lấy city từ th (có rowspan)
        const cityTh = row.find('th').first();
        const cityText = cityTh.text().trim();
        if (cityText && !cityText.includes('web')) {
          currentCity = this.cityMapping[cityText] || cityText;
        }
        
        // Lấy các ô td còn lại
        const tdCells = row.find('td');
        if (tdCells.length >= 3) {
          const brand = this.extractBrand($(tdCells[0]).text().trim());
          const buyText = $(tdCells[1]).text().trim();
          const sellText = $(tdCells[2]).text().trim();
          
          const buyPrice = this.parsePrice(buyText);
          const sellPrice = this.parsePrice(sellText);
          
          if (brand && buyPrice > 0 && sellPrice > 0 && currentCity) {
            prices.push({
              brand,
              city: currentCity,
              buyPrice,
              sellPrice,
              type: '9999',
              source: 'webgia.com',
            });
          }
        }
      } else if (cells.length >= 3) {
        // Trường hợp không có th (các dòng tiếp theo của cùng city)
        const brand = this.extractBrand($(cells[0]).text().trim());
        const buyText = $(cells[1]).text().trim();
        const sellText = $(cells[2]).text().trim();
        
        const buyPrice = this.parsePrice(buyText);
        const sellPrice = this.parsePrice(sellText);
        
        if (brand && buyPrice > 0 && sellPrice > 0 && currentCity) {
          prices.push({
            brand,
            city: currentCity,
            buyPrice,
            sellPrice,
            type: '9999',
            source: 'webgia.com',
          });
        }
      }
    }

    this.logger.log(`Parsed ${prices.length} domestic gold prices`);
    return prices;
  }

  /**
   * Parse giá vàng thế giới
   */
  private parseWorldGoldPrice($: cheerio.CheerioAPI): GoldPriceData[] {
    const prices: GoldPriceData[] = [];

    // Tìm bảng chứa giá vàng thế giới
    const worldTable = $('table').filter((_, table) => {
      const header = $(table).find('th').first().text().trim();
      return header.includes('Giá vàng thế giới');
    }).first();

    if (worldTable.length) {
      const priceText = worldTable.find('td').first().text().trim();
      const price = this.parsePrice(priceText);
      if (price > 0) {
        prices.push({
          brand: 'World Gold',
          city: 'World',
          buyPrice: price,
          sellPrice: price,
          type: 'World',
          source: 'webgia.com',
        });
      }
    }

    return prices;
  }

  /**
   * Parse tỷ giá Vietcombank
   */
  private parseExchangeRates($: cheerio.CheerioAPI): ExchangeRateData[] {
    const rates: ExchangeRateData[] = [];

    const rateTable = $('table').filter((_, table) => {
      const header = $(table).find('th').first().text().trim();
      return header.includes('Tỷ giá Vietcombank');
    }).first();

    if (!rateTable.length) {
      return rates;
    }

    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'KRW'];
    const rows = rateTable.find('tbody tr');

    for (let i = 0; i < rows.length && i < currencies.length; i++) {
      const row = rows.eq(i);
      const cells = row.find('td');
      if (cells.length >= 2) {
        const buyText = $(cells[0]).text().trim();
        const sellText = $(cells[1]).text().trim();

        const buyPrice = this.parsePrice(buyText);
        const sellPrice = this.parsePrice(sellText);

        if (buyPrice > 0 && sellPrice > 0) {
          rates.push({
            currency: currencies[i],
            buyPrice,
            sellPrice,
            bank: 'Vietcombank',
            source: 'webgia.com',
          });
        }
      }
    }

    return rates;
  }

  /**
   * Trích xuất thương hiệu từ text
   */
  private extractBrand(text: string): string {
    for (const [key, value] of Object.entries(this.brandMapping)) {
      if (text.includes(key)) return value;
    }
    return '';
  }

  /**
   * Parse số từ text, chỉ trả về số nếu text là số hợp lệ
   */
  private parsePrice(priceText: string): number {
    const cleaned = priceText.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    
    // Chỉ trả về số nếu là số hợp lệ và không phải text quảng cáo
    if (isNaN(num) || num === 0) {
      return 0;
    }
    
    // Kiểm tra nếu text chứa từ khóa quảng cáo
    const adKeywords = ['web', 'xem tại', 'giá', 'webgia'];
    if (adKeywords.some(keyword => priceText.toLowerCase().includes(keyword))) {
      return 0;
    }
    
    return num;
  }
}