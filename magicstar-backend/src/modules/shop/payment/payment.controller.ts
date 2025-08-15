import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentService, CreatePaymentDto, PaymentCallbackData } from './payment.service';
import { PaymentSecurityService, PaymentSecurityContext } from './payment-security.service';
import { Payment, PaymentStatus } from '../entities/payment.entity';

export interface CreatePaymentRequest {
  orderId: number;
  amount: number;
  currency?: string;
  paymentMethod: string;
  paymentType?: string;
  description?: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface PaymentCallbackRequest {
  transactionId: string;
  gatewayTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  signature: string;
  [key: string]: any;
}

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentSecurityService: PaymentSecurityService,
  ) {}

  /**
   * 创建支付订单
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Body() createPaymentRequest: CreatePaymentRequest,
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const context: PaymentSecurityContext = {
        userId,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID'),
        sessionId: req.get('X-Session-ID'),
      };

      const createPaymentDto: CreatePaymentDto = {
        orderId: createPaymentRequest.orderId,
        amount: createPaymentRequest.amount,
        currency: createPaymentRequest.currency || 'CNY',
        paymentMethod: createPaymentRequest.paymentMethod as any,
        paymentType: (createPaymentRequest.paymentType as any) || 'payment',
        description: createPaymentRequest.description,
        returnUrl: createPaymentRequest.returnUrl,
        notifyUrl: createPaymentRequest.notifyUrl,
      };

      const payment = await this.paymentService.createPayment(createPaymentDto, context);

      return {
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paymentMethod: payment.payment_method,
          createdAt: payment.created_at,
        },
        message: 'Payment created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create payment', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create payment',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 处理支付回调
   */
  @Post('callback/:provider')
  async handlePaymentCallback(
    @Param('provider') provider: string,
    @Body() callbackRequest: PaymentCallbackRequest,
    @Req() req: Request,
  ) {
    try {
      const context: PaymentSecurityContext = {
        userId: 0, // 回调时可能没有用户信息
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID'),
        sessionId: req.get('X-Session-ID'),
      };

      const callbackData: PaymentCallbackData = {
        transactionId: callbackRequest.transactionId,
        gatewayTransactionId: callbackRequest.gatewayTransactionId,
        status: callbackRequest.status as PaymentStatus,
        amount: callbackRequest.amount,
        currency: callbackRequest.currency,
        signature: callbackRequest.signature,
        rawData: callbackRequest,
      };

      const payment = await this.paymentService.handlePaymentCallback(callbackData, context);

      return {
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          status: payment.status,
        },
        message: 'Payment callback processed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to process ${provider} payment callback`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to process payment callback',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询支付状态
   */
  @Get(':transactionId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Param('transactionId') transactionId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const context: PaymentSecurityContext = {
        userId,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID'),
        sessionId: req.get('X-Session-ID'),
      };

      const result = await this.paymentService.queryPaymentStatus(transactionId, context);

      return {
        success: true,
        data: {
          paymentId: result.payment.id,
          transactionId: result.payment.transaction_id,
          orderId: result.payment.order_id,
          amount: result.payment.amount,
          currency: result.payment.currency,
          status: result.payment.status,
          paymentMethod: result.payment.payment_method,
          gatewayTransactionId: result.payment.gateway_transaction_id,
          createdAt: result.payment.created_at,
          updatedAt: result.payment.updated_at,
          gatewayStatus: result.gatewayStatus,
          gatewayData: result.gatewayData,
        },
        message: 'Payment status retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get payment status', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get payment status',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 取消支付
   */
  @Put(':transactionId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelPayment(
    @Param('transactionId') transactionId: string,
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const context: PaymentSecurityContext = {
        userId,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID'),
        sessionId: req.get('X-Session-ID'),
      };

      const payment = await this.paymentService.cancelPayment(transactionId, context);

      return {
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          status: payment.status,
          updatedAt: payment.updated_at,
        },
        message: 'Payment cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Failed to cancel payment', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to cancel payment',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取用户支付历史
   */
  @Get('user/history')
  @UseGuards(JwtAuthGuard)
  async getUserPaymentHistory(
    @Query() query: PaymentQueryParams,
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100); // 限制最大返回数量

      const result = await this.paymentService.getUserPaymentHistory(userId, page, limit);

      return {
        success: true,
        data: {
          payments: result.payments.map(payment => ({
            paymentId: payment.id,
            transactionId: payment.transaction_id,
            orderId: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.payment_method,
            gatewayTransactionId: payment.gateway_transaction_id,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at,
            order: payment.order ? {
              id: payment.order.id,
              status: payment.order.status,
              totalAmount: payment.order.total_amount,
            } : null,
          })),
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
        },
        message: 'Payment history retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get payment history', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get payment history',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 处理退款
   */
  @Post(':transactionId/refund')
  @UseGuards(JwtAuthGuard)
  async processRefund(
    @Param('transactionId') transactionId: string,
    @Body() refundRequest: { amount: number; reason: string },
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const context: PaymentSecurityContext = {
        userId,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID'),
        sessionId: req.get('X-Session-ID'),
      };

      const payment = await this.paymentService.processRefund(
        transactionId,
        refundRequest.amount,
        refundRequest.reason,
        context,
      );

      return {
        success: true,
        data: {
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          refundedAmount: payment.refunded_amount,
          status: payment.status,
          updatedAt: payment.updated_at,
        },
        message: 'Refund processed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to process refund', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to process refund',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取支付统计信息（管理员接口）
   */
  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
  ) {
    try {
      // 这里应该添加管理员权限检查
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const statistics = await this.paymentService.getPaymentStatistics(start, end);

      return {
        success: true,
        data: statistics,
        message: 'Payment statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get payment statistics', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get payment statistics',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 生成安全的交易ID
   */
  @Post('generate-transaction-id')
  @UseGuards(JwtAuthGuard)
  async generateTransactionId() {
    try {
      const transactionId = this.paymentSecurityService.generateSecureTransactionId();

      return {
        success: true,
        data: { transactionId },
        message: 'Transaction ID generated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to generate transaction ID', error.stack);
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate transaction ID',
          error: error.name,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取客户端IP地址
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      ''
    );
  }
}