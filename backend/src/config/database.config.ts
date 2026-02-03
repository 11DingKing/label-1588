import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseConfig');

/**
 * 数据库配置工厂函数
 *
 * 重要说明：
 * - 生产环境禁用 synchronize，使用 migrations 管理数据库结构
 * - 开发环境可选择启用 synchronize 便于快速开发
 * - 迁移命令：npm run migration:run
 */
export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const shouldSynchronize = configService.get<boolean>('DB_SYNCHRONIZE', false);

  // 生产环境下警告 synchronize
  if (isProduction && shouldSynchronize) {
    logger.warn('⚠️  DB_SYNCHRONIZE=true 在生产环境下不安全，已自动禁用');
  }

  return {
    type: 'mysql',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 3306),
    username: configService.get<string>('DB_USERNAME', 'root'),
    password: configService.get<string>('DB_PASSWORD', ''),
    database: configService.get<string>('DB_DATABASE', 'nestjs_auth'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    // 生产环境必须使用迁移，禁止自动同步
    // 开发环境可通过 DB_SYNCHRONIZE=true 启用自动同步（便于快速开发）
    synchronize: !isProduction && shouldSynchronize,
    // 生产环境自动运行迁移
    migrationsRun: isProduction,
    logging: configService.get<string>('NODE_ENV') === 'development',
    timezone: '+08:00',
    charset: 'utf8mb4',
  };
};
