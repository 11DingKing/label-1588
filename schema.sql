-- ============================================
-- NestJS 用户认证系统 - 数据库初始化脚本
-- ============================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `nestjs_auth` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 注意：表结构由 TypeORM 自动同步创建（synchronize: true）
-- 此脚本仅用于确保数据库存在

-- 如需手动创建表结构，可使用以下 SQL：
-- ============================================
-- 用户表（仅供参考，TypeORM 会自动创建）
-- ============================================
-- CREATE TABLE IF NOT EXISTS `users` (
--   `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键',
--   `username` VARCHAR(50) NOT NULL COMMENT '用户名',
--   `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
--   `password` VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
--   `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
--   `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
--   `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `uk_username` (`username`),
--   UNIQUE KEY `uk_email` (`email`),
--   KEY `idx_status` (`status`),
--   KEY `idx_created_at` (`created_at`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
