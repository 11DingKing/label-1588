import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User, UserStatus } from '../user/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock 用户数据
  const mockUser: Partial<User> = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    status: UserStatus.ENABLED,
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findByUsername: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('24h'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService) as jest.Mocked<UserService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
    };

    it('should successfully register a new user', async () => {
      const createdUser = {
        id: 2,
        username: registerDto.username,
        email: registerDto.email,
        status: UserStatus.ENABLED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.create.mockResolvedValue(createdUser as User);

      const result = await authService.register(registerDto);

      expect(userService.create).toHaveBeenCalledWith({
        username: registerDto.username,
        email: registerDto.email,
        password: registerDto.password,
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user).toHaveProperty('id', createdUser.id);
      expect(result.user).toHaveProperty('username', createdUser.username);
    });

    it('should propagate error when user creation fails', async () => {
      const conflictError = new Error('用户名已存在');
      userService.create.mockRejectedValue(conflictError);

      await expect(authService.register(registerDto)).rejects.toThrow('用户名已存在');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      account: 'testuser',
      password: 'correctpassword',
    };

    it('should successfully login with username', async () => {
      const user = { ...mockUser, comparePassword: jest.fn().mockResolvedValue(true) } as User;
      userService.findByUsername.mockResolvedValue(user);

      const result = await authService.login(loginDto);

      expect(userService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(user.comparePassword).toHaveBeenCalledWith('correctpassword');
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('tokenType', 'Bearer');
    });

    it('should successfully login with email', async () => {
      const emailLoginDto: LoginDto = {
        account: 'test@example.com',
        password: 'correctpassword',
      };
      const user = { ...mockUser, comparePassword: jest.fn().mockResolvedValue(true) } as User;
      userService.findByEmail.mockResolvedValue(user);

      const result = await authService.login(emailLoginDto);

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(user.comparePassword).toHaveBeenCalledWith('correctpassword');
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userService.findByUsername.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(loginDto)).rejects.toThrow('用户名/邮箱或密码错误');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const user = { ...mockUser, comparePassword: jest.fn().mockResolvedValue(false) } as User;
      userService.findByUsername.mockResolvedValue(user);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(authService.login(loginDto)).rejects.toThrow('用户名/邮箱或密码错误');
    });

    it('should throw ForbiddenException when user is disabled', async () => {
      const disabledUser = {
        ...mockUser,
        status: UserStatus.DISABLED,
        comparePassword: jest.fn().mockResolvedValue(true),
      } as User;
      userService.findByUsername.mockResolvedValue(disabledUser);

      await expect(authService.login(loginDto)).rejects.toThrow(ForbiddenException);
      await expect(authService.login(loginDto)).rejects.toThrow('用户已被禁用');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const user = mockUser as User;

      const result = await authService.refreshToken(user);

      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result.user).toHaveProperty('id', user.id);
    });
  });

  describe('getExpiresInSeconds', () => {
    it('should parse hours correctly', async () => {
      configService.get.mockReturnValue('24h');

      const registerDto: RegisterDto = {
        username: 'test',
        email: 'test@test.com',
        password: 'password',
      };
      userService.create.mockResolvedValue(mockUser as User);

      const result = await authService.register(registerDto);

      expect(result.expiresIn).toBe(86400); // 24 * 3600
    });

    it('should parse minutes correctly', async () => {
      configService.get.mockReturnValue('30m');

      const registerDto: RegisterDto = {
        username: 'test',
        email: 'test@test.com',
        password: 'password',
      };
      userService.create.mockResolvedValue(mockUser as User);

      const result = await authService.register(registerDto);

      expect(result.expiresIn).toBe(1800); // 30 * 60
    });

    it('should parse days correctly', async () => {
      configService.get.mockReturnValue('7d');

      const registerDto: RegisterDto = {
        username: 'test',
        email: 'test@test.com',
        password: 'password',
      };
      userService.create.mockResolvedValue(mockUser as User);

      const result = await authService.register(registerDto);

      expect(result.expiresIn).toBe(604800); // 7 * 86400
    });

    it('should return default value for invalid format', async () => {
      configService.get.mockReturnValue('invalid');

      const registerDto: RegisterDto = {
        username: 'test',
        email: 'test@test.com',
        password: 'password',
      };
      userService.create.mockResolvedValue(mockUser as User);

      const result = await authService.register(registerDto);

      expect(result.expiresIn).toBe(86400); // 默认 24 小时
    });
  });
});
