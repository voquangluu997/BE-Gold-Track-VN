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
function parseVietnameseNumber(text) {
    let cleaned = text.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    const num = parseFloat(cleaned);
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
        'Ngọc Thắm': 'NgocTham',
    };
    for (const [key, value] of Object.entries(brandMapping)) {
        if (text.includes(key))
            return value;
    }
    return '';
}
function mapCity(cityName) {
    const cityMapping = {
        'TP.Hồ Chí Minh': 'HCMC',
        'Hồ Chí Minh': 'HCMC',
        'TP HCM': 'HCMC',
        'Sài Gòn': 'HCMC',
        'Hà Nội': 'Hanoi',
        'Đà Nẵng': 'Danang',
        'Hạ Long': 'Halong',
        'Hải Phòng': 'Haiphong',
        'Huế': 'Hue',
        'Nha Trang': 'Nhatrang',
        'Cần Thơ': 'Cantho',
        'Miền Bắc': 'North',
        'Miền Trung': 'Central',
        'Miền Tây': 'West',
        'Tây Nguyên': 'CentralHighlands',
        'Đông Nam Bộ': 'Southeast',
        'Biên Hòa': 'BienHoa',
        'Quảng Ngãi': 'QuangNgai',
    };
    return cityMapping[cityName] || cityName;
}
function parseDomesticGoldPrices($) {
    const prices = [];
    const targetTable = $('table').filter((_, table) => {
        const headerText = $(table).find('th').first().text().trim();
        return headerText === 'Khu vực' || headerText.includes('Khu vực');
    }).first();
    if (!targetTable.length) {
        console.log('⚠️ Không tìm thấy bảng giá vàng');
        return prices;
    }
    let currentCity = '';
    const rows = targetTable.find('tbody tr');
    console.log(`📊 Tìm thấy ${rows.length} dòng trong bảng giá vàng`);
    for (let i = 0; i < rows.length; i++) {
        const row = rows.eq(i);
        const cells = row.find('td');
        const firstCellIsTh = row.find('th').length > 0;
        if (firstCellIsTh) {
            const cityTh = row.find('th').first();
            const cityText = cityTh.text().trim();
            if (cityText) {
                currentCity = mapCity(cityText);
                console.log(currentCity);
            }
        }
        const brandCell = cells.eq(0).find('a').text().trim();
        const buyCell = cells.eq(1).text().trim();
        const sellCell = cells.eq(2).text().trim();
        console.log(brandCell);
        console.log(buyCell);
        console.log(sellCell);
        if (brandCell &&
            !brandCell.toLowerCase().includes('web') &&
            !brandCell.includes('xem tại') &&
            !brandCell.includes('adsbygoogle')) {
            const brand = extractBrand(brandCell);
            if (brand && currentCity) {
                const buyPrice = parseVietnameseNumber(buyCell);
                const sellPrice = parseVietnameseNumber(sellCell);
                if (buyPrice > 0 && sellPrice > 0) {
                    prices.push({
                        brand,
                        city: currentCity,
                        buyPrice,
                        sellPrice,
                        type: '9999',
                        source: 'webgia.com',
                    });
                    console.log(`   ✅ ${brand} | ${currentCity} | Mua: ${buyPrice.toLocaleString()} | Bán: ${sellPrice.toLocaleString()}`);
                }
            }
        }
    }
    return prices;
}
function parseWorldGoldPrice($) {
    const prices = [];
    const worldTable = $('table').filter((_, table) => {
        const header = $(table).find('th a').first().text().trim();
        return header.includes('Giá vàng thế giới');
    }).first();
    if (worldTable.length) {
        const priceText = worldTable.find('td').first().text().trim();
        const price = parseVietnameseNumber(priceText);
        if (price > 0) {
            prices.push({
                brand: 'World Gold',
                city: 'World',
                buyPrice: price,
                sellPrice: price,
                type: 'World',
                source: 'webgia.com',
            });
            console.log(`🌍 Giá vàng thế giới: ${price.toLocaleString()} USD/ounce`);
        }
    }
    return prices;
}
function parseExchangeRates($) {
    const rates = [];
    const rateTable = $('table').filter((_, table) => {
        const header = $(table).find('th').first().text().trim();
        return header.includes('Tỷ giá Vietcombank');
    }).first();
    if (!rateTable.length) {
        console.log('⚠️ Không tìm thấy bảng tỷ giá Vietcombank');
        return rates;
    }
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'KRW'];
    const rows = rateTable.find('tbody tr');
    console.log(`\n💰 Tỷ giá Vietcombank:`);
    for (let i = 0; i < rows.length && i < currencies.length; i++) {
        const row = rows.eq(i);
        const cells = row.find('td');
        if (cells.length >= 2) {
            const buyText = $(cells[0]).text().trim();
            const sellText = $(cells[1]).text().trim();
            const buyPrice = parseVietnameseNumber(buyText);
            const sellPrice = parseVietnameseNumber(sellText);
            if (buyPrice > 0 && sellPrice > 0) {
                rates.push({
                    currency: currencies[i],
                    buyPrice,
                    sellPrice,
                    bank: 'Vietcombank',
                    source: 'webgia.com',
                });
                console.log(`   ${currencies[i]}: Mua: ${buyPrice.toLocaleString()} | Bán: ${sellPrice.toLocaleString()}`);
            }
        }
    }
    return rates;
}
async function testWebgia() {
    console.log('🚀 Bắt đầu test webgia.com...\n');
    try {
        const response = await axios_1.default.get('https://webgia.com/gia-vang/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'text/html,application/xhtml+xml',
            },
            timeout: 15000,
        });
        console.log(`✅ Kết nối thành công - Status: ${response.status}`);
        console.log(`📄 HTML length: ${response.data.length} characters\n`);
        fs.writeFileSync('webgia-debug.html', response.data);
        console.log('💾 Đã lưu HTML vào file webgia-debug.html\n');
        const $ = cheerio.load(response.data);
        const tables = $('table');
        console.log(`📊 Tìm thấy ${tables.length} bảng trên trang\n`);
        tables.each((i, table) => {
            const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
            const rows = $(table).find('tbody tr').length;
            console.log(`  Bảng ${i}: ${headers.length} headers, ${rows} rows`);
            if (headers.length > 0 && headers[0].length < 50) {
                console.log(`     Header đầu: ${headers[0].substring(0, 50)}`);
            }
        });
        console.log('\n' + '='.repeat(60));
        console.log('📈 BẮT ĐẦU PARSE DỮ LIỆU');
        console.log('='.repeat(60) + '\n');
        console.log('🏪 GIÁ VÀNG TRONG NƯỚC:');
        console.log('-'.repeat(50));
        const goldPrices = parseDomesticGoldPrices($);
        console.log(`\n✅ Tổng cộng: ${goldPrices} giá vàng trong nước\n`);
        console.log('🌍 GIÁ VÀNG THẾ GIỚI:');
        console.log('-'.repeat(50));
        const worldGoldPrices = parseWorldGoldPrice($);
        console.log(`\n✅ Tổng cộng: ${worldGoldPrices.length} giá vàng thế giới\n`);
        console.log('💱 TỶ GIÁ NGOẠI TỆ:');
        console.log('-'.repeat(50));
        const exchangeRates = parseExchangeRates($);
        console.log(`\n✅ Tổng cộng: ${exchangeRates.length} tỷ giá\n`);
        console.log('='.repeat(60));
        console.log('📊 TỔNG KẾT:');
        console.log('='.repeat(60));
        console.log(`🏪 Giá vàng trong nước: ${goldPrices.length} bản ghi`);
        console.log(`🌍 Giá vàng thế giới: ${worldGoldPrices.length} bản ghi`);
        console.log(`💱 Tỷ giá ngoại tệ: ${exchangeRates.length} bản ghi`);
        console.log(`📦 Tổng cộng: ${goldPrices.length + worldGoldPrices.length + exchangeRates.length} bản ghi`);
        const result = {
            timestamp: new Date().toISOString(),
            goldPrices,
            worldGoldPrices,
            exchangeRates,
        };
        fs.writeFileSync('webgia-result.json', JSON.stringify(result, null, 2));
        console.log('\n💾 Đã lưu kết quả vào file webgia-result.json');
    }
    catch (error) {
        console.error('❌ Lỗi:', error.message);
        if (axios_1.default.isAxiosError(error)) {
            console.error('   Status:', error.response?.status);
            console.error('   StatusText:', error.response?.statusText);
        }
    }
}
testWebgia();
//# sourceMappingURL=test-webgia.js.map