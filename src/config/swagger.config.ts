import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('GoldTrack API')
    .setDescription(`
      API documentation for GoldTrack Vietnam application
      
      ## Features:
      - 📊 Gold price tracking across Vietnam
      - 💱 Exchange rate monitoring
      - 📍 Location-based notifications
      - 🔔 Price alerts
    `)
    .setVersion('1.0.0')
    .addTag('Health', 'Health check endpoints')
    .addTag('Gold', 'Gold price endpoints')
    .addTag('Currency', 'Exchange rate endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Development')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      persistAuthorization: true,
    },
    customSiteTitle: 'GoldTrack API Docs',
  });
}