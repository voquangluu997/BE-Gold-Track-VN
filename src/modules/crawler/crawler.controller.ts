// src/modules/crawler/crawler.controller.ts
import { Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrawlerService } from './crawler.service';
import { GoldQueryDto } from './dto/gold-query.dto';
import { CurrencyQueryDto } from './dto/currency-query.dto';
import { GoldLatestQueryDto } from './dto/gold-latest-query.dto';
import { CurrencyLatestQueryDto } from './dto/currency-latest-query.dto';
import { GoldHistoryQueryDto } from './dto/gold-history-query.dto';

@ApiTags('Crawler')
@Controller('crawler')
export class CrawlerController {
  constructor(private crawlerService: CrawlerService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger manual crawl' })
  async triggerCrawl() {
    return this.crawlerService.triggerCrawl('api');
  }

  @Get('gold')
  @ApiOperation({ summary: 'Get gold prices with filters' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getGold(@Query() query: GoldQueryDto) {
    return this.crawlerService.getGoldPrices(query);
  }

  @Get('gold/latest')
  @ApiOperation({ summary: 'Get latest gold prices (today)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getLatestGold(
    @Query() query: GoldLatestQueryDto) {
    return this.crawlerService.getLatestGoldPrices(query);
  }

  @Get('gold/history')
  @ApiOperation({ summary: 'Get gold price history for chart' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getGoldHistory(
    @Query() query: GoldHistoryQueryDto,
  ) {
    return this.crawlerService.getGoldHistoryForChart(query);
  }

  @Get('currency')
  @ApiOperation({ summary: 'Get exchange rates with filters' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getCurrency(@Query() query: CurrencyQueryDto) {
    return this.crawlerService.getExchangeRates(query);
  }

  @Get('currency/latest')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get latest exchange rates (today)' })
  async getLatestCurrency(@Query() query: CurrencyLatestQueryDto) {
    return this.crawlerService.getLatestExchangeRates(query);
  }
}