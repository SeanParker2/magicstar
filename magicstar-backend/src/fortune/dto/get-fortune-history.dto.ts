import { IsEnum, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FortuneType } from '../entities/fortune-template.entity';

export class GetFortuneHistoryDto {
  @IsOptional()
  @IsEnum(FortuneType)
  type?: FortuneType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value).toISOString().split('T')[0] : undefined)
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value).toISOString().split('T')[0] : undefined)
  endDate?: string;
}