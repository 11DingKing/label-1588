import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * TypeORM 数据源配置
 * 用于 CLI 迁移命令和应用运行时
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'nestjs_auth',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // 生产环境禁用自动同步，使用迁移管理数据库结构
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  timezone: '+08:00',
  charset: 'utf8mb4',
};

/**
 * TypeORM CLI 使用的数据源实例
 */
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
