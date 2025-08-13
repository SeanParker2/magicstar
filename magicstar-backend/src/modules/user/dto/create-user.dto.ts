import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { UserGender } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'john@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  @MaxLength(100, { message: '密码最多100个字符' })
  password: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '昵称', example: 'John' })
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(50, { message: '昵称最多50个字符' })
  nickname?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString({ message: '头像URL必须是字符串' })
  @MaxLength(500, { message: '头像URL最多500个字符' })
  avatar?: string;

  @ApiPropertyOptional({
    description: '性别',
    enum: UserGender,
    example: UserGender.MALE,
  })
  @IsOptional()
  @IsEnum(UserGender, { message: '性别值不正确' })
  gender?: UserGender;

  @ApiPropertyOptional({ description: '生日', example: '1990-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '生日格式不正确' })
  birthday?: string;

  @ApiPropertyOptional({ description: '出生地', example: '北京市' })
  @IsOptional()
  @IsString({ message: '出生地必须是字符串' })
  @MaxLength(100, { message: '出生地最多100个字符' })
  birthPlace?: string;

  @ApiPropertyOptional({ description: '出生时间', example: '08:30:00' })
  @IsOptional()
  @IsString({ message: '出生时间必须是字符串' })
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: '出生时间格式不正确，应为HH:MM:SS',
  })
  birthTime?: string;

  @ApiPropertyOptional({ description: '个人简介' })
  @IsOptional()
  @IsString({ message: '个人简介必须是字符串' })
  @MaxLength(500, { message: '个人简介最多500个字符' })
  bio?: string;
}