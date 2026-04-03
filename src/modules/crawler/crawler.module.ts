// src/modules/crawler/crawler.module.ts
import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CrawlerService } from './crawler.service';
import { CrawlerProcessor } from './processors/crawler.processor';
import { CrawlerController } from './crawler.controller';
import { Crawler24hService } from './sources/primary/crawler-24h.service';
import { CrawlerGiavangService } from './sources/backup/crawler-giavang.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST');
        const port = configService.get('REDIS_PORT');
        const password = configService.get('REDIS_PASSWORD');
        const useTLS = configService.get('REDIS_TLS') === '1';

        if (!host) {
          console.warn('⚠️ Redis not configured. Queue features will be disabled.');
          return {
            redis: { host: 'localhost', port: 6379 }, 
            skipQueueSetup: true, 
          };
        }

        const redisConfig: any = {
          host,
          port: parseInt(port, 10) || 6379,
          password,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
        };

        if (useTLS) {
          redisConfig.tls = {};
        }

        return {
          redis: redisConfig,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'crawler',
    }),
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerProcessor,
    Crawler24hService,
    CrawlerGiavangService,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {
  private readonly logger = new Logger(CrawlerModule.name);
  constructor() {
    this.logger.log('✅ CrawlerModule initialized');
  }
}