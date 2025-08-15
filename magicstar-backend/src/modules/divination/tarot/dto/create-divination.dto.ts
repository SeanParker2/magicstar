import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum SpreadType {
  SINGLE = 'single',
  THREE = 'three',
  CELTIC = 'celtic'
}

export class CreateDivinationDto {
  @ApiProperty({
    description: '占卜问题',
    example: '我的爱情运势如何？',
    maxLength: 200
  })
  @IsString()
  @IsNotEmpty({ message: '占卜问题不能为空' })
  @MaxLength(200, { message: '占卜问题不能超过200个字符' })
  question: string

  @ApiProperty({
    description: '牌阵类型',
    enum: SpreadType,
    example: SpreadType.THREE
  })
  @IsEnum(SpreadType, { message: '牌阵类型无效' })
  spreadType: SpreadType

  @ApiProperty({
    description: '选择的卡牌ID列表',
    example: [1, 15, 32],
    required: false
  })
  @IsOptional()
  selectedCardIds?: number[]

  @ApiProperty({
    description: '占卜时间戳',
    example: 1640995200000,
    required: false
  })
  @IsOptional()
  timestamp?: number
}