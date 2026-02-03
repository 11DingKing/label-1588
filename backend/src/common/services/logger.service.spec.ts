import { CustomLoggerService } from './logger.service';

describe('CustomLoggerService', () => {
  let loggerService: CustomLoggerService;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
  };

  beforeEach(() => {
    loggerService = new CustomLoggerService();
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setContext', () => {
    it('should set context and return this', () => {
      const result = loggerService.setContext('TestContext');
      expect(result).toBe(loggerService);
    });
  });

  describe('log', () => {
    it('should log message with context', () => {
      loggerService.setContext('TestService');
      loggerService.log('Test message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('LOG');
      expect(logOutput).toContain('TestService');
      expect(logOutput).toContain('Test message');
    });

    it('should log with string context override', () => {
      loggerService.log('Test message', 'OverrideContext');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('OverrideContext');
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      loggerService.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('ERROR');
      expect(logOutput).toContain('Error message');
    });

    it('should log error with stack trace', () => {
      loggerService.error('Error message', 'Stack trace here');

      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      loggerService.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('WARN');
      expect(logOutput).toContain('Warning message');
    });
  });

  describe('debug', () => {
    it('should log debug message in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      loggerService = new CustomLoggerService();
      loggerService.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('DEBUG');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('verbose', () => {
    it('should log verbose message when log level allows', () => {
      const originalEnv = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'VERBOSE';

      loggerService = new CustomLoggerService();
      loggerService.verbose('Verbose message');

      expect(consoleSpy.log).toHaveBeenCalled();

      process.env.LOG_LEVEL = originalEnv;
    });
  });

  describe('logWithContext', () => {
    it('should log with structured context', () => {
      loggerService.setContext('TestService');
      loggerService.logWithContext('LOG', 'Test message', {
        traceId: 'abc123',
        userId: 1,
        method: 'GET',
        url: '/api/test',
        duration: 100,
      });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('traceId=abc123');
      expect(logOutput).toContain('userId=1');
      expect(logOutput).toContain('GET /api/test');
      expect(logOutput).toContain('100ms');
    });
  });

  describe('sanitize', () => {
    it('should mask password field', () => {
      const data = { username: 'test', password: 'secret123' };
      const result = CustomLoggerService.sanitize(data);

      expect(result.username).toBe('test');
      expect(result.password).toBe('******');
    });

    it('should mask token field', () => {
      const data = { accessToken: 'jwt-token-here' };
      const result = CustomLoggerService.sanitize(data);

      expect(result.accessToken).toBe('******');
    });

    it('should mask nested sensitive fields', () => {
      const data = {
        user: {
          name: 'test',
          credentials: {
            password: 'secret',
          },
        },
      };
      const result = CustomLoggerService.sanitize(data);

      expect((result.user as Record<string, unknown>).name).toBe('test');
      expect(
        ((result.user as Record<string, unknown>).credentials as Record<string, unknown>).password,
      ).toBe('******');
    });

    it('should handle null and undefined', () => {
      expect(CustomLoggerService.sanitize(null as unknown as Record<string, unknown>)).toEqual({});
      expect(CustomLoggerService.sanitize(undefined as unknown as Record<string, unknown>)).toEqual(
        {},
      );
    });

    it('should handle non-object input', () => {
      expect(CustomLoggerService.sanitize('string' as unknown as Record<string, unknown>)).toEqual(
        {},
      );
    });

    it('should mask apiKey field', () => {
      const data = { apiKey: 'sk-123456789' };
      const result = CustomLoggerService.sanitize(data);

      expect(result.apiKey).toBe('******');
    });

    it('should mask authorization header', () => {
      const data = { authorization: 'Bearer token123' };
      const result = CustomLoggerService.sanitize(data);

      expect(result.authorization).toBe('******');
    });
  });

  describe('log level from environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalLogLevel = process.env.LOG_LEVEL;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should use ERROR level when LOG_LEVEL is ERROR', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new CustomLoggerService();

      logger.log('This should not appear');
      logger.warn('This should not appear');
      logger.error('This should appear');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should use LOG level in production by default', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'production';
      const logger = new CustomLoggerService();

      logger.debug('This should not appear');
      logger.log('This should appear');

      // 注意：debug 在 LOG 级别下不会输出
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('should use DEBUG level in development by default', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'development';
      const logger = new CustomLoggerService();

      logger.debug('This should appear');
      logger.log('This should also appear');

      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
    });
  });
});
