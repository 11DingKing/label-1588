import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  LOG = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

/**
 * 日志上下文接口
 */
export interface LogContext {
  traceId?: string;
  userId?: number;
  method?: string;
  url?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * 自定义日志服务
 * 提供结构化日志、上下文传递、敏感信息脱敏等功能
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements NestLoggerService {
  private context: string = 'Application';
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  /**
   * 设置日志上下文
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * 记录日志
   */
  log(message: string, context?: string | LogContext): void {
    if (this.logLevel >= LogLevel.LOG) {
      this.printMessage('LOG', message, context);
    }
  }

  /**
   * 记录错误
   */
  error(message: string, trace?: string, context?: string | LogContext): void {
    if (this.logLevel >= LogLevel.ERROR) {
      this.printMessage('ERROR', message, context, trace);
    }
  }

  /**
   * 记录警告
   */
  warn(message: string, context?: string | LogContext): void {
    if (this.logLevel >= LogLevel.WARN) {
      this.printMessage('WARN', message, context);
    }
  }

  /**
   * 记录调试信息
   */
  debug(message: string, context?: string | LogContext): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.printMessage('DEBUG', message, context);
    }
  }

  /**
   * 记录详细信息
   */
  verbose(message: string, context?: string | LogContext): void {
    if (this.logLevel >= LogLevel.VERBOSE) {
      this.printMessage('VERBOSE', message, context);
    }
  }

  /**
   * 记录带上下文的结构化日志
   */
  logWithContext(level: keyof typeof LogLevel, message: string, logContext: LogContext): void {
    const ctx = this.formatContext(logContext);
    switch (level) {
      case 'ERROR':
        this.error(message, undefined, ctx);
        break;
      case 'WARN':
        this.warn(message, ctx);
        break;
      case 'DEBUG':
        this.debug(message, ctx);
        break;
      case 'VERBOSE':
        this.verbose(message, ctx);
        break;
      default:
        this.log(message, ctx);
    }
  }

  /**
   * 打印消息
   */
  private printMessage(
    level: string,
    message: string,
    context?: string | LogContext,
    trace?: string,
  ): void {
    const timestamp = new Date().toISOString();
    const contextStr = this.resolveContext(context);
    const pid = process.pid;

    // 颜色配置
    const colors = {
      LOG: '\x1b[32m', // 绿色
      ERROR: '\x1b[31m', // 红色
      WARN: '\x1b[33m', // 黄色
      DEBUG: '\x1b[35m', // 紫色
      VERBOSE: '\x1b[36m', // 青色
      RESET: '\x1b[0m',
    };

    const color = colors[level as keyof typeof colors] || colors.RESET;
    const levelPadded = level.padEnd(7);

    // 构建日志行
    let logLine = `${color}[Nest] ${pid} - ${colors.RESET}`;
    logLine += `${timestamp} `;
    logLine += `${color}${levelPadded}${colors.RESET} `;
    logLine += `\x1b[33m[${contextStr}]\x1b[0m `;
    logLine += `${color}${message}${colors.RESET}`;

    // 输出到控制台
    if (level === 'ERROR') {
      console.error(logLine);
      if (trace) {
        console.error(trace);
      }
    } else if (level === 'WARN') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  }

  /**
   * 解析上下文
   */
  private resolveContext(context?: string | LogContext): string {
    if (!context) {
      return this.context;
    }
    if (typeof context === 'string') {
      return context;
    }
    return this.formatContext(context);
  }

  /**
   * 格式化上下文对象
   */
  private formatContext(logContext: LogContext): string {
    const parts: string[] = [this.context];

    if (logContext.traceId) {
      parts.push(`traceId=${logContext.traceId}`);
    }
    if (logContext.userId) {
      parts.push(`userId=${logContext.userId}`);
    }
    if (logContext.method && logContext.url) {
      parts.push(`${logContext.method} ${logContext.url}`);
    }
    if (logContext.duration !== undefined) {
      parts.push(`${logContext.duration}ms`);
    }

    return parts.join(' | ');
  }

  /**
   * 从环境变量获取日志级别
   */
  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'LOG':
        return LogLevel.LOG;
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'VERBOSE':
        return LogLevel.VERBOSE;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.LOG : LogLevel.DEBUG;
    }
  }

  /**
   * 敏感数据脱敏
   */
  static sanitize(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const sensitiveFields = [
      'password',
      'token',
      'authorization',
      'secret',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];

    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '******';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key] as Record<string, unknown>);
      }
    }

    return sanitized;
  }
}
