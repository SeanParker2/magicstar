import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  REVENUE = 'revenue',
  PAYMENT = 'payment',
  REFUND = 'refund',
  USER_SPENDING = 'user_spending',
  PRODUCT_SALES = 'product_sales',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, description: '报表类型' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: '开始日期' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '报表标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '报表描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ReportType, description: '报表类型' })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

export class ExportReportDto {
  @ApiProperty({ description: '报表ID' })
  @IsString()
  reportId: string;

  @ApiProperty({ enum: ExportFormat, description: '导出格式' })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ description: '是否包含图表' })
  @IsOptional()
  includeCharts?: boolean = true;

  @ApiPropertyOptional({ description: '是否包含详细数据' })
  @IsOptional()
  includeDetails?: boolean = true;
}