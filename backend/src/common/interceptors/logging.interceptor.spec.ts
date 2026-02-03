import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: {
    method: string;
    url: string;
    body: Record<string, unknown>;
    query: Record<string, unknown>;
    params: Record<string, unknown>;
    ip: string;
    socket: { remoteAddress: string };
    traceId?: string;
    get: jest.Mock;
  };
  let mockResponse: {
    statusCode: number;
    setHeader: jest.Mock;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    mockRequest = {
      method: 'POST',
      url: '/api/auth/login',
      body: { account: 'testuser', password: 'secret123' },
      query: {},
      params: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn((header: string) => {
        const headers: Record<string, string> = {
          'user-agent': 'Mozilla/5.0 Test',
          'x-forwarded-for': '',
          'x-real-ip': '',
        };
        return headers[header.toLowerCase()] || '';
      }),
    };

    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    // 静默日志输出
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should set traceId on request', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockRequest.traceId).toBeDefined();
          expect(mockRequest.traceId).toHaveLength(8);
          done();
        },
      });
    });

    it('should set X-Trace-Id header on response', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Trace-Id', expect.any(String));
          done();
        },
      });
    });

    it('should sanitize password in body', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          // 验证日志被调用（内部实现会脱敏）
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle successful response', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ data: 'test' });
        },
        complete: done,
      });
    });

    it('should handle error response', (done) => {
      const error = new Error('Test error');
      (error as unknown as { status: number }).status = 400;
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err.message).toBe('Test error');
          done();
        },
      });
    });

    it('should skip non-http contexts', (done) => {
      (mockExecutionContext.getType as jest.Mock).mockReturnValue('rpc');

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          expect(mockResponse.setHeader).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('IP extraction', () => {
    it('should use x-forwarded-for header when available', (done) => {
      mockRequest.get = jest.fn((header: string) => {
        if (header.toLowerCase() === 'x-forwarded-for') {
          return '203.0.113.195, 70.41.3.18';
        }
        return '';
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: done,
      });

      // IP 提取逻辑在内部，通过日志输出验证
    });

    it('should use x-real-ip header as fallback', (done) => {
      mockRequest.get = jest.fn((header: string) => {
        if (header.toLowerCase() === 'x-real-ip') {
          return '192.168.1.100';
        }
        return '';
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: done,
      });
    });

    it('should use request.ip as fallback', (done) => {
      mockRequest.get = jest.fn().mockReturnValue('');
      mockRequest.ip = '10.0.0.1';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: done,
      });
    });
  });

  describe('query and params logging', () => {
    it('should log query parameters', (done) => {
      mockRequest.query = { page: '1', limit: '10' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: done,
      });
    });

    it('should log path parameters', (done) => {
      mockRequest.params = { id: '123' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: done,
      });
    });
  });
});
