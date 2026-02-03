import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { UserStatus } from '../../user/entities/user.entity';

/**
 * JWT Token 载荷接口
 */
export interface JwtPayload {
  sub: number; // 用户ID
  username: string;
  email: string;
  iat?: number; // 签发时间
  exp?: number; // 过期时间
}

/**
 * 开发环境专用的弱密钥
 */
const DEV_ONLY_SECRET = 'dev-only-jwt-secret-do-not-use-in-production';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    // 生产环境必须配置密钥
    if (!secret && isProduction) {
      throw new Error('[Security Error] JWT_SECRET 环境变量未配置！');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || DEV_ONLY_SECRET,
    });
  }

  /**
   * 验证 JWT Token 并返回用户信息
   */
  async validate(payload: JwtPayload) {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('用户已被禁用');
    }

    return user;
  }
}
