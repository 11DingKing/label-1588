import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserStatus } from '../user/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  // Mock 用户数据
  const mockUser: Partial<User> = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    status: UserStatus.ENABLED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock 认证响应
  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'mock-jwt-token',
    tokenType: 'Bearer',
    expiresIn: 86400,
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      status: UserStatus.ENABLED,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
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

    it('should register a new user and return auth response', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should pass through the correct DTO to service', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      account: 'testuser',
      password: 'password123',
    };

    it('should login user and return auth response', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle login with email', async () => {
      const emailLoginDto: LoginDto = {
        account: 'test@example.com',
        password: 'password123',
      };
      authService.login.mockResolvedValue(mockAuthResponse);

      await controller.login(emailLoginDto);

      expect(authService.login).toHaveBeenCalledWith(emailLoginDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', () => {
      const result = controller.getProfile(mockUser as User);

      expect(result).toEqual(mockUser);
    });

    it('should return the exact user object passed', () => {
      const customUser = {
        ...mockUser,
        username: 'customuser',
      };

      const result = controller.getProfile(customUser as User);

      expect(result.username).toBe('customuser');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and return new auth response', async () => {
      const newAuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-jwt-token',
      };
      authService.refreshToken.mockResolvedValue(newAuthResponse);

      const result = await controller.refreshToken(mockUser as User);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockUser);
      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual(newAuthResponse);
      expect(result.accessToken).toBe('new-jwt-token');
    });
  });
});
