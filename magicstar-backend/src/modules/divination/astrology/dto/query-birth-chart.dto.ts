import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryBirthChartDto {
  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: '是否只显示公开的星盘', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  publicOnly?: boolean;
}

export class GetBirthChartDetailDto {
  @ApiProperty({ description: '星盘ID或分享码' })
  @IsString()
  identifier: string;
}

export class ShareBirthChartDto {
  @ApiProperty({ description: '星盘ID' })
  @Type(() => Number)
  @IsNumber()
  chartId: number;

  @ApiProperty({ description: '是否生成新的分享码', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  regenerate?: boolean;
}