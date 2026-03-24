// src/common/services/logger.service.ts
import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';
import { createLogger } from 'winston';
import { loggerConfig } from '../../config/logger/logger.config';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private logger: WinstonLogger;
  private context?: string;
  
  constructor() {
    this.logger = createLogger(loggerConfig);
  }
  
  setContext(context: string) {
    this.context = context;
  }
  
  log(message: any, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }
  
  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { 
      context: context || this.context,
      trace,
    });
  }
  
  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }
  
  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }
  
  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }
}