import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { RefundService } from './refund.service';
import type {
  CreateRefundDto,
  RefundQueryDto,
  ProcessRefundDto,
} from './refund.service';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * 创建退款申请
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Body() createRefundDto: CreateRefundDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    const requestId = req.get('X-Request-ID');
    const sessionId = req.get('X-Session-ID');

    return await this.refundService.createRefund({
      ...createRefundDto,
      ipAddress,
      userAgent,
      requestId,
      sessionId,
    });
  }

  /**
   * 获取退款列表
   */
  @Get()
  async getRefunds(@Query() queryDto: RefundQueryDto) {
    return await this.refundService.getRefunds(queryDto);
  }

  /**
   * 获取退款详情
   */
  @Get(':id')
  async getRefundById(@Param('id', ParseIntPipe) id: number) {
    return await this.refundService.getRefundById(id);
  }

  /**
   * 处理退款
   */
  @Put(':id/process')
  async processRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() processRefundDto: Omit<ProcessRefundDto, 'refundId'>,
  ) {
    return await this.refundService.processRefund({
      refundId: id,
      ...processRefundDto,
    });
  }

  /**
   * 重试退款
   */
  @Put(':id/retry')
  async retryRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body('processedBy', ParseIntPipe) processedBy: number,
  ) {
    return await this.refundService.retryRefund(id, processedBy);
  }

  /**
   * 取消退款
   */
  @Put(':id/cancel')
  async cancelRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Body('cancelledBy', ParseIntPipe) cancelledBy: number,
  ) {
    return await this.refundService.cancelRefund(id, reason, cancelledBy);
  }

  /**
   * 获取退款统计
   */
  @Get('stats/overview')
  async getRefundStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.refundService.getRefundStats(start, end);
  }

  /**
   * 退款对账
   */
  @Post('reconcile')
  async reconcileRefunds(
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return await this.refundService.reconcileRefunds(start, end);
  }
}