import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportService } from '../services/report.service';
import {
  GenerateDailyReportDto,
  GenerateMonthlyReportDto,
  GenerateChannelReportDto,
  GenerateUserReportDto,
  ExportReportDto,
  DailyReportDto,
  MonthlyReportDto,
  ChannelReportDto,
  PaymentChannelReportDto,
  UserReportDto,
} from '../dto/report.dto';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('财务报表')
@Controller('finance/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('daily')
  @ApiOperation({ summary: '生成日报' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '日报生成成功',
    type: DailyReportDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async generateDailyReport(
    @Body() generateDto: GenerateDailyReportDto,
  ): Promise<DailyReportDto> {
    return this.reportService.generateDailyReport(generateDto.date);
  }

  @Post('monthly')
  @ApiOperation({ summary: '生成月报' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '月报生成成功',
    type: MonthlyReportDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async generateMonthlyReport(
    @Body() generateDto: GenerateMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    return this.reportService.generateMonthlyReport(generateDto.year, generateDto.month);
  }

  @Post('channel')
  @ApiOperation({ summary: '生成支付渠道报表' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '支付渠道报表生成成功',
    type: [PaymentChannelReportDto],
  })
  @HttpCode(HttpStatus.CREATED)
  async generateChannelReport(
    @Body() generateDto: GenerateChannelReportDto,
  ): Promise<PaymentChannelReportDto[]> {
    return this.reportService.generatePaymentChannelReport(generateDto.startDate, generateDto.endDate);
  }

  @Post('user')
  @ApiOperation({ summary: '生成用户报表' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '用户报表生成成功',
    type: UserReportDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async generateUserReport(
    @Body() generateDto: GenerateUserReportDto,
  ): Promise<UserReportDto[]> {
    return this.reportService.generateUserReport(generateDto.startDate, generateDto.endDate, generateDto.limit);
  }

  @Post('export')
  @ApiOperation({ summary: '导出报表' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '报表导出成功',
  })
  @HttpCode(HttpStatus.CREATED)
  async exportReport(
    @Body() exportDto: ExportReportDto,
  ): Promise<{ filePath: string; fileName: string }> {
    return this.reportService.exportReport('daily', {});
  }

  @Get('download/:fileName')
  @ApiOperation({ summary: '下载报表文件' })
  @ApiParam({ name: 'fileName', description: '文件名' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '文件下载成功',
  })
  async downloadReport(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const filePath = await this.reportService.getReportFile(fileName);
      
      if (!fs.existsSync(filePath)) {
        res.status(HttpStatus.NOT_FOUND).json({
          message: '文件不存在',
        });
        return;
      }

      const stat = fs.statSync(filePath);
      const fileExtension = path.extname(fileName).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (fileExtension === '.xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileExtension === '.csv') {
        contentType = 'text/csv';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: '文件下载失败',
        error: error.message,
      });
    }
  }

  @Get('list')
  @ApiOperation({ summary: '获取报表列表' })
  @ApiQuery({ name: 'type', required: false, description: '报表类型' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '报表列表获取成功',
  })
  async getReportList(
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    reports: Array<{
      fileName: string;
      type: string;
      createdAt: Date;
      size: number;
    }>;
    total: number;
  }> {
    // 模拟报表列表
    const reports = [
      {
        fileName: '日报_2024-01-15.xlsx',
        type: 'daily',
        createdAt: new Date('2024-01-15'),
        size: 1024 * 50, // 50KB
      },
      {
        fileName: '月报_2024-01.xlsx',
        type: 'monthly',
        createdAt: new Date('2024-01-31'),
        size: 1024 * 200, // 200KB
      },
    ];

    let filteredReports = reports;
    
    if (type) {
      filteredReports = filteredReports.filter(report => report.type === type);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredReports = filteredReports.filter(report => report.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredReports = filteredReports.filter(report => report.createdAt <= end);
    }

    return {
      reports: filteredReports,
      total: filteredReports.length,
    };
  }
}