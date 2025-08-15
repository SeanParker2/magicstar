import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { PaymentService } from '../services/payment.service';
import { PaymentSecurityService } from '../services/payment-security.service';
import { PaymentLoggerService } from '../services/payment-logger.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto, RefundDto } from '../dto/payment-query.dto';
import { PaymentMethod } from '../entities/payment.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('支付管理')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentSecurityService: PaymentSecurityService,
    private readonly paymentLoggerService: PaymentLoggerService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建支付订单' })
  @ApiResponse({ status: 201, description: '支付订单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const startTime = Date.now();
    try {
      const userId = req.user.id;
      
      const result = await this.paymentService.createPayment({
        ...createPaymentDto,
        userId,
      });

      // 记录支付创建请求
      await this.paymentLoggerService.logPaymentCreation({
        paymentNo: result.paymentNo,
        userId,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        orderId: createPaymentDto.orderId,
        clientIp,
        userAgent,
        requestData: createPaymentDto,
        responseData: result,
        processingTime: Date.now() - startTime,
        additionalInfo: {
          userRole: req.user.role,
          requestId: req.headers['x-request-id']
        }
      });

      // 记录性能监控
      const processingTime = Date.now() - startTime;
      await this.paymentLoggerService.logPerformanceMetrics(
        'createPayment',
        createPaymentDto.paymentMethod,
        processingTime,
        true
      );

      return {
        code: 200,
        message: '支付订单创建成功',
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录错误日志
      await this.paymentLoggerService.logPaymentCreation({
        paymentNo: 'error-' + Date.now(),
        userId: req.user?.id,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        orderId: createPaymentDto.orderId,
        clientIp,
        userAgent,
        requestData: createPaymentDto,
        errorMessage: error.message,
        processingTime,
        additionalInfo: {
          error: error.stack,
          userRole: req.user?.role
        }
      });

      // 记录性能监控（失败情况）
      await this.paymentLoggerService.logPerformanceMetrics(
        'createPayment',
        createPaymentDto.paymentMethod,
        processingTime,
        false,
        { error: error.message }
      );

      this.logger.error(`创建支付订单失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('query/:paymentNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询支付状态' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '支付记录不存在' })
  async queryPayment(
    @Param('paymentNo') paymentNo: string,
    @Request() req: any,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const startTime = Date.now();
    try {
      const payment = await this.paymentService.queryPayment(paymentNo);

      // 记录查询日志
      const processingTime = Date.now() - startTime;
      await this.paymentLoggerService.logPaymentQuery({
        paymentNo,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        userId: req.user.id,
        clientIp,
        userAgent,
        responseData: payment,
        processingTime,
        additionalInfo: {
          userRole: req.user.role,
          queryType: 'status'
        }
      });

      return {
        code: 200,
        message: '查询成功',
        data: payment,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录错误日志
      await this.paymentLoggerService.logPaymentQuery({
        paymentNo,
        paymentMethod: PaymentMethod.ALIPAY, // 默认值，实际查询失败时无法获取
        amount: 0,
        userId: req.user?.id,
        clientIp,
        userAgent,
        errorMessage: error.message,
        processingTime,
        additionalInfo: {
          error: error.stack,
          userRole: req.user?.role
        }
      });

      this.logger.error(`查询支付状态失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询支付列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getPaymentList(
    @Query() queryDto: PaymentQueryDto,
    @Request() req: any,
  ) {
    try {
      // 普通用户只能查询自己的支付记录
      if (req.user.role !== 'admin') {
        queryDto.userId = req.user.id;
      }

      const result = await this.paymentService.findPayments(queryDto);

      return {
        code: 200,
        message: '查询成功',
        data: {
          list: result.data,
          total: result.total,
          page: queryDto.page || 1,
          limit: queryDto.limit || 10,
        },
      };
    } catch (error) {
      this.logger.error(`查询支付列表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({ status: 200, description: '退款申请成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async refund(
    @Body() refundDto: RefundDto,
    @Request() req: any,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const startTime = Date.now();
    try {
      const result = await this.paymentService.refund(refundDto);

      // 记录退款日志
      const processingTime = Date.now() - startTime;
      await this.paymentLoggerService.logRefund({
        paymentNo: result.refundNo || 'unknown',
        paymentMethod: PaymentMethod.ALIPAY, // 从支付记录中获取
        amount: refundDto.refundAmount,
        userId: req.user.id,
        clientIp,
        userAgent,
        requestData: refundDto,
        responseData: result,
        processingTime,
        additionalInfo: {
          userRole: req.user.role,
          refundReason: refundDto.refundReason,
          paymentId: refundDto.paymentId
        }
      });

      return {
        code: 200,
        message: '退款申请成功',
        data: result,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录错误日志
      await this.paymentLoggerService.logRefund({
        paymentNo: 'refund-error-' + Date.now(),
        paymentMethod: PaymentMethod.ALIPAY, // 默认值
        amount: refundDto.refundAmount,
        userId: req.user?.id,
        clientIp,
        userAgent,
        requestData: refundDto,
        errorMessage: error.message,
        processingTime,
        additionalInfo: {
          error: error.stack,
          userRole: req.user?.role,
          paymentId: refundDto.paymentId
        }
      });

      this.logger.error(`申请退款失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取支付统计信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStatistics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const statistics = await this.paymentService.getPaymentStatistics(startTime, endTime);

      return {
        code: 200,
        message: '查询成功',
        data: statistics,
      };
    } catch (error) {
      this.logger.error(`获取支付统计失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}