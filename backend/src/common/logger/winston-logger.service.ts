import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { winstonLogger } from './winston.config';

/**
 * 日志上下文接口
 */
export interface LogContext {
  traceId?: string;
  userId?: number | string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * 敏感字段列表（需要脱敏）
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'secret',
  'apiKey',
  'api_key',
  'creditCard',
  'ssn',
];

/**
 * Winston 日志服务
 * 提供结构化 JSON 日志，支持 ELK/EFK 日志采集
 */
@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements LoggerService {
  private context?: string;

  /**
   * 设置日志上下文（通常是类名）
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 敏感数据脱敏
   */
  static sanitize(obj: unknown, depth = 0): unknown {
    if (depth > 10) return '[Max Depth Exceeded]';
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => WinstonLoggerService.sanitize(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = WinstonLoggerService.sanitize(value, depth + 1);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(message: string, context?: LogContext): object {
    const sanitizedContext = context ? WinstonLoggerService.sanitize(context) : undefined;

    return {
      message,
      context: this.context,
      ...(sanitizedContext as object),
    };
  }

  /**
   * 普通日志
   */
  log(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      winstonLogger.info(message, { context });
    } else {
      winstonLogger.info(this.formatMessage(message, context));
    }
  }

  /**
   * 信息日志（别名）
   */
  info(message: string, context?: LogContext): void {
    winstonLogger.info(this.formatMessage(message, context));
  }

  /**
   * 错误日志
   */
  error(message: string, trace?: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      winstonLogger.error(message, { context, stack: trace });
    } else {
      winstonLogger.error({
        ...this.formatMessage(message, context),
        stack: trace,
      });
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      winstonLogger.warn(message, { context });
    } else {
      winstonLogger.warn(this.formatMessage(message, context));
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      winstonLogger.debug(message, { context });
    } else {
      winstonLogger.debug(this.formatMessage(message, context));
    }
  }

  /**
   * 详细日志
   */
  verbose(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      winstonLogger.verbose(message, { context });
    } else {
      winstonLogger.verbose(this.formatMessage(message, context));
    }
  }

  /**
   * HTTP 请求日志
   */
  http(message: string, context?: LogContext): void {
    winstonLogger.http(this.formatMessage(message, context));
  }

  /**
   * 带结构化上下文的日志
   */
  logWithContext(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose' | 'http',
    message: string,
    context: LogContext,
  ): void {
    const formattedMessage = this.formatMessage(message, context);
    winstonLogger.log(level, formattedMessage);
  }
}
