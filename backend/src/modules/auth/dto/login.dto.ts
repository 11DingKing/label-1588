import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户登录请求 DTO
 */
export class LoginDto {
  @ApiProperty({
    description: '用户名或邮箱',
    example: 'john_doe',
  })
  @IsNotEmpty({ message: '用户名/邮箱不能为空' })
  @IsString({ message: '用户名/邮箱必须是字符串' })
  account: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  password: string;
}
