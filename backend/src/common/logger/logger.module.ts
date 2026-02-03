import { Module, Global } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger.service';

/**
 * 全局日志模块
 * 提供结构化 JSON 日志服务
 */
@Global()
@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggerModule {}
