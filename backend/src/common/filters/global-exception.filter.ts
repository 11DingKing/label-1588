import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { WinstonLoggerService } from '../logger/winston-logger.service';

// 扩展 Request 类型以支持 traceId
declare module 'express' {
  interface Request {
    traceId?: string;
  }
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number;
  message: string;
  error: string;
  data: null;
  timestamp: string;
  path: string;
  method: string;
  traceId?: string;
}

/**
 * 全局异常过滤器
 * 统一处理所有未捕获的异常，返回统一格式的错误响应
 *
 * 支持的异常类型：
 * - HttpException: NestJS HTTP 异常
 * - QueryFailedError: TypeORM 查询错误
 * - EntityNotFoundError: TypeORM 实体未找到
 * - Error: 通用 JS 错误
 * - 未知异常
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new WinstonLoggerService();

  constructor() {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    // 只处理 HTTP 上下文
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 获取追踪ID
    const traceId = request.traceId || 'unknown';

    // 解析异常
    const { status, message, error } = this.parseException(exception);

    // 记录错误日志
    this.logError(exception, request, status, message, traceId);

    // 构建响应
    const errorResponse: ErrorResponse = {
      code: status,
      message,
      error,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      traceId,
    };

    // 发送响应
    response.status(status).json(errorResponse);
  }

  /**
   * 解析异常，返回统一的错误信息
   */
  private parseException(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    // HTTP 异常
    if (exception instanceof HttpException) {
      return this.parseHttpException(exception);
    }

    // TypeORM 查询失败错误
    if (exception instanceof QueryFailedError) {
      return this.parseQueryFailedError(exception);
    }

    // TypeORM 实体未找到错误
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: '请求的资源不存在',
        error: 'Not Found',
      };
    }

    // 通用 Error
    if (exception instanceof Error) {
      return this.parseGenericError(exception);
    }

    // 未知异常
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器发生未知错误',
      error: 'Unknown Error',
    };
  }

  /**
   * 解析 HTTP 异常
   */
  private parseHttpException(exception: HttpException): {
    status: number;
    message: string;
    error: string;
  } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, unknown>;

      // 处理 class-validator 的验证错误数组
      if (Array.isArray(res.message)) {
        message = res.message.join('; ');
      } else {
        message = (res.message as string) || exception.message;
      }

      error = (res.error as string) || this.getErrorNameByStatus(status);
    } else {
      message = exception.message;
      error = exception.name;
    }

    return { status, message, error };
  }

  /**
   * 解析 TypeORM 查询失败错误
   */
  private parseQueryFailedError(exception: QueryFailedError): {
    status: number;
    message: string;
    error: string;
  } {
    const driverError = exception.driverError as { code?: string; errno?: number };

    // MySQL 错误码处理
    if (driverError?.code === 'ER_DUP_ENTRY' || driverError?.errno === 1062) {
      return {
        status: HttpStatus.CONFLICT,
        message: '数据已存在，请检查唯一字段',
        error: 'Conflict',
      };
    }

    if (driverError?.code === 'ER_NO_REFERENCED_ROW_2' || driverError?.errno === 1452) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: '关联数据不存在',
        error: 'Bad Request',
      };
    }

    // 生产环境隐藏数据库错误详情
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        process.env.NODE_ENV === 'production' ? '数据库操作失败，请稍后重试' : exception.message,
      error: 'Database Error',
    };
  }

  /**
   * 解析通用错误
   */
  private parseGenericError(exception: Error): {
    status: number;
    message: string;
    error: string;
  } {
    // 检查是否是语法错误（如 JSON 解析错误）
    if (exception instanceof SyntaxError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: '请求格式错误',
        error: 'Bad Request',
      };
    }

    // 检查是否是类型错误
    if (exception instanceof TypeError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          process.env.NODE_ENV === 'production' ? '服务器处理请求时发生错误' : exception.message,
        error: 'Internal Server Error',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        process.env.NODE_ENV === 'production' ? '服务器内部错误，请稍后重试' : exception.message,
      error: 'Internal Server Error',
    };
  }

  /**
   * 记录错误日志（结构化 JSON 格式）
   */
  private logError(
    exception: unknown,
    request: Request,
    status: number,
    message: string,
    traceId: string,
  ): void {
    const logContext = {
      traceId,
      method: request.method,
      url: request.url,
      statusCode: status,
      errorMessage: message,
      errorType: exception?.constructor?.name || 'UnknownError',
      ip: request.ip,
      userAgent: typeof request.get === 'function' ? request.get('user-agent') : undefined,
    };

    // 4xx 错误使用 warn 级别
    if (status >= 400 && status < 500) {
      this.logger.warn('Client error', logContext);
      return;
    }

    // 5xx 错误使用 error 级别，并记录堆栈
    const stack = exception instanceof Error ? exception.stack : undefined;

    // 如果是数据库错误，添加 SQL 信息
    if (exception instanceof QueryFailedError) {
      this.logger.error('Database error', stack, {
        ...logContext,
        sql: exception.query || 'N/A',
      });
      return;
    }

    this.logger.error('Server error', stack, logContext);
  }

  /**
   * 根据状态码获取错误名称
   */
  private getErrorNameByStatus(status: number): string {
    const statusNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return statusNames[status] || 'Error';
  }
}
