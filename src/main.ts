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
  
  // CORS
  app.enableCors({
    origin: env === 'development' 
      ? ['http://localhost:8001', 'http://localhost:8080', 'http://localhost:4200']
      : ['https://goldtrack.vn'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // API prefix
  app.setGlobalPrefix('api/v1');
  
  // Swagger (chỉ development)
  if (env === 'development') {
    setupSwagger(app);
  }
  
  // Start server
  await app.listen(port);
  
  console.log(`
  ════════════════════════════════════════════════════════════════
  🚀 ${configService.get('app.name')} is running!
  📡 Server: ${appUrl}
  📚 Swagger: ${appUrl}/api/docs
  🌍 Environment: ${env}
  🏥 Health: ${appUrl}/api/v1/health
  🗄️  Prisma Studio: npx prisma studio
  ════════════════════════════════════════════════════════════════
  `);
}

bootstrap();