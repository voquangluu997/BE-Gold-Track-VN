"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs = __importStar(require("fs"));
function parsePrice(priceText) {
    if (!priceText)
        return 0;
    let cleaned = priceText.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}
function extractGoldBrand(text) {
    const brandMapping = {
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
        if (text.includes(key))
            return value;
    }
    return '';
}
function extractCurrencyCode(text) {
    const match = text.match(/^([A-Z]{3})/);
    if (match)
        return match[1];
    const known = {
        USD: 'USD', EUR: 'EUR', JPY: 'JPY', KRW: 'KRW', SGD: 'SGD',
        AUD: 'AUD', CAD: 'CAD', CHF: 'CHF', CNY: 'CNY', GBP: 'GBP',
        HKD: 'HKD', THB: 'THB',
    };
    for (const [key, val] of Object.entries(known)) {
        if (text.includes(key))
            return val;
    }
    return '';
}
function getCityFromBrand(brandText) {
    if (brandText.includes('SG') || brandText.includes('TP.HCM'))
        return 'HCMC';
    if (brandText.includes('Hà Nội') || brandText.includes('HN'))
        return 'Hanoi';
    return 'Toanquoc';
}
async function test24h() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              TEST CRAWLER 24H.COM.VN (2 TRANG)               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const goldUrl = 'https://www.24h.com.vn/gia-vang-hom-nay-c425.html';
    const currencyUrl = 'https://www.24h.com.vn/ty-gia-ngoai-te-ttcb-c426.html';
    console.log('📍 BƯỚC 1: CRAWL GIÁ VÀNG');
    console.log(`   URL: ${goldUrl}\n`);
    let goldPrices = [];
    let worldGoldPrice = null;
    try {
        const startGold = Date.now();
        const goldRes = await axios_1.default.get(goldUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000,
        });
        console.log(`✅ Tải thành công (${Date.now() - startGold}ms), dung lượng: ${goldRes.data.length} ký tự`);
        fs.writeFileSync('crawlerDebug/24h-gold-debug.html', goldRes.data);
        const $ = cheerio.load(goldRes.data);
        const rows = $('table tbody tr');
        console.log(`   Tìm thấy ${rows.length} dòng dữ liệu.\n`);
        rows.each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length < 3)
                return;
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
    }
    catch (err) {
        console.error('❌ Lỗi crawl giá vàng:', err.message);
    }
    console.log('\n📍 BƯỚC 2: CRAWL TỶ GIÁ NGOẠI TỆ');
    console.log(`   URL: ${currencyUrl}\n`);
    let exchangeRates = [];
    try {
        const startCurr = Date.now();
        const currRes = await axios_1.default.get(currencyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000,
        });
        console.log(`✅ Tải thành công (${Date.now() - startCurr}ms), dung lượng: ${currRes.data.length} ký tự`);
        fs.writeFileSync('crawlerDebug/24h-currency-debug.html', currRes.data);
        const $ = cheerio.load(currRes.data);
        const rateTable = $('table.gia-vang-search-data-table').first();
        if (rateTable.length) {
            const rows = rateTable.find('tbody tr');
            console.log(`   Tìm thấy ${rows.length} dòng tỷ giá.\n`);
            rows.each((_, row) => {
                const cells = $(row).find('td');
                if (cells.length < 3)
                    return;
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
        }
        else {
            console.log('   ⚠️ Không tìm thấy bảng tỷ giá với cấu trúc mong đợi.');
        }
        console.log(`\n📊 Tổng tỷ giá: ${exchangeRates.length} bản ghi\n`);
    }
    catch (err) {
        console.error('❌ Lỗi crawl tỷ giá:', err.message);
    }
    console.log('═'.repeat(60));
    console.log('📊 TỔNG KẾT KẾT QUẢ');
    console.log('═'.repeat(60));
    console.log(`🏪 Giá vàng trong nước: ${goldPrices.length} bản ghi`);
    console.log(`🌍 Giá vàng thế giới: ${worldGoldPrice ? 1 : 0} bản ghi`);
    console.log(`💱 Tỷ giá ngoại tệ: ${exchangeRates.length} bản ghi`);
    console.log(`📦 Tổng cộng: ${goldPrices.length + (worldGoldPrice ? 1 : 0) + exchangeRates.length} bản ghi\n`);
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
test24h().catch(console.error);
//# sourceMappingURL=test-24h.js.map