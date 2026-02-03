import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity';

/**
 * 更新用户 DTO
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'newemail@example.com',
    maxLength: 100,
  })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(100, { message: '邮箱最多100个字符' })
  email?: string;

  @ApiPropertyOptional({
    description: '新密码',
    example: 'newpassword123',
    minLength: 6,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  @MaxLength(50, { message: '密码最多50个字符' })
  password?: string;

  @ApiPropertyOptional({
    description: '状态（0-禁用，1-启用）',
    enum: UserStatus,
    example: 1,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: '状态值无效' })
  status?: UserStatus;
}
