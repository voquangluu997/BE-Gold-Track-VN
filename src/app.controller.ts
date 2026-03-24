// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config')
  getConfig() {
    return {
      app: this.configService.get('app'),
      env: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? '***hidden***' : 'not set',
      },
    };
  }
}