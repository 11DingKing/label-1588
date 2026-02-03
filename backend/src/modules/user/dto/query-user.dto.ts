import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity';

/**
 * 用户查询 DTO
 */
export class QueryUserDto {
  @ApiPropertyOptional({ description: '用户名（模糊搜索）', example: 'john' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '邮箱（模糊搜索）', example: 'john@' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: '状态（0-禁用，1-启用）',
    enum: UserStatus,
    example: 1,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  @Type(() => Number)
  status?: UserStatus;

  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 10;
}
