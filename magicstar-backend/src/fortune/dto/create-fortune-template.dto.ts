import { IsEnum, IsString, IsOptional, IsInt, Min, Max, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { FortuneType, ZodiacSign, ChineseZodiac } from '../entities/fortune-template.entity';

class FortuneScoresDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  love: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  career: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  wealth: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  health: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overall: number;
}

export class CreateFortuneTemplateDto {
  @IsEnum(FortuneType)
  type: FortuneType;

  @IsOptional()
  @IsEnum(ZodiacSign)
  zodiacSign?: ZodiacSign;

  @IsOptional()
  @IsEnum(ChineseZodiac)
  chineseZodiac?: ChineseZodiac;

  @IsString()
  content: string;

  @IsObject()
  @Type(() => FortuneScoresDto)
  scores: FortuneScoresDto;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsString()
  luckyColor?: string;

  @IsOptional()
  @IsString()
  luckyDirection?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  weight?: number = 10;
}