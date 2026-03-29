// src/modules/crawler/crawler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { Crawler24hService } from './sources/primary/crawler-24h.service';
import { PaginationHelper, PaginatedResult } from '../../common/utils/pagination.util';
import { GoldPrice, ExchangeRate } from '@prisma/client';
import { GoldQueryDto } from './dto/gold-query.dto';
import { CurrencyQueryDto } from './dto/currency-query.dto';
import { StringUtil } from 'src/common/utils/string.util';
import { GoldLatestQueryDto } from './dto/gold-latest-query.dto';
import { CurrencyLatestQueryDto } from './dto/currency-latest-query.dto';
import { GoldHistoryQueryDto } from './dto/gold-history-query.dto';
import { ChartDataPoint } from './dto/chart-datapoint.dto';

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    @InjectQueue('crawler') private crawlerQueue: Queue,
    private prisma: PrismaService,
    private crawler24h: Crawler24hService,
  ) {}

  async onModuleInit() {
    const available = await this.crawler24h.isAvailable();
    this.logger.log(`Primary source available: ${available}`);
    setTimeout(() => this.triggerCrawl('cron'), 10000);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledCrawl() {
    await this.triggerCrawl('cron');
  }

  async triggerCrawl(triggeredBy: 'cron' | 'api' = 'api') {
    const job = await this.crawlerQueue.add('crawl-all', {
      jobId: `${triggeredBy}_${Date.now()}`,
      type: 'all',
      timestamp: new Date(),
      triggeredBy,
    });
    return { jobId: job.id.toString(), status: 'pending' };
  }

  /**
   * Lấy giá vàng mới nhất (record của ngày hôm nay)
   */
  async getLatestGoldPrices(query: GoldQueryDto): Promise<PaginatedResult<GoldPrice>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      createdAt: { gte: today, lt: tomorrow },
    };
    if (query.brand) {
      where.brand = { contains: StringUtil.toLower(query.brand), mode: 'insensitive' };
    }
    if (query.city) {
      where.city = { contains: StringUtil.toLower(query.city), mode: 'insensitive' };
    }

    return PaginationHelper.paginate(this.prisma.goldPrice, {
      where,
      orderBy: { createdAt: 'desc' },
      limit: query.limit,
      page: query.page,
    });
  }

  /**
   * Lấy tỷ giá mới nhất (record của ngày hôm nay)
   */
  async getLatestExchangeRates(query: CurrencyLatestQueryDto): Promise<PaginatedResult<ExchangeRate>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const where: any = {
      createdAt: { gte: today, lt: tomorrow },
    };
    if (query.currency) {
      where.currency = { contains: StringUtil.toLower(query.currency), mode: 'insensitive' };
    }
    if (query.bank) {
      where.bank = { contains: StringUtil.toLower(query.bank), mode: 'insensitive' };
    }

    return PaginationHelper.paginate(this.prisma.exchangeRate, {
      where,
      orderBy: { createdAt: 'desc' },
      limit: query.limit,
      page: query.page,
    });
  }

  /**
   * Lấy giá vàng với filter linh hoạt (có thể xem nhiều ngày)
   */
  async getGoldPrices(query: GoldQueryDto): Promise<PaginatedResult<GoldPrice>> {
    const where: any = {};
    
    if (query.brand) {
      where.brand = { contains: StringUtil.toLower(query.brand), mode: 'insensitive' };
    }
    if (query.city) {
      where.city = { contains: StringUtil.toLower(query.city), mode: 'insensitive' };
    }
    if (query.type) {
      where.type = { contains: StringUtil.toLower(query.type), mode: 'insensitive' };
    }
    
    // Filter theo khoảng ngày
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) {
        const startDate = new Date(query.fromDate);
        startDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = startDate;
      }
      if (query.toDate) {
        const endDate = new Date(query.toDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    return PaginationHelper.paginate(this.prisma.goldPrice, {
      where,
      orderBy: { createdAt: 'desc' },
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Lấy tỷ giá với filter linh hoạt
   */
  async getExchangeRates(query: CurrencyQueryDto): Promise<PaginatedResult<ExchangeRate>> {
    const where: any = {};
    
    if (query.currency) {
      where.currency = { contains: StringUtil.toUpper(query.currency), mode: 'insensitive' };
    }
    if (query.bank) {
      where.bank = { contains: StringUtil.toUpper(query.bank), mode: 'insensitive' };
    }
    
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) {
        const startDate = new Date(query.fromDate);
        startDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = startDate;
      }
      if (query.toDate) {
        const endDate = new Date(query.toDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    return PaginationHelper.paginate(this.prisma.exchangeRate, {
      where,
      orderBy: { createdAt: 'desc' },
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Lấy lịch sử giá vàng cho biểu đồ (30 ngày)
   */
  async getGoldHistoryForChart(query: GoldHistoryQueryDto): Promise<PaginatedResult<ChartDataPoint>> {
    // Xây dựng điều kiện where
    const where: any = {};

    // Xử lý ngày bắt đầu
    if (query.fromDate) {
      const startDate = new Date(query.fromDate);
      startDate.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startDate };
    } else if (query.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - query.days);
      startDate.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startDate };
    }

    // Xử lý ngày kết thúc
    if (query.toDate) {
      const endDate = new Date(query.toDate);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: endDate };
    }

    // Filter theo brand, city, type (không phân biệt hoa thường)
    if (query.brand) {
      where.brand = { contains: StringUtil.toUpper(query.brand), mode: 'insensitive' };
    }
    if (query.city) {
      where.city = { contains: StringUtil.toUpper(query.city), mode: 'insensitive' };
    }
    if (query.type) {
      where.type = { contains: StringUtil.toUpper(query.type), mode: 'insensitive' };
    }

    // Lấy tất cả records theo điều kiện where (không phân trang ở đây)
    const records = await this.prisma.goldPrice.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, buyPrice: true, sellPrice: true },
    });

    // Gom theo ngày, mỗi ngày lấy bản ghi cuối cùng
    const dailyMap = new Map<string, { buy: number; sell: number }>();
    
    for (const record of records) {
      const dateKey = record.createdAt.toISOString().slice(0, 10);
      // Ghi đè để lấy bản ghi cuối cùng của ngày
      dailyMap.set(dateKey, {
        buy: record.buyPrice,
        sell: record.sellPrice,
      });
    }
    // Chuyển Map thành array và sắp xếp theo ngày
    let chartData: ChartDataPoint[] = Array.from(dailyMap.entries())
      .map(([date, prices]) => ({
        date,
        buy: prices.buy,
        sell: prices.sell,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const total = chartData.length;

    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedData = chartData.slice(startIndex, endIndex);

    return PaginationHelper.createPaginatedResult(
      paginatedData,
      total,
      query.page,
      query.limit,
    );
  }
}
