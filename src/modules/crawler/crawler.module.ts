import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { CrawlerService } from './crawler.service';
import { CrawlerProcessor } from './processors/crawler.processor';
import { CrawlerController } from './crawler.controller';
import { CrawlerWebgiaService } from './sources/backup/crawler-webgia.service';
import { Crawler24hService } from './sources/primary/crawler-24h.service';
import { CrawlerGiavangService } from './sources/backup/crawler-giavang.service';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'crawler' }),
    PrismaModule,
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerProcessor,
    CrawlerWebgiaService,
    Crawler24hService,
    CrawlerGiavangService
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}