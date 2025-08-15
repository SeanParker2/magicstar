import { IsOptional, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { SpreadType } from './create-divination.dto'

export class DivinationHistoryQueryDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    minimum: 1,
    required: false,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1

  @ApiProperty({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 50,
    required: false,
    default: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(50, { message: '每页数量不能超过50' })
  limit?: number = 10

  @ApiProperty({
    description: '牌阵类型筛选',
    enum: SpreadType,
    required: false
  })
  @IsOptional()
  @IsEnum(SpreadType, { message: '牌阵类型无效' })
  spreadType?: SpreadType

  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式无效' })
  startDate?: string

  @ApiProperty({
    description: '结束日期',
    example: '2024-12-31',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式无效' })
  endDate?: string

  @ApiProperty({
    description: '排序字段',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt'],
    required: false,
    default: 'createdAt'
  })
  @IsOptional()
  @Transform(({ value }) => value || 'createdAt')
  sortBy?: string = 'createdAt'

  @ApiProperty({
    description: '排序方向',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    required: false,
    default: 'DESC'
  })
  @IsOptional()
  @Transform(({ value }) => value || 'DESC')
  sortOrder?: 'ASC' | 'DESC' = 'DESC'
}