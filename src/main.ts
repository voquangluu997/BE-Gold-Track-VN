// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { loggerConfig } from './config/logger/logger.config';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig),
  });
  
  const configService = app.get(ConfigService);
  const port = parseInt(process.env.PORT || process.env.APP_PORT || '8001') ;
  const env = configService.get<string>('app.env', 'development');
  const appUrl = process.env.APP_URL;
  
  // Middlewares
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    // Các headers được expose ra client
    exposedHeaders: ['Content-Disposition'],
    // Thời gian cache preflight request (giây)
    maxAge: 3600,
  });
  
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });
  
  // Swagger (chỉ development)
  if (env === 'development') {
    setupSwagger(app);
  }
  
  // Start server
  await app.listen(port);
  
  console.log(`
  🚀 ${configService.get('app.name')} is running!
  📡 Server: http://0.0.0.0:${port}
  🌍 Environment: ${env}
  🏥 Health: http://0.0.0.0:${port}/health
  🗄️  Prisma Studio: npx prisma studio
  ════════════════════════════════════════════════════════════════
  `);
}

bootstrap();