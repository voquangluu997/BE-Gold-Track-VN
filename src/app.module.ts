import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import appConfig from './config/app.config';
import { CrawlerModule } from './modules/crawler/crawler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    // Rate Limiting
    ThrottlerModule.forRoot({
      throttlers:[
        {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
        }
      ],
      
    }),
    // Schedule
    ScheduleModule.forRoot(),
    PrismaModule,
    CrawlerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
