import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { throwError } from 'rxjs';
import { WinstonLoggerService } from '../logger/winston-logger.service';

// 扩展 Request 类型以支持 traceId
declare module 'express' {
  interface Request {
    traceId?: string;
  }
}

/**
 * 日志拦截器
 * 记录每个请求的详细信息：方法、URL、耗时、用户信息等
 *
 * 功能：
 * - 生成唯一的请求追踪ID
 * - 输出结构化 JSON 日志（便于 ELK/EFK 采集）
 * - 敏感数据脱敏
 * - 计算请求耗时
 * - 记录用户信息（如果已认证）
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new WinstonLoggerService();

  constructor() {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 只处理 HTTP 请求
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params } = request;

    // 安全地获取 User-Agent
    const userAgent = this.safeGetHeader(request, 'user-agent');

    // 安全地获取客户端 IP（兼容代理场景）
    const ip = this.getClientIp(request);

    // 生成请求追踪 ID
    const traceId = uuidv4().slice(0, 8);
    request.traceId = traceId;

    // 设置响应头中的追踪ID
    response.setHeader('X-Trace-Id', traceId);

    const startTime = Date.now();

    // 获取用户信息（如果已认证）
    const user = (request as unknown as { user?: { id: number; username: string } }).user;
    const userId = user?.id;

    // 脱敏处理敏感字段
    const sanitizedBody = WinstonLoggerService.sanitize(body || {});
    const sanitizedQuery = WinstonLoggerService.sanitize(query || {});

    // 结构化请求日志
    this.logger.http('Incoming request', {
      traceId,
      method,
      url,
      userId,
      ip,
      userAgent: userAgent.slice(0, 100),
      body: this.shouldLogBody() ? sanitizedBody : undefined,
      query: this.shouldLogBody() ? sanitizedQuery : undefined,
      params: this.shouldLogBody() ? params : undefined,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const responseSize = this.getDataSize(data);

          // 结构化响应日志
          this.logger.http('Request completed', {
            traceId,
            method,
            url,
            statusCode,
            duration,
            userId,
            responseSize,
            slow: duration > 3000,
          });
        },
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;

        // 结构化错误日志
        this.logger.error('Request failed', error.stack, {
          traceId,
          method,
          url,
          statusCode,
          duration,
          userId,
          errorMessage: error.message,
          errorName: error.name,
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * 安全获取请求头
   */
  private safeGetHeader(request: Request, header: string): string {
    try {
      return request.get(header) || '';
    } catch {
      return '';
    }
  }

  /**
   * 获取客户端真实 IP
   * 支持代理场景（X-Forwarded-For, X-Real-IP）
   */
  private getClientIp(request: Request): string {
    try {
      // 优先使用代理传递的真实 IP
      const forwardedFor = request.get('x-forwarded-for');
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
      }

      const realIp = request.get('x-real-ip');
      if (realIp) {
        return realIp;
      }

      // 使用 request.ip（Express 内置）
      if (request.ip) {
        return request.ip;
      }

      // 最后尝试 socket
      return request.socket?.remoteAddress || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 是否应该记录请求体
   */
  private shouldLogBody(): boolean {
    return process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'DEBUG';
  }

  /**
   * 获取数据大小（字节）
   */
  private getDataSize(data: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      return 0;
    }
  }
}
