import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开接口装饰器
 * 标记后的接口无需 JWT 认证
 * 使用方法：@Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
