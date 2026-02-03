import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户响应信息（不含密码）
 */
export class UserInfoDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'john_doe' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: '状态（0-禁用，1-启用）', example: 1 })
  status: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

/**
 * 兼容旧接口
 */
export type UserInfo = UserInfoDto;

/**
 * 认证响应 DTO
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT 访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '令牌类型',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: '过期时间（秒）',
    example: 86400,
  })
  expiresIn: number;

  @ApiProperty({
    description: '用户信息',
    type: UserInfoDto,
  })
  user: UserInfoDto;
}
