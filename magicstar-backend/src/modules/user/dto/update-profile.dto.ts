import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { UserGender } from '../entities/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '昵称', example: 'John' })
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(50, { message: '昵称最多50个字符' })
  nickname?: string;

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