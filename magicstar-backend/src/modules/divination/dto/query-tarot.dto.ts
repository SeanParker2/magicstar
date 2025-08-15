import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询塔罗牌DTO
 */
export class QueryTarotCardsDto {
  @ApiProperty({ description: '牌组类型', enum: ['major', 'minor'], required: false })
  @IsOptional()
  @IsEnum(['major', 'minor'], { message: '牌组类型必须是major或minor' })
  type?: 'major' | 'minor';

  @ApiProperty({ description: '花色', enum: ['wands', 'cups', 'swords', 'pentacles'], required: false })
  @IsOptional()
  @IsEnum(['wands', 'cups', 'swords', 'pentacles'], { message: '花色必须是wands、cups、swords或pentacles之一' })
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;

  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit?: number = 20;
}

/**
 * 查询塔罗牌阵DTO
 */
export class QueryTarotSpreadsDto {
  @ApiProperty({ description: '难度等级', enum: ['beginner', 'intermediate', 'advanced'], required: false })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'], { message: '难度等级必须是beginner、intermediate或advanced之一' })
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ description: '牌数范围最小值', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '最小牌数必须是数字' })
  @Min(1, { message: '最小牌数不能小于1' })
  minCards?: number;

  @ApiProperty({ description: '牌数范围最大值', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '最大牌数必须是数字' })
  @Min(1, { message: '最大牌数不能小于1' })
  maxCards?: number;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;

  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(50, { message: '每页数量最大为50' })
  limit?: number = 10;
}

/**
 * 查询占卜历史DTO
 */
export class QueryTarotReadingsDto {
  @ApiProperty({ description: '牌阵ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '牌阵ID必须是数字' })
  spreadId?: number;

  @ApiProperty({ description: '开始日期', example: '2024-01-01', required: false })
  @IsOptional()
  @IsString({ message: '开始日期必须是字符串' })
  startDate?: string;

  @ApiProperty({ description: '结束日期', example: '2024-12-31', required: false })
  @IsOptional()
  @IsString({ message: '结束日期必须是字符串' })
  endDate?: string;

  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(50, { message: '每页数量最大为50' })
  limit?: number = 10;
}