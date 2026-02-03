import { HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { QueryFailedError } from 'typeorm';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockRequest: {
    url: string;
    method: string;
    traceId?: string;
  };
  let mockArgumentsHost: {
    switchToHttp: jest.Mock;
    getType: jest.Mock;
  };

  beforeEach(async () => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      traceId: 'abc12345',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getType: jest.fn().mockReturnValue('http'),
    };
  });

  describe('HTTP Exceptions', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          data: null,
          traceId: 'abc12345',
        }),
      );
    });

    it('should handle BadRequestException', () => {
      const exception = new BadRequestException('Validation failed');

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
        }),
      );
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
        }),
      );
    });

    it('should handle validation errors (array message)', () => {
      const exception = new BadRequestException({
        message: ['email must be an email', 'password is required'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'email must be an email; password is required',
        }),
      );
    });
  });

  describe('Database Errors', () => {
    it('should handle duplicate entry error', () => {
      const driverError = new Error('Duplicate entry') as Error & { code: string; errno: number };
      driverError.code = 'ER_DUP_ENTRY';
      driverError.errno = 1062;
      const exception = new QueryFailedError('INSERT INTO', [], driverError);

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.CONFLICT,
          message: '数据已存在，请检查唯一字段',
        }),
      );
    });

    it('should handle foreign key constraint error', () => {
      const driverError = new Error('Foreign key constraint') as Error & {
        code: string;
        errno: number;
      };
      driverError.code = 'ER_NO_REFERENCED_ROW_2';
      driverError.errno = 1452;
      const exception = new QueryFailedError('INSERT INTO', [], driverError);

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '关联数据不存在',
        }),
      );
    });
  });

  describe('Generic Errors', () => {
    it('should handle SyntaxError', () => {
      const exception = new SyntaxError('Unexpected token');

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '请求格式错误',
        }),
      );
    });

    it('should handle generic Error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Something went wrong');

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Sensitive error details');

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '服务器内部错误，请稍后重试',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Unknown Errors', () => {
    it('should handle unknown exceptions', () => {
      const exception = 'string error';

      filter.catch(exception, mockArgumentsHost as never);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '服务器发生未知错误',
          error: 'Unknown Error',
        }),
      );
    });
  });

  describe('Response Format', () => {
    it('should include all required fields', () => {
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost as never);

      const responseBody = mockResponse.json.mock.calls[0][0];

      expect(responseBody).toHaveProperty('code');
      expect(responseBody).toHaveProperty('message');
      expect(responseBody).toHaveProperty('error');
      expect(responseBody).toHaveProperty('data', null);
      expect(responseBody).toHaveProperty('timestamp');
      expect(responseBody).toHaveProperty('path', '/api/test');
      expect(responseBody).toHaveProperty('method', 'GET');
      expect(responseBody).toHaveProperty('traceId', 'abc12345');
    });

    it('should use "unknown" traceId when not provided', () => {
      mockRequest.traceId = undefined;
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockArgumentsHost as never);

      const responseBody = mockResponse.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('traceId', 'unknown');
    });
  });
});
