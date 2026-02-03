import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * 日志级别定义
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
};

/**
 * 日志级别颜色（控制台输出用）
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
};

winston.addColors(LOG_COLORS);

/**
 * 获取当前日志级别
 */
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const configLevel = process.env.LOG_LEVEL?.toLowerCase();

  if (configLevel && Object.keys(LOG_LEVELS).includes(configLevel)) {
    return configLevel;
  }

  return env === 'development' ? 'debug' : 'info';
};

/**
 * JSON 格式化器（用于生产环境/日志采集）
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * 控制台友好格式化器（用于开发环境）
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, traceId, ...meta }) => {
    const contextStr = context ? `[${context}]` : '';
    const traceStr = traceId ? `[${traceId}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${contextStr}${traceStr} ${message}${metaStr}`;
  }),
);

/**
 * 创建 Winston Logger 实例
 */
export const createWinstonLogger = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = getLogLevel();

  const transports: winston.transport[] = [];

  // 控制台输出
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: isProduction ? jsonFormat : consoleFormat,
    }),
  );

  // 生产环境添加文件日志
  if (isProduction) {
    // 错误日志（单独文件）
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: jsonFormat,
        maxSize: '20m',
        maxFiles: '30d',
        zippedArchive: true,
      }),
    );

    // 综合日志
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        format: jsonFormat,
        maxSize: '50m',
        maxFiles: '14d',
        zippedArchive: true,
      }),
    );
  }

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: logLevel,
    defaultMeta: {
      service: 'nestjs-auth',
      environment: process.env.NODE_ENV || 'development',
    },
    transports,
    // 未捕获异常处理
    exceptionHandlers: isProduction
      ? [
          new winston.transports.DailyRotateFile({
            filename: 'logs/exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            format: jsonFormat,
            maxSize: '20m',
            maxFiles: '30d',
          }),
        ]
      : [],
    // 未处理 Promise rejection
    rejectionHandlers: isProduction
      ? [
          new winston.transports.DailyRotateFile({
            filename: 'logs/rejections-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            format: jsonFormat,
            maxSize: '20m',
            maxFiles: '30d',
          }),
        ]
      : [],
  });
};

/**
 * 全局 Winston Logger 实例
 */
export const winstonLogger = createWinstonLogger();
