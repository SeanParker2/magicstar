import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';

export class UpdateSecurityDto {
  @ApiPropertyOptional({ description: '当前密码' })
  @IsOptional()
  @IsString({ message: '当前密码必须是字符串' })
  currentPassword?: string;

  @ApiPropertyOptional({ description: '新密码' })
  @IsOptional()
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(6, { message: '新密码至少6个字符' })
  @MaxLength(100, { message: '新密码最多100个字符' })
  newPassword?: string;

  @ApiPropertyOptional({ description: '新手机号', example: '13800138000' })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '手机验证码' })
  @IsOptional()
  @IsString({ message: '验证码必须是字符串' })
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  phoneCode?: string;

  @ApiPropertyOptional({ description: '是否启用两步验证', default: false })
  @IsOptional()
  @IsBoolean({ message: '两步验证设置必须是布尔值' })
  twoFactorEnabled?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString({ message: '当前密码必须是字符串' })
  currentPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(6, { message: '新密码至少6个字符' })
  @MaxLength(100, { message: '新密码最多100个字符' })
  newPassword: string;

  @ApiProperty({ description: '确认新密码' })
  @IsString({ message: '确认密码必须是字符串' })
  confirmPassword: string;
}