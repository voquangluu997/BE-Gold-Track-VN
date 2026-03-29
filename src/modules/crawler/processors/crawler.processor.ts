// src/modules/crawler/processors/crawler.processor.ts
import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Crawler24hService, GoldPriceData, ExchangeRateData } from '../sources/primary/crawler-24h.service';
import { CrawlerGiavangService } from '../sources/backup/crawler-giavang.service';
import { StringUtil } from 'src/common/utils/string.util';

export interface CrawlJobData {
  jobId: string;
  type: 'all' | 'gold' | 'currency';
  timestamp: Date;
  triggeredBy: 'cron' | 'api';
}

export interface CrawlResult {
  success: boolean;
  source: string;
  timestamp: Date;
  goldPrices: GoldPriceData[];
  exchangeRates: ExchangeRateData[];
  duration: number;
  fallbackUsed: boolean;
  stats: {
    goldCreated: number;
    goldUpdated: number;
  };
}

@Processor('crawler')
export class CrawlerProcessor {
  private readonly logger = new Logger(CrawlerProcessor.name);
  private primaryAvailable = true;

  constructor(
    private prisma: PrismaService,
    private crawler24h: Crawler24hService,
    private crawlerGiavang: CrawlerGiavangService,
  ) {}

  @Process('crawl-all')
  async handleCrawlAll(job: Job<CrawlJobData>): Promise<CrawlResult> {
    const startTime = Date.now();
    this.logger.log(`Processing job ${job.id}`);

    await job.progress(10);
    await this.checkPrimaryAvailability();

    let goldPrices: GoldPriceData[] = [];
    let exchangeRates: ExchangeRateData[] = [];
    let usedSource = '';
    let fallbackUsed = false;
    const stats = {
      goldCreated: 0,
      goldUpdated: 0,
      currencyCreated: 0,
      currencyUpdated: 0,
    };

    try {
      await job.progress(20);

      if (this.primaryAvailable) {
        usedSource = '24h.com.vn';
        const data = await this.crawler24h.crawlAll();
        goldPrices = data.goldPrices;
        exchangeRates = data.exchangeRates;
      } else {
        usedSource = 'giavang.org (fallback)';
        fallbackUsed = true;
        const data = await this.crawlerGiavang.crawlAll();
        goldPrices = data.goldPrices;
        exchangeRates = data.exchangeRates;
      }

      await job.progress(50);

      // Lưu giá vàng
      for (const price of goldPrices) {
        const result = await this.upsertGoldPrice(price);
        if (result === 'created') stats.goldCreated++;
        else if (result === 'updated') stats.goldUpdated++;
      }

      // Lưu tỷ giá
      for (const rate of exchangeRates) {
        const result = await this.upsertExchangeRate(rate);
        if (result === 'created') stats.currencyCreated++;
        else if (result === 'updated') stats.currencyUpdated++;
      }

      await job.progress(100);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Job ${job.id} completed: ${stats.goldCreated} created, ${stats.goldUpdated} updated`
      );

      return {
        success: true,
        source: usedSource,
        timestamp: new Date(),
        goldPrices,
        exchangeRates,
        duration,
        fallbackUsed,
        stats,
      };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upsert giá vàng: 
   * - Nếu đã có record của brand+city+type trong ngày hôm nay → UPDATE
   * - Nếu chưa có record trong ngày hôm nay → CREATE mới
   */
  private async upsertGoldPrice(price: GoldPriceData): Promise<'created' | 'updated'> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const normalizedBrand = StringUtil.toUpper(price.brand);
      const normalizedCity = StringUtil.toUpper(price.city);
      const normalizedType = StringUtil.toUpper(price.type);

      // Kiểm tra xem đã có record của brand+city+type trong ngày hôm nay chưa
      const existing = await this.prisma.goldPrice.findFirst({
        where: {
          brand: normalizedBrand,
          city: normalizedCity,
          type: normalizedType,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existing) {
        // Đã có record trong ngày → CẬP NHẬT giá mới
        await this.prisma.goldPrice.update({
          where: { id: existing.id },
          data: {
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            source: price.source,
            updatedAt: new Date(),
          },
        });
        this.logger.debug(`Updated gold: ${price.brand} | ${price.city} | ${price.type}`);
        return 'updated';
      } else {
        // Chưa có record trong ngày → TẠO MỚI
        await this.prisma.goldPrice.create({
          data: {
            brand: normalizedBrand,
            city: normalizedCity,
            buyPrice: price.buyPrice,
            sellPrice: price.sellPrice,
            type: normalizedType,
            source: price.source,
          },
        });
        this.logger.debug(`Created gold: ${price.brand} | ${price.city} | ${price.type}`);
        return 'created';
      }
    } catch (error) {
      this.logger.error(`Failed to upsert gold price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upsert tỷ giá
   */
  private async upsertExchangeRate(rate: ExchangeRateData): Promise<'created' | 'updated'> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const normalizedCurrency = StringUtil.toUpper(rate.currency);
      const normalizedBank = StringUtil.toUpper(rate.bank);
      const existing = await this.prisma.exchangeRate.findFirst({
        where: {
          currency: normalizedCurrency,
          bank: normalizedBank,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existing) {
        await this.prisma.exchangeRate.update({
          where: { id: existing.id },
          data: {
            buyPrice: rate.buyPrice,
            sellPrice: rate.sellPrice,
            source: rate.source,
            updatedAt: new Date(),
          },
        });
        return 'updated';
      } else {
        await this.prisma.exchangeRate.create({
          data: {
            currency: normalizedCurrency,
            buyPrice: rate.buyPrice,
            sellPrice: rate.sellPrice,
            bank: normalizedBank,
            source: rate.source,
          },
        });
        return 'created';
      }
    } catch (error) {
      this.logger.error(`Failed to upsert exchange rate: ${error.message}`);
      throw error;
    }
  }

  private async checkPrimaryAvailability() {
    this.primaryAvailable = await this.crawler24h.isAvailable();
    this.logger.log(`Primary source (24h.com.vn) available: ${this.primaryAvailable}`);
  }
}