import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

const logger = new Logger('JwtConfig');

/**
 * 开发环境专用的弱密钥（仅用于本地开发）
 * 警告：此密钥绝不能用于生产环境
 */
const DEV_ONLY_SECRET = 'dev-only-jwt-secret-do-not-use-in-production';

/**
 * 获取 JWT 密钥
 * - 生产环境：必须从环境变量获取，缺失则抛出错误
 * - 开发环境：可使用默认值，但会输出警告
 */
const getJwtSecret = (configService: ConfigService): string => {
  const secret = configService.get<string>('JWT_SECRET');
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (!secret) {
    if (isProduction) {
      // 生产环境缺失密钥，直接阻止启动
      throw new Error(
        '[Security Error] JWT_SECRET 环境变量未配置！' +
          '生产环境必须设置强密钥，禁止使用默认值。' +
          '请在环境变量中设置 JWT_SECRET（建议至少 32 位随机字符）。',
      );
    }

    // 开发环境输出警告
    logger.warn('========================================');
    logger.warn('⚠️  JWT_SECRET 未配置，使用开发环境默认密钥');
    logger.warn('⚠️  此密钥仅供本地开发，生产环境必须配置强密钥！');
    logger.warn('========================================');

    return DEV_ONLY_SECRET;
  }

  // 检查密钥强度
  if (secret.length < 32) {
    logger.warn('⚠️  JWT_SECRET 长度不足 32 位，建议使用更强的密钥');
  }

  return secret;
};

/**
 * JWT 模块配置工厂
 */
export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: getJwtSecret(configService),
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
  },
});
