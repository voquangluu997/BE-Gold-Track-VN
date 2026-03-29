// src/modules/crawler/sources/primary/crawler-giavang.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface GoldPriceData {
  brand: string;
  city: string;
  buyPrice: number;
  sellPrice: number;
  type: string;      // 'gold_bar' (miếng) hoặc 'gold_ring' (nhẫn)
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
export class CrawlerGiavangService {
  private readonly logger = new Logger(CrawlerGiavangService.name);
  private readonly URL = 'https://giavang.org/';

  // Mapping tên thành phố
  private readonly cityMapping: Record<string, string> = {
    'TP. Hồ Chí Minh': 'HCMC',
    'TP.Hồ Chí Minh': 'HCMC',
    'Hồ Chí Minh': 'HCMC',
    'Hà Nội': 'Hanoi',
    'Đà Nẵng': 'Danang',
    'Hạ Long': 'Halong',
    'Hải Phòng': 'Haiphong',
    'Huế': 'Hue',
    'Nha Trang': 'Nhatrang',
    'Biên Hòa': 'BienHoa',
    'Bạc Liêu': 'BacLieu',
    'Cà Mau': 'CaMau',
    'Miền Bắc': 'North',
    'Miền Trung': 'Central',
    'Miền Tây': 'West',
    'Bắc Ninh': 'BacNinh',
    'Hải Dương': 'HaiDuong',
    'Bến Tre': 'BenTre',
    'Tiền Giang': 'TienGiang',
    'Cần Thơ': 'Cantho',
    'Vĩnh Long': 'VinhLong',
    'Long Xuyên': 'LongXuyen',
    'Sa Đéc': 'SaDec',
    'Trà Vinh': 'TraVinh',
    'Tân An': 'TanAn',
  };

  // Mapping thương hiệu
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
    this.logger.log('Crawling all data from giavang.org...');

    try {
      const response = await axios.get(this.URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const html = response.data;

      // Parse giá vàng miếng
      const goldBarPrices = this.parseGoldPrices($, 'gold_bar');
      
      // Parse giá vàng nhẫn (nếu có)
      const goldRingPrices = this.parseGoldPrices($, 'gold_ring');
      
      // Parse giá vàng thế giới
      const worldGoldPrices = this.parseWorldGoldPrice(html);
      
      // Parse tỷ giá (nếu có)
      const exchangeRates = this.parseExchangeRates($);

      const allGoldPrices = [...goldBarPrices, ...goldRingPrices];

      this.logger.log(
        `Giavang: ${goldBarPrices.length} bars, ${goldRingPrices.length} rings, ` +
        `${worldGoldPrices.length} world, ${exchangeRates.length} rates`
      );

      return { goldPrices: allGoldPrices, worldGoldPrices, exchangeRates };
    } catch (error) {
      this.logger.error(`Giavang crawl failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse bảng giá vàng
   */
  private parseGoldPrices($: cheerio.CheerioAPI, type: 'gold_bar' | 'gold_ring'): GoldPriceData[] {
    const prices: GoldPriceData[] = [];

    // Tìm bảng phù hợp (có header "Khu vực", "Hệ thống", "Mua vào", "Bán ra")
    const targetTable = $('table').filter((_, table) => {
      const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
      return headers.includes('Khu vực') && headers.includes('Hệ thống') && 
             headers.includes('Mua vào') && headers.includes('Bán ra');
    }).first();

    if (!targetTable.length) {
      this.logger.warn(`No gold price table found for ${type}`);
      return prices;
    }

    let currentCity = '';
    let remainingRows = 0;

    const rows = targetTable.find('tbody tr');

    for (let i = 0; i < rows.length; i++) {
      const row = rows.eq(i);
      const cells = row.find('td');

      if (cells.length < 4) continue;

      // Kiểm tra ô đầu tiên có phải th (khu vực) không
      const firstCell = cells.eq(0);
      const regionText = firstCell.text().trim();

      if (regionText && !regionText.includes('web') && !regionText.includes('http')) {
        // Bắt đầu khu vực mới
        currentCity = this.cityMapping[regionText] || regionText;
        // remainingRows = this.getRowspan(row, firstCell);
        
        // Xử lý dòng đầu tiên
        const brandText = $(cells[1]).text().trim();
        const buyText = $(cells[2]).text().trim();
        const sellText = $(cells[3]).text().trim();

        const brand = this.extractBrand(brandText);
        const buyPrice = this.parsePrice(buyText);
        const sellPrice = this.parsePrice(sellText);

        if (brand && buyPrice > 0 && sellPrice > 0 && currentCity) {
          prices.push({
            brand,
            city: currentCity,
            buyPrice,
            sellPrice,
            type,
            source: 'giavang.org',
          });
        }
        remainingRows--;
      } else if (remainingRows > 0 && currentCity) {
        // Các dòng tiếp theo của cùng khu vực
        const brandText = $(cells[0]).text().trim();
        const buyText = $(cells[1]).text().trim();
        const sellText = $(cells[2]).text().trim();

        const brand = this.extractBrand(brandText);
        const buyPrice = this.parsePrice(buyText);
        const sellPrice = this.parsePrice(sellText);

        if (brand && buyPrice > 0 && sellPrice > 0) {
          prices.push({
            brand,
            city: currentCity,
            buyPrice,
            sellPrice,
            type,
            source: 'giavang.org',
          });
        }
        remainingRows--;
      }
    }

    return prices;
  }

  /**
   * Lấy giá trị rowspan từ thẻ
   */
//   private getRowspan(row: cheerio.Cheerio, cell: cheerio.Cheerio): number {
//     const rowspanAttr = cell.attr('rowspan');
//     return rowspanAttr ? parseInt(rowspanAttr, 10) : 1;
//   }

  /**
   * Parse giá vàng thế giới
   */
  private parseWorldGoldPrice(html: string): GoldPriceData[] {
    const prices: GoldPriceData[] = [];
    
    // Tìm giá vàng thế giới trong nội dung
    const patterns = [
      /Giá vàng thế giới[:：]\s*([\d,]+(?:\.\d+)?)\s*USD/i,
      /Gold price[:：]\s*([\d,]+(?:\.\d+)?)\s*USD/i,
      /([\d,]+(?:\.\d+)?)\s*USD\/ounce/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const price = this.parsePrice(match[1]);
        if (price > 0) {
          prices.push({
            brand: 'World Gold',
            city: 'World',
            buyPrice: price,
            sellPrice: price,
            type: 'World',
            source: 'giavang.org',
          });
          break;
        }
      }
    }

    return prices;
  }

  /**
   * Parse tỷ giá ngoại tệ
   */
  private parseExchangeRates($: cheerio.CheerioAPI): ExchangeRateData[] {
    const rates: ExchangeRateData[] = [];

    // Tìm bảng tỷ giá
    $('table').each((_, table) => {
      const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
      if (headers.some(h => h.includes('USD') || h.includes('Ngoại tệ'))) {
        $(table).find('tbody tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            const currencyText = $(cells[0]).text().trim();
            const buyText = $(cells[1]).text().trim();
            const sellText = $(cells[2]).text().trim();

            const currency = this.extractCurrency(currencyText);
            const buyPrice = this.parsePrice(buyText);
            const sellPrice = this.parsePrice(sellText);

            if (currency && buyPrice > 0 && sellPrice > 0) {
              rates.push({
                currency,
                buyPrice,
                sellPrice,
                bank: 'Vietcombank',
                source: 'giavang.org',
              });
            }
          }
        });
      }
    });

    return rates;
  }

  private extractBrand(text: string): string {
    for (const [key, value] of Object.entries(this.brandMapping)) {
      if (text.includes(key)) return value;
    }
    return '';
  }

  private extractCurrency(text: string): string {
    const match = text.match(/^([A-Z]{3})/);
    if (match) return match[1];
    if (text.includes('USD')) return 'USD';
    if (text.includes('EUR')) return 'EUR';
    if (text.includes('GBP')) return 'GBP';
    if (text.includes('JPY')) return 'JPY';
    return '';
  }

  private parsePrice(priceText: string): number {
    // Loại bỏ dấu chấm (phân cách nghìn)
    let cleaned = priceText.replace(/\./g, '');
    // Thay dấu phẩy (thập phân) bằng dấu chấm
    cleaned = cleaned.replace(/,/g, '.');
    const num = parseFloat(cleaned);
    
    // Giavang.org có thể hiển thị giá theo đơn vị 1000đ/lượng (số nhỏ hơn)
    // Ví dụ: 169.800 (thực tế là 169.800.000)
    if (num > 0 && num < 1000000) {
      return num * 1000;
    }
    return isNaN(num) ? 0 : num;
  }
}