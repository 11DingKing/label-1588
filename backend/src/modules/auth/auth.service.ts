import { Injectable, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserInfo } from './dto/auth-response.dto';
import { User, UserStatus } from '../user/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`User registration attempt: ${registerDto.username}`);

    // 创建用户
    const user = await this.userService.create({
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
    });

    // 生成 Token
    const token = this.generateToken(user as User);

    this.logger.log(`User registered successfully: ${user.id}`);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.getExpiresInSeconds(),
      user: this.toUserInfo(user),
    };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`User login attempt: ${loginDto.account}`);

    // 支持用户名或邮箱登录
    let user: User | null = null;

    // 判断是邮箱还是用户名
    if (loginDto.account.includes('@')) {
      user = await this.userService.findByEmail(loginDto.account);
    } else {
      user = await this.userService.findByUsername(loginDto.account);
    }

    if (!user) {
      this.logger.warn(`Login failed - user not found: ${loginDto.account}`);
      throw new UnauthorizedException('用户名/邮箱或密码错误');
    }

    // 检查用户状态（先于密码验证，避免对禁用用户执行不必要的 bcrypt 计算）
    if (user.status === UserStatus.DISABLED) {
      this.logger.warn(`Login failed - user disabled: ${loginDto.account}`);
      throw new ForbiddenException('用户已被禁用，请联系管理员');
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(loginDto.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed - invalid password: ${loginDto.account}`);
      throw new UnauthorizedException('用户名/邮箱或密码错误');
    }

    // 生成 Token
    const token = this.generateToken(user);

    this.logger.log(`User logged in successfully: userId=${user.id}, username=${user.username}`);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.getExpiresInSeconds(),
      user: this.toUserInfo(user),
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(user: User): Promise<AuthResponseDto> {
    this.logger.log(`Token refresh for user: ${user.id}`);

    const token = this.generateToken(user);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.getExpiresInSeconds(),
      user: this.toUserInfo(user),
    };
  }

  /**
   * 转换用户实体为用户信息（不含密码和方法）
   */
  private toUserInfo(user: Partial<User>): UserInfo {
    return {
      id: user.id!,
      username: user.username!,
      email: user.email!,
      status: user.status!,
      createdAt: user.createdAt!,
      updatedAt: user.updatedAt!,
    };
  }

  /**
   * 生成 JWT Token
   */
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 获取 Token 过期时间（秒）
   */
  private getExpiresInSeconds(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');

    // 解析时间字符串
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      return 86400; // 默认 24 小时
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 86400;
    }
  }
}
