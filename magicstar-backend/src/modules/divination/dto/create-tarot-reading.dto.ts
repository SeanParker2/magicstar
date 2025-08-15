import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

/**
 * 创建塔罗占卜DTO
 */
export class CreateTarotReadingDto {
  @ApiProperty({ description: '牌阵ID', example: 1 })
  @IsNumber({}, { message: '牌阵ID必须是数字' })
  spreadId: number;

  @ApiProperty({ description: '占卜问题', example: '我的感情运势如何？' })
  @IsString({ message: '问题必须是字符串' })
  @MinLength(5, { message: '问题至少5个字符' })
  @MaxLength(500, { message: '问题不能超过500个字符' })
  question: string;

  @ApiProperty({ description: '是否公开分享', example: false, required: false })
  @IsOptional()
  @IsBoolean({ message: '是否公开必须是布尔值' })
  isPublic?: boolean;
}

/**
 * 塔罗占卜结果DTO
 */
export class TarotReadingResultDto {
  @ApiProperty({ description: '占卜记录ID' })
  id: number;

  @ApiProperty({ description: '牌阵信息' })
  spread: {
    id: number;
    name: string;
    nameCn: string;
    cardCount: number;
  };

  @ApiProperty({ description: '占卜问题' })
  question: string;

  @ApiProperty({ description: '抽取的牌' })
  drawnCards: {
    position: number;
    cardId: number;
    isReversed: boolean;
    cardName: string;
    cardNameCn: string;
    meaning: string;
    imageUrl: string;
  }[];

  @ApiProperty({ description: '整体解读' })
  overallInterpretation: string;

  @ApiProperty({ description: '详细解读' })
  detailedInterpretation: {
    position: number;
    positionName: string;
    cardInterpretation: string;
    advice: string;
  }[];

  @ApiProperty({ description: '占卜结果摘要' })
  summary: string;

  @ApiProperty({ description: '建议和指导' })
  advice?: string;

  @ApiProperty({ description: '占卜时间' })
  readingTime: Date;
}