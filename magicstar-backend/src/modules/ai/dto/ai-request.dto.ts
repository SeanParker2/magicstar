import { IsString, IsOptional, IsEnum, IsObject, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AiRequestType, AiRequestPriority, AiRequestStatus } from '../entities/ai-request.entity';

export class CreateAiRequestDto {
  @ApiProperty({
    description: '请求类型',
    enum: AiRequestType,
    example: AiRequestType.DIVINATION_INTERPRETATION,
  })
  @IsEnum(AiRequestType)
  requestType: AiRequestType;

  @ApiProperty({
    description: '输入数据',
    example: {
      divinationType: 'tarot',
      cards: ['愚者', '魔术师', '女祭司'],
      question: '我的事业发展如何？',
    },
  })
  @IsObject()
  inputData: any;

  @ApiPropertyOptional({
    description: '模型配置',
    example: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
  })
  @IsOptional()
  @IsObject()
  modelConfig?: any;

  @ApiPropertyOptional({
    description: '请求优先级',
    enum: AiRequestPriority,
    default: AiRequestPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(AiRequestPriority)
  priority?: AiRequestPriority;

  @ApiPropertyOptional({
    description: '会话ID',
    example: 'session_123456',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: '是否异步处理',
    default: false,
  })
  @IsOptional()
  async?: boolean;
}

export class AiRequestQueryDto {
  @ApiPropertyOptional({
    description: '请求类型',
    enum: AiRequestType,
  })
  @IsOptional()
  @IsEnum(AiRequestType)
  requestType?: AiRequestType;

  @ApiPropertyOptional({
    description: '请求状态',
    enum: AiRequestStatus,
  })
  @IsOptional()
  @IsEnum(AiRequestStatus)
  status?: AiRequestStatus;

  @ApiPropertyOptional({
    description: '会话ID',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '开始时间',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endTime?: string;
}

export class SubmitFeedbackDto {
  @ApiProperty({
    description: '用户评分',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: '用户反馈',
    example: '解读很准确，很有帮助',
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({
    description: '反馈标签',
    example: ['准确', '有用', '详细'],
  })
  @IsOptional()
  tags?: string[];
}

export class ProcessAiRequestDto {
  @ApiPropertyOptional({
    description: '处理选项',
    example: {
      useCache: true,
      priority: 'high',
    },
  })
  @IsOptional()
  @IsObject()
  options?: any;
}

export class AiRequestResponseDto {
  @ApiProperty({ description: '请求ID' })
  id: string;

  @ApiProperty({ description: '请求类型', enum: AiRequestType })
  requestType: AiRequestType;

  @ApiProperty({ description: '请求状态', enum: AiRequestStatus })
  status: AiRequestStatus;

  @ApiProperty({ description: '优先级', enum: AiRequestPriority })
  priority: AiRequestPriority;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiPropertyOptional({ description: '会话ID' })
  sessionId?: string;

  @ApiProperty({ description: '输入数据' })
  inputData: any;

  @ApiPropertyOptional({ description: '模型配置' })
  modelConfig?: any;

  @ApiPropertyOptional({ description: '错误信息' })
  errorMessage?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'AI响应' })
  response?: any;
}

export class AiRequestListResponseDto {
  @ApiProperty({ description: '请求列表', type: [AiRequestResponseDto] })
  items: AiRequestResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}