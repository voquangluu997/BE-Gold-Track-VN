import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const loggerConfig: WinstonModuleOptions = {
  transports: [
    // ============================================
    // CONSOLE TRANSPORT - Hiển thị log trên terminal
    // ============================================
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
        }),
      ),
    }),
    
    // ============================================
    // FILE TRANSPORT - Lưu log vào file
    // ============================================
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    
    // ============================================
    // ERROR FILE TRANSPORT - Chỉ lưu log lỗi
    // ============================================
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};