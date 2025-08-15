import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, IsBoolean, Length, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBirthChartDto {
  @ApiProperty({ description: '星盘名称', example: '我的星盘' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: '出生日期', example: '1990-01-01' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ description: '出生时间', example: '14:30:00' })
  @IsString()
  @IsNotEmpty()
  birthTime: string;

  @ApiProperty({ description: '出生地点', example: '北京市' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  birthPlace: string;

  @ApiProperty({ description: '出生地纬度', example: 39.9042 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @ApiProperty({ description: '出生地经度', example: 116.4074 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @ApiProperty({ description: '时区', example: 'Asia/Shanghai' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  timezone: string;

  @ApiProperty({ description: '是否公开', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublic?: boolean;
}