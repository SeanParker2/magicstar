import {
  IsEnum,
  IsOptional,
  IsDate,
  IsUUID,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  FinancialRecordType,
  FinancialRecordStatus,
} from '../entities/financial-record.entity';

export class QueryFinancialRecordsDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({
    description: '记录类型',
    enum: FinancialRecordType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FinancialRecordType)
  type?: FinancialRecordType;

  @ApiProperty({
    description: '记录状态',
    enum: FinancialRecordStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(FinancialRecordStatus)
  status?: FinancialRecordStatus;

  @ApiProperty({
    description: '用户ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: '业务类型',
    example: 'payment',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: '结束日期',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: '关键词搜索',
    example: '微信支付',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: '排序字段',
    example: 'recordDate',
    enum: ['recordDate', 'amount', 'createdAt'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['recordDate', 'amount', 'createdAt'])
  sortBy?: 'recordDate' | 'amount' | 'createdAt';

  @ApiProperty({
    description: '排序方向',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}