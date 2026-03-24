import { registerAs } from '@nestjs/config';

/**
 * registerAs: Đăng ký một namespace cho configuration
 * Giúp truy cập cấu hình qua: configService.get('app.port')
 */
export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT|| '3000', 10) || 3000,
  name: process.env.APP_NAME || 'GoldTrack',
  url: process.env.APP_URL || 'http://localhost:3000',
}));