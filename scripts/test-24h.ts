// scripts/test-24h.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

interface GoldPriceData {
  brand: string;
  city: string;
  buyPrice: number;
  sellPrice: number;
  type: string;
  source: string;
}

interface ExchangeRateData {
  currency: string;
  buyPrice: number;
  sellPrice: number;
  bank: string;
  source: string;
}

/**
 * Parse số theo định dạng Việt Nam (loại bỏ dấu chấm, chuyển dấu phẩy)
 */
function parsePrice(priceText: string): number {
  if (!priceText) return 0;
  let cleaned = priceText.replace(/\./g, '');
  cleaned = cleaned.replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Trích xuất thương hiệu vàng từ text
 */
function extractGoldBrand(text: string): string {
  const brandMapping: Record<string, string> = {
    'SJC': 'SJC',
    'PNJ': 'PNJ',
    'DOJI HN': 'DOJI',
    'DOJI SG': 'DOJI',
    'BTMH': 'BTMC',
    'BTMC SJC': 'BTMC',
    'Phú Qúy SJC': 'PhuQuy',
    'PNJ TP.HCM': 'PNJ',
    'PNJ Hà Nội': 'PNJ',
  };
  for (const [key, value] of Object.entries(brandMapping)) {
    if (text.includes(key)) return value;
  }
  return '';
}

/**
 * Trích xuất mã ngoại tệ
 */
function extractCurrencyCode(text: string): string {
  const match = text.match(/^([A-Z]{3})/);
  if (match) return match[1];
  const known: Record<string, string> = {
    USD: 'USD', EUR: 'EUR', JPY: 'JPY', KRW: 'KRW', SGD: 'SGD',
    AUD: 'AUD', CAD: 'CAD', CHF: 'CHF', CNY: 'CNY', GBP: 'GBP',
    HKD: 'HKD', THB: 'THB',
  };
  for (const [key, val] of Object.entries(known)) {
    if (text.includes(key)) return val;
  }
  return '';
}

/**
 * Xác định thành phố từ tên thương hiệu (24h chỉ có Hà Nội và TP.HCM)
 */
function getCityFromBrand(brandText: string): string {
  if (brandText.includes('SG') || brandText.includes('TP.HCM')) return 'HCMC';
  if (brandText.includes('Hà Nội') || brandText.includes('HN')) return 'Hanoi';
  return 'Toanquoc';
}

async function test24h() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              TEST CRAWLER 24H.COM.VN (2 TRANG)               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const goldUrl = 'https://www.24h.com.vn/gia-vang-hom-nay-c425.html';
  const currencyUrl = 'https://www.24h.com.vn/ty-gia-ngoai-te-ttcb-c426.html';

  // ==================== 1. CRAWL GIÁ VÀNG ====================
  console.log('📍 BƯỚC 1: CRAWL GIÁ VÀNG');
  console.log(`   URL: ${goldUrl}\n`);
  
  let goldPrices: GoldPriceData[] = [];
  let worldGoldPrice: GoldPriceData | null = null;
  
  try {
    const startGold = Date.now();
    const goldRes = await axios.get(goldUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    console.log(`✅ Tải thành công (${Date.now() - startGold}ms), dung lượng: ${goldRes.data.length} ký tự`);
    fs.writeFileSync('crawlerDebug/24h-gold-debug.html', goldRes.data);
    
    const $ = cheerio.load(goldRes.data);
    
    // Tìm bảng giá vàng
    const rows = $('table tbody tr');
    console.log(`   Tìm thấy ${rows.length} dòng dữ liệu.\n`);
    
    rows.each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      
      const brandRaw = $(cells[0]).text().trim();
      const buyRaw = $(cells[1]).text().trim();
      const sellRaw = $(cells[2]).text().trim();
      
      const brand = extractGoldBrand(brandRaw);
      const buyPrice = parsePrice(buyRaw);
      const sellPrice = parsePrice(sellRaw);
      
      if (brand && buyPrice > 0 && sellPrice > 0) {
        const city = getCityFromBrand(brandRaw);
        goldPrices.push({
          brand,
          city,
          buyPrice,
          sellPrice,
          type: '9999',
          source: '24h.com.vn',
        });
        console.log(`   ✅ ${brand} | ${city} | Mua: ${buyPrice.toLocaleString()} | Bán: ${sellPrice.toLocaleString()}`);
      }
    });
    
    // Lấy giá vàng thế giới (có thể xuất hiện trong nội dung)
    const worldMatch = goldRes.data.match(/Giá vàng thế giới[:：]\s*([\d,]+(?:\.\d+)?)/i);
    if (worldMatch) {
      const price = parsePrice(worldMatch[1]);
      if (price > 0) {
        worldGoldPrice = {
          brand: 'World Gold',
          city: 'World',
          buyPrice: price,
          sellPrice: price,
          type: 'World',
          source: '24h.com.vn',
        };
        console.log(`\n   🌍 Giá vàng thế giới: ${price.toLocaleString()} USD/ounce`);
      }
    }
    
    console.log(`\n📊 Tổng giá vàng trong nước: ${goldPrices.length} bản ghi\n`);
  } catch (err) {
    console.error('❌ Lỗi crawl giá vàng:', err.message);
  }

  // ==================== 2. CRAWL TỶ GIÁ NGOẠI TỆ ====================
  console.log('\n📍 BƯỚC 2: CRAWL TỶ GIÁ NGOẠI TỆ');
  console.log(`   URL: ${currencyUrl}\n`);
  
  let exchangeRates: ExchangeRateData[] = [];
  
  try {
    const startCurr = Date.now();
    const currRes = await axios.get(currencyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    console.log(`✅ Tải thành công (${Date.now() - startCurr}ms), dung lượng: ${currRes.data.length} ký tự`);
    fs.writeFileSync('crawlerDebug/24h-currency-debug.html', currRes.data);
    
    const $ = cheerio.load(currRes.data);
    
    // Tìm bảng tỷ giá (có thể có header chứa "Ngoại tệ", "Mua vào", "Bán ra")
    const rateTable = $('table.gia-vang-search-data-table').first();
    
    if (rateTable.length) {
      const rows = rateTable.find('tbody tr');
      console.log(`   Tìm thấy ${rows.length} dòng tỷ giá.\n`);
      
      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;
        
        const currencyRaw = $(cells[0]).text().trim();
        const buyRaw = $(cells[1]).text().trim();
        const sellRaw = $(cells[2]).text().trim();
        
        const currency = extractCurrencyCode(currencyRaw);
        const buyPrice = parsePrice(buyRaw);
        const sellPrice = parsePrice(sellRaw);
        
        if (currency && buyPrice > 0 && sellPrice > 0) {
          exchangeRates.push({
            currency,
            buyPrice,
            sellPrice,
            bank: 'Vietcombank',
            source: '24h.com.vn',
          });
          console.log(`   ✅ ${currency}: Mua ${buyPrice.toLocaleString()} | Bán ${sellPrice.toLocaleString()}`);
        }
      });
    } else {
      console.log('   ⚠️ Không tìm thấy bảng tỷ giá với cấu trúc mong đợi.');
    }
    
    console.log(`\n📊 Tổng tỷ giá: ${exchangeRates.length} bản ghi\n`);
  } catch (err) {
    console.error('❌ Lỗi crawl tỷ giá:', err.message);
  }

  // ==================== 3. TỔNG KẾT & LƯU KẾT QUẢ ====================
  console.log('═'.repeat(60));
  console.log('📊 TỔNG KẾT KẾT QUẢ');
  console.log('═'.repeat(60));
  console.log(`🏪 Giá vàng trong nước: ${goldPrices.length} bản ghi`);
  console.log(`🌍 Giá vàng thế giới: ${worldGoldPrice ? 1 : 0} bản ghi`);
  console.log(`💱 Tỷ giá ngoại tệ: ${exchangeRates.length} bản ghi`);
  console.log(`📦 Tổng cộng: ${goldPrices.length + (worldGoldPrice ? 1 : 0) + exchangeRates.length} bản ghi\n`);

  // Lưu kết quả ra JSON
  const result = {
    timestamp: new Date().toISOString(),
    source: '24h.com.vn',
    goldPrices,
    worldGoldPrice: worldGoldPrice || undefined,
    exchangeRates,
    summary: {
      goldCount: goldPrices.length,
      worldGoldCount: worldGoldPrice ? 1 : 0,
      exchangeCount: exchangeRates.length,
      total: goldPrices.length + (worldGoldPrice ? 1 : 0) + exchangeRates.length,
    },
  };
  
  fs.writeFileSync('crawlerDebug/24h-result.json', JSON.stringify(result, null, 2));
  console.log('💾 Đã lưu kết quả vào file 24h-result.json\n');
  
  return result;
}

// Chạy test
test24h().catch(console.error);