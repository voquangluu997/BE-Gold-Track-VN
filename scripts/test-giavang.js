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
    if (num > 0 && num < 1000000) {
        return num * 1000;
    }
    return isNaN(num) ? 0 : num;
}
function extractBrand(text) {
    const brandMapping = {
        'SJC': 'SJC',
        'PNJ': 'PNJ',
        'DOJI': 'DOJI',
        'Phú Quý': 'PhuQuy',
        'Bảo Tín Minh Châu': 'BTMC',
        'Mi Hồng': 'MiHong',
        'Ngọc Thẩm': 'NgocTham',
        'Bảo Tín Mạnh Hải': 'BTMH',
    };
    for (const [key, value] of Object.entries(brandMapping)) {
        if (text.includes(key))
            return value;
    }
    return '';
}
function mapCity(cityName) {
    const cityMapping = {
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
        'Miền Bắc': 'North',
        'Miền Trung': 'Central',
        'Miền Tây': 'West',
    };
    return cityMapping[cityName] || cityName;
}
function isAdRow(text) {
    const adKeywords = ['adsbygoogle', 'webgia', 'xem tại', 'web giá', 'webgiá'];
    return adKeywords.some(keyword => text.toLowerCase().includes(keyword));
}
async function testGiavang() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                 TEST CRAWLER GIAVANG.ORG                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const url = 'https://giavang.org/';
    console.log('📍 Bước 1: Gửi request đến giavang.org...');
    console.log(`   URL: ${url}\n`);
    try {
        const startTime = Date.now();
        const response = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            timeout: 15000,
        });
        const duration = Date.now() - startTime;
        console.log(`✅ Request thành công (${duration}ms)`);
        console.log(`   Status: ${response.status}`);
        console.log(`   HTML length: ${response.data.length} characters\n`);
        fs.writeFileSync('giavang-debug.html', response.data);
        console.log('💾 Đã lưu HTML vào file giavang-debug.html\n');
        console.log('📍 Bước 2: Load HTML vào Cheerio...');
        const $ = cheerio.load(response.data);
        console.log('✅ Đã load thành công\n');
        const tables = $('table');
        console.log(`📍 Bước 3: Phân tích cấu trúc trang...`);
        console.log(`   Tìm thấy ${tables.length} bảng HTML\n`);
        tables.each((i, table) => {
            const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
            const rows = $(table).find('tbody tr').length;
            console.log(`   Bảng ${i}: ${headers.length} headers, ${rows} rows`);
            if (headers.length > 0 && headers[0].length < 100) {
                console.log(`     Header: ${headers.slice(0, 5).join(' | ')}`);
            }
        });
        console.log('\n' + '═'.repeat(60));
        console.log('📈 BẮT ĐẦU PARSE DỮ LIỆU');
        console.log('═'.repeat(60) + '\n');
        console.log('🏪 PHẦN 1: GIÁ VÀNG MIẾNG (Gold Bar)');
        console.log('─'.repeat(50));
        const goldBarPrices = [];
        const targetTable = $('table').filter((_, table) => {
            const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
            return headers.includes('Khu vực') && headers.includes('Hệ thống') &&
                headers.includes('Mua vào') && headers.includes('Bán ra');
        }).first();
        if (targetTable.length) {
            console.log('   ✅ Tìm thấy bảng giá vàng miếng\n');
            let currentCity = '';
            let remainingRows = 0;
            const rows = targetTable.find('tbody tr');
            for (let i = 0; i < rows.length; i++) {
                const row = rows.eq(i);
                const cells = row.find('td');
                if (cells.length < 4)
                    continue;
                const firstCell = cells.eq(0);
                const regionText = firstCell.text().trim();
                if (regionText && !isAdRow(regionText)) {
                    currentCity = mapCity(regionText);
                    console.log(`\n   📍 Khu vực: ${regionText} → ${currentCity} (rowspan=${remainingRows})`);
                    const brandText = $(cells[1]).text().trim();
                    const buyText = $(cells[2]).text().trim();
                    const sellText = $(cells[3]).text().trim();
                    const brand = extractBrand(brandText);
                    const buyPrice = parsePrice(buyText);
                    const sellPrice = parsePrice(sellText);
                    if (brand && buyPrice > 0 && sellPrice > 0 && !isAdRow(brandText)) {
                        goldBarPrices.push({
                            brand,
                            city: currentCity,
                            buyPrice,
                            sellPrice,
                            type: 'gold_bar',
                            source: 'giavang.org',
                        });
                        console.log(`      ✅ ${brand}: Mua ${buyPrice.toLocaleString()} | Bán ${sellPrice.toLocaleString()}`);
                    }
                    remainingRows--;
                }
                else if (remainingRows > 0 && currentCity) {
                    const brandText = $(cells[0]).text().trim();
                    const buyText = $(cells[1]).text().trim();
                    const sellText = $(cells[2]).text().trim();
                    const brand = extractBrand(brandText);
                    const buyPrice = parsePrice(buyText);
                    const sellPrice = parsePrice(sellText);
                    if (brand && buyPrice > 0 && sellPrice > 0 && !isAdRow(brandText)) {
                        goldBarPrices.push({
                            brand,
                            city: currentCity,
                            buyPrice,
                            sellPrice,
                            type: 'gold_bar',
                            source: 'giavang.org',
                        });
                        console.log(`      ✅ ${brand}: Mua ${buyPrice.toLocaleString()} | Bán ${sellPrice.toLocaleString()}`);
                    }
                    remainingRows--;
                }
            }
        }
        else {
            console.log('   ⚠️ Không tìm thấy bảng giá vàng miếng\n');
        }
        console.log(`\n📊 Tổng cộng: ${goldBarPrices.length} giá vàng miếng\n`);
        console.log('💍 PHẦN 2: GIÁ VÀNG NHẪN (Gold Ring)');
        console.log('─'.repeat(50));
        const goldRingPrices = [];
        const ringTable = $('table').filter((_, table) => {
            const text = $(table).text();
            return text.includes('vàng nhẫn') || text.includes('nhẫn trơn');
        }).first();
        if (ringTable.length) {
            console.log('   ✅ Tìm thấy bảng giá vàng nhẫn\n');
            let currentCity = 'Hanoi';
            const rows = ringTable.find('tbody tr');
            for (let i = 0; i < rows.length; i++) {
                const row = rows.eq(i);
                const cells = row.find('td');
                if (cells.length >= 3) {
                    const brandText = $(cells[0]).text().trim();
                    const buyText = $(cells[1]).text().trim();
                    const sellText = $(cells[2]).text().trim();
                    const brand = extractBrand(brandText);
                    const buyPrice = parsePrice(buyText);
                    const sellPrice = parsePrice(sellText);
                    if (brand && buyPrice > 0 && sellPrice > 0 && !isAdRow(brandText)) {
                        goldRingPrices.push({
                            brand,
                            city: currentCity,
                            buyPrice,
                            sellPrice,
                            type: 'gold_ring',
                            source: 'giavang.org',
                        });
                        console.log(`   ✅ ${brand}: Mua ${buyPrice.toLocaleString()} | Bán ${sellPrice.toLocaleString()}`);
                    }
                }
            }
        }
        else {
            console.log('   ⚠️ Không tìm thấy bảng giá vàng nhẫn\n');
        }
        console.log(`\n📊 Tổng cộng: ${goldRingPrices.length} giá vàng nhẫn\n`);
        console.log('🌍 PHẦN 3: GIÁ VÀNG THẾ GIỚI');
        console.log('─'.repeat(50));
        const worldGoldPrices = [];
        const worldGoldMatch = response.data.match(/Giá vàng thế giới[:：]\s*([\d,]+(?:\.\d+)?)\s*USD/i);
        if (worldGoldMatch) {
            const price = parsePrice(worldGoldMatch[1]);
            if (price > 0) {
                worldGoldPrices.push({
                    brand: 'World Gold',
                    city: 'World',
                    buyPrice: price,
                    sellPrice: price,
                    type: 'World',
                    source: 'giavang.org',
                });
                console.log(`   ✅ Giá vàng thế giới: ${price.toLocaleString()} USD/ounce`);
            }
        }
        else {
            console.log('   ⚠️ Không tìm thấy giá vàng thế giới');
        }
        console.log(`\n📊 Tổng cộng: ${worldGoldPrices.length} giá vàng thế giới\n`);
        console.log('💱 PHẦN 4: TỶ GIÁ NGOẠI TỆ');
        console.log('─'.repeat(50));
        const exchangeRates = [];
        $('table').each((_, table) => {
            const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
            if (headers.some(h => h.includes('USD') || h.includes('Ngoại tệ'))) {
                const rows = $(table).find('tbody tr');
                rows.each((_, row) => {
                    const cells = $(row).find('td');
                    if (cells.length >= 3) {
                        const currencyText = $(cells[0]).text().trim();
                        const buyRaw = $(cells[1]).text().trim();
                        const sellRaw = $(cells[2]).text().trim();
                        const currency = currencyText.match(/^([A-Z]{3})/)?.[1] || '';
                        const buyPrice = parsePrice(buyRaw);
                        const sellPrice = parsePrice(sellRaw);
                        if (currency && buyPrice > 0 && sellPrice > 0) {
                            exchangeRates.push({
                                currency,
                                buyPrice,
                                sellPrice,
                                bank: 'Vietcombank',
                                source: 'giavang.org',
                            });
                            console.log(`   ✅ ${currency}: Mua ${buyPrice.toLocaleString()} | Bán ${sellPrice.toLocaleString()}`);
                        }
                    }
                });
            }
        });
        console.log(`\n📊 Tổng cộng: ${exchangeRates.length} tỷ giá\n`);
        console.log('═'.repeat(60));
        console.log('📊 TỔNG KẾT KẾT QUẢ');
        console.log('═'.repeat(60));
        console.log(`🏪 Giá vàng miếng: ${goldBarPrices.length} bản ghi`);
        console.log(`💍 Giá vàng nhẫn: ${goldRingPrices.length} bản ghi`);
        console.log(`🌍 Giá vàng thế giới: ${worldGoldPrices.length} bản ghi`);
        console.log(`💱 Tỷ giá ngoại tệ: ${exchangeRates.length} bản ghi`);
        console.log(`📦 Tổng cộng: ${goldBarPrices.length + goldRingPrices.length + worldGoldPrices.length + exchangeRates.length} bản ghi`);
        console.log(`⏱️  Thời gian xử lý: ${Date.now() - startTime}ms\n`);
        const result = {
            timestamp: new Date().toISOString(),
            source: 'giavang.org',
            goldBarPrices,
            goldRingPrices,
            worldGoldPrices,
            exchangeRates,
            summary: {
                goldBarCount: goldBarPrices.length,
                goldRingCount: goldRingPrices.length,
                worldGoldCount: worldGoldPrices.length,
                exchangeCount: exchangeRates.length,
                total: goldBarPrices.length + goldRingPrices.length + worldGoldPrices.length + exchangeRates.length,
            },
        };
        fs.writeFileSync('giavang-result.json', JSON.stringify(result, null, 2));
        console.log('💾 Đã lưu kết quả vào file giavang-result.json\n');
        return result;
    }
    catch (error) {
        console.error('❌ LỖI:', error.message);
        if (axios_1.default.isAxiosError(error)) {
            console.error('   Status:', error.response?.status);
            console.error('   StatusText:', error.response?.statusText);
        }
        throw error;
    }
}
testGiavang().catch(console.error);
//# sourceMappingURL=test-giavang.js.map