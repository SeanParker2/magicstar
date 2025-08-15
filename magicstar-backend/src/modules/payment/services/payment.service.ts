import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, PaymentMethod, PaymentType } from '../entities/payment.entity';
import { PaymentRecord, PaymentRecordStatus } from '../entities/payment-record.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentCallbackDto } from '../dto/payment-query.dto';
import { RefundDto } from '../dto/payment-query.dto';
import { WechatPaymentService } from './wechat-payment.service';
import { AlipayService } from './alipay.service';
import { PaymentSecurityService } from './payment-security.service';
import { PaymentLoggerService } from './payment-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  // 临时内存存储，用于开发测试
  private payments: Payment[] = [];
  private paymentRecords: PaymentRecord[] = [];

  constructor(
    private readonly wechatPaymentService: WechatPaymentService,
    private readonly alipayService: AlipayService,
    private readonly configService: ConfigService,
    private readonly paymentSecurityService: PaymentSecurityService,
    private readonly paymentLoggerService: PaymentLoggerService,
  ) {}

  /**
   * 创建支付订单
   */
  async createPayment(createPaymentDto: CreatePaymentDto & { userId: string }) {
    const startTime = Date.now();
    this.logger.log(`创建支付订单: ${JSON.stringify(createPaymentDto)}`);

    const { userId, ...paymentData } = createPaymentDto;
    
    try {
      // 检查重复支付
      const paymentNo = this.generatePaymentNo();
      if (this.paymentSecurityService.checkDuplicatePayment(paymentNo, paymentData.amount)) {
        throw new BadRequestException('检测到重复支付请求');
      }

      // 创建支付记录
      const payment = {
        id: uuidv4(),
        paymentNo,
        userId,
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'CNY',
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType || PaymentType.ORDER,
        status: PaymentStatus.PENDING,
        description: paymentData.description || '',
        transactionId: null,
        outTradeNo: null,
        fee: 0,
        actualAmount: paymentData.amount,
        paidAt: null,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        failureReason: null,
        refundedAmount: 0,
        refundReason: null,
        refundedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Payment;

      // 保存到内存
      this.payments.push(payment);

      // 记录支付创建日志
      await this.paymentLoggerService.logPaymentCreation({
        paymentNo,
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
        userId,
        orderId: paymentData.orderId,
        additionalInfo: { paymentId: payment.id }
      });

      // 根据支付方式调用相应的支付服务
      let paymentResult;
      try {
        switch (paymentData.paymentMethod) {
          case PaymentMethod.WECHAT_PAY:
            // paymentResult = await this.wechatPaymentService.createPayment(paymentData as any);
            paymentResult = { paymentUrl: 'mock://wechat-pay-url', qrCode: 'mock-qr-code' };
            break;
          case PaymentMethod.ALIPAY:
            // paymentResult = await this.alipayService.createPayment(paymentData as any);
            paymentResult = { paymentUrl: 'mock://alipay-url', qrCode: 'mock-qr-code' };
            break;
          default:
            throw new BadRequestException('不支持的支付方式');
        }

        // 记录性能监控
        const processingTime = Date.now() - startTime;
        await this.paymentLoggerService.logPerformanceMetrics(
          'createPayment',
          paymentData.paymentMethod,
          processingTime,
          true
        );

        return {
          paymentId: payment.id,
          paymentNo: payment.paymentNo,
          ...paymentResult,
        };
      } catch (error) {
        // 支付创建失败，更新状态
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = error.message;

        // 记录错误日志
        await this.paymentLoggerService.logPaymentCreation({
          paymentNo,
          paymentMethod: paymentData.paymentMethod,
          amount: paymentData.amount,
          userId,
          orderId: paymentData.orderId,
          errorMessage: error.message,
          additionalInfo: { paymentId: payment.id }
        });

        throw error;
      }
    } catch (error) {
      // 记录性能监控（失败情况）
      const processingTime = Date.now() - startTime;
      await this.paymentLoggerService.logPerformanceMetrics(
        'createPayment',
        paymentData.paymentMethod,
        processingTime,
        false,
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(
    paymentMethod: PaymentMethod,
    callbackData: any,
    clientIp?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    this.logger.log(`处理支付回调: ${paymentMethod}`, callbackData);

    try {
      // IP白名单验证
      if (clientIp && !this.paymentSecurityService.validateIpWhitelist(clientIp, paymentMethod)) {
        await this.paymentSecurityService.logSecurityEvent(
          'ip_whitelist_violation',
          callbackData.out_trade_no || 'unknown',
          { clientIp, paymentMethod, callbackData },
          'high'
        );
        throw new BadRequestException('IP地址不在白名单中');
      }

      let paymentNo: string;
      let transactionId: string;
      let amount: number;
      let status: string;
      let signature: string;

      // 根据支付方式解析回调数据
      if (paymentMethod === PaymentMethod.WECHAT_PAY) {
        // 微信支付回调数据解析
        paymentNo = callbackData.out_trade_no;
        transactionId = callbackData.transaction_id;
        amount = parseFloat(callbackData.total_fee) / 100; // 微信金额单位是分
        status = callbackData.result_code === 'SUCCESS' ? 'success' : 'failed';
        signature = callbackData.sign;
      } else if (paymentMethod === PaymentMethod.ALIPAY) {
        // 支付宝回调数据解析
        paymentNo = callbackData.out_trade_no;
        transactionId = callbackData.trade_no;
        amount = parseFloat(callbackData.total_amount);
        status = callbackData.trade_status === 'TRADE_SUCCESS' ? 'success' : 'failed';
        signature = callbackData.sign;
      } else {
        throw new BadRequestException('不支持的支付方式');
      }

      // 签名验证
      if (!this.paymentSecurityService.verifyPaymentSignature(paymentMethod, callbackData, signature)) {
        await this.paymentSecurityService.logSecurityEvent(
          'signature_verification_failed',
          paymentNo,
          { paymentMethod, callbackData, clientIp },
          'high'
        );
        throw new BadRequestException('签名验证失败');
      }

      // 查找支付记录
      const payment = this.payments.find(p => p.paymentNo === paymentNo);
      if (!payment) {
        await this.paymentLoggerService.logSecurityException(
          paymentNo,
          'payment_not_found',
          { paymentMethod, callbackData, clientIp },
          'medium'
        );
        throw new NotFoundException('支付记录不存在');
      }

      // 验证金额
      if (!this.paymentSecurityService.validatePaymentAmount(payment.amount, amount)) {
        await this.paymentSecurityService.logSecurityEvent(
          'amount_mismatch',
          paymentNo,
          { 
            originalAmount: payment.amount, 
            callbackAmount: amount, 
            paymentMethod, 
            clientIp 
          },
          'high'
        );
        throw new BadRequestException('支付金额不匹配');
      }

      // 验证支付时间窗口
      if (!this.paymentSecurityService.validatePaymentTimeWindow(payment.createdAt, new Date())) {
        await this.paymentSecurityService.logSecurityEvent(
          'payment_time_window_violation',
          paymentNo,
          { 
            paymentCreatedAt: payment.createdAt, 
            callbackTime: new Date(), 
            paymentMethod, 
            clientIp 
          },
          'medium'
        );
        throw new BadRequestException('支付时间窗口验证失败');
      }

      // 检查重复回调
      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.warn(`重复的支付成功回调: ${paymentNo}`);
        return {
          success: true,
          message: '重复回调，支付已成功'
        };
      }

      // 更新支付状态
      if (status === 'success') {
        payment.status = PaymentStatus.SUCCESS;
        payment.transactionId = transactionId;
        payment.paidAt = new Date();
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = '支付失败';
      }

      payment.updatedAt = new Date();

      // 记录支付通知日志
      const processingTime = Date.now() - startTime;
      await this.paymentLoggerService.logPaymentNotification({
        paymentNo,
        paymentMethod,
        amount,
        userId: payment.userId,
        orderId: payment.orderId,
        clientIp,
        userAgent,
        requestData: callbackData,
        responseData: { status: payment.status },
        processingTime,
        additionalInfo: { paymentId: payment.id }
      });

      // 记录性能监控
      await this.paymentLoggerService.logPerformanceMetrics(
        'handlePaymentCallback',
        paymentMethod,
        processingTime,
        true
      );

      this.logger.log(`支付回调处理完成: ${paymentNo}, 状态: ${payment.status}`);

      return {
        success: true,
        message: '回调处理成功'
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录错误日志
      await this.paymentLoggerService.logPaymentNotification({
        paymentNo: callbackData.out_trade_no || 'unknown',
        paymentMethod,
        amount: 0,
        clientIp,
        userAgent,
        requestData: callbackData,
        errorMessage: error.message,
        processingTime,
        additionalInfo: { error: error.stack }
      });

      // 记录性能监控（失败情况）
      await this.paymentLoggerService.logPerformanceMetrics(
        'handlePaymentCallback',
        paymentMethod,
        processingTime,
        false,
        { error: error.message }
      );

      this.logger.error(`支付回调处理失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 查询支付状态
   */
  async getPaymentStatus(paymentId: string) {
    this.logger.log(`查询支付状态: ${paymentId}`);

    const payment = this.payments.find(p => p.id === paymentId);
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    return {
      paymentId: payment.id,
      paymentNo: payment.paymentNo,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * 查询支付列表
   */
  async getPaymentList(queryDto: PaymentQueryDto) {
    this.logger.log(`查询支付列表: ${JSON.stringify(queryDto)}`);

    // 模拟分页查询
    const { page = 1, limit = 20 } = queryDto;
    const offset = (page - 1) * limit;
    
    let filteredPayments = [...this.payments];
    
    // 简单过滤
    if (queryDto.userId) {
      filteredPayments = filteredPayments.filter(p => p.userId === queryDto.userId);
    }
    if (queryDto.status) {
      filteredPayments = filteredPayments.filter(p => p.status === queryDto.status);
    }
    if (queryDto.paymentMethod) {
      filteredPayments = filteredPayments.filter(p => p.paymentMethod === queryDto.paymentMethod);
    }

    const total = filteredPayments.length;
    const items = filteredPayments.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 申请退款
   */
  async requestRefund(refundDto: RefundDto) {
    this.logger.log(`申请退款: ${JSON.stringify(refundDto)}`);

    const payment = this.payments.find(p => p.id === refundDto.paymentId);
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('只有支付成功的订单才能申请退款');
    }

    // 模拟退款处理
    const refundResult = {
      refundId: uuidv4(),
      refundNo: this.generateRefundNo(),
      status: 'processing',
      refundAmount: refundDto.refundAmount,
    };

    return refundResult;
  }

  /**
   * 获取支付统计
   */
  async getPaymentStatistics(startDate?: string, endDate?: string) {
    this.logger.log(`获取支付统计: ${startDate} - ${endDate}`);

    // 模拟统计数据
    return {
      totalAmount: 10000.00,
      totalCount: 100,
      successAmount: 9500.00,
      successCount: 95,
      refundAmount: 500.00,
      refundCount: 5,
      successRate: 0.95,
    };
  }

  /**
   * 查询支付记录
   */
  async queryPayment(paymentNo: string) {
    this.logger.log(`查询支付记录: ${paymentNo}`);
    
    const payment = this.payments.find(p => p.paymentNo === paymentNo);
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }
    return payment;
  }

  /**
   * 查找支付记录
   */
  async findPayments(queryDto: any) {
    this.logger.log(`查找支付记录: ${JSON.stringify(queryDto)}`);
    
    const { page = 1, limit = 10 } = queryDto;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: this.payments.slice(start, end),
      total: this.payments.length,
      page,
      limit,
    };
  }

  /**
   * 退款处理
   */
  async refund(refundDto: any) {
    this.logger.log(`退款处理: ${JSON.stringify(refundDto)}`);
    
    const { paymentNo, amount, reason } = refundDto;
    const payment = this.payments.find(p => p.paymentNo === paymentNo);
    
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }
    
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('支付未成功，无法退款');
    }
    
    // 更新支付记录
    payment.refundedAmount = amount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    
    return {
      success: true,
      refundNo: `RF${Date.now()}`,
      amount,
      message: '退款处理成功',
    };
  }

  /**
   * 处理回调
   */
  async handleCallback(provider: string, data: any) {
    this.logger.log(`处理回调: ${provider}, ${JSON.stringify(data)}`);
    
    const { paymentNo, status, transactionId } = data;
    const payment = this.payments.find(p => p.paymentNo === paymentNo);
    
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }
    
    // 更新支付状态
     payment.status = status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
     payment.transactionId = transactionId;
     (payment as any).paidAt = status === 'SUCCESS' ? new Date() : null;
     payment.updatedAt = new Date();
    
    return {
      success: true,
      message: '回调处理成功',
    };
  }

  /**
   * 处理退款回调
   */
  async handleRefundCallback(
    paymentMethod: PaymentMethod,
    callbackData: any,
    clientIp?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    this.logger.log(`处理退款回调: ${paymentMethod}`, callbackData);

    try {
      // IP白名单验证
      if (clientIp && !this.paymentSecurityService.validateIpWhitelist(clientIp, paymentMethod)) {
        await this.paymentSecurityService.logSecurityEvent(
          'refund_ip_whitelist_violation',
          callbackData.out_trade_no || 'unknown',
          { clientIp, paymentMethod, callbackData },
          'high'
        );
        throw new BadRequestException('IP地址不在白名单中');
      }

      let paymentNo: string;
      let refundId: string;
      let refundAmount: number;
      let refundStatus: string;
      let signature: string;

      // 根据支付方式解析回调数据
      if (paymentMethod === PaymentMethod.WECHAT_PAY) {
        paymentNo = callbackData.out_trade_no;
        refundId = callbackData.out_refund_no;
        refundAmount = parseFloat(callbackData.refund_fee) / 100;
        refundStatus = callbackData.refund_status;
        signature = callbackData.sign;
      } else if (paymentMethod === PaymentMethod.ALIPAY) {
        paymentNo = callbackData.out_trade_no;
        refundId = callbackData.out_biz_no;
        refundAmount = parseFloat(callbackData.refund_amount);
        refundStatus = callbackData.refund_status;
        signature = callbackData.sign;
      } else {
        throw new BadRequestException('不支持的支付方式');
      }

      // 签名验证
      if (!this.paymentSecurityService.verifyPaymentSignature(paymentMethod, callbackData, signature)) {
        await this.paymentSecurityService.logSecurityEvent(
          'refund_signature_verification_failed',
          paymentNo,
          { paymentMethod, callbackData, clientIp },
          'high'
        );
        throw new BadRequestException('退款回调签名验证失败');
      }

      // 查找支付记录
      const payment = this.payments.find(p => p.paymentNo === paymentNo);
      if (!payment) {
        await this.paymentLoggerService.logSecurityException(
          paymentNo,
          'refund_payment_not_found',
          { paymentMethod, callbackData, clientIp },
          'medium'
        );
        throw new NotFoundException('支付记录不存在');
      }

      // 验证退款金额
      const totalRefundAmount = payment.refundedAmount + refundAmount;
      if (totalRefundAmount > payment.amount + 0.01) { // 允许1分钱误差
        await this.paymentSecurityService.logSecurityEvent(
          'refund_amount_exceeded',
          paymentNo,
          { 
            originalAmount: payment.amount,
            currentRefunded: payment.refundedAmount,
            requestRefund: refundAmount,
            totalRefund: totalRefundAmount,
            paymentMethod, 
            clientIp 
          },
          'high'
        );
        throw new BadRequestException('退款金额超过支付金额');
      }

      // 更新退款状态
      if (refundStatus === 'SUCCESS') {
        payment.refundedAmount += refundAmount;
        payment.refundedAt = new Date();
        
        if (payment.refundedAmount >= payment.amount - 0.01) { // 允许1分钱误差
          payment.status = PaymentStatus.REFUNDED;
        } else {
          payment.status = PaymentStatus.PARTIAL_REFUNDED;
        }
      }

      payment.updatedAt = new Date();

      // 记录退款日志
      const processingTime = Date.now() - startTime;
      await this.paymentLoggerService.logRefund({
        paymentNo,
        paymentMethod,
        amount: refundAmount,
        userId: payment.userId,
        orderId: payment.orderId,
        clientIp,
        userAgent,
        requestData: callbackData,
        responseData: { 
          refundStatus: payment.status,
          totalRefunded: payment.refundedAmount 
        },
        processingTime,
        additionalInfo: { 
          paymentId: payment.id,
          refundId 
        }
      });

      // 记录性能监控
      await this.paymentLoggerService.logPerformanceMetrics(
        'handleRefundCallback',
        paymentMethod,
        processingTime,
        true
      );

      this.logger.log(`退款回调处理完成: ${paymentNo}, 退款金额: ${refundAmount}`);

      return {
        success: true,
        message: '退款回调处理成功'
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录错误日志
      await this.paymentLoggerService.logRefund({
        paymentNo: callbackData.out_trade_no || 'unknown',
        paymentMethod,
        amount: 0,
        clientIp,
        userAgent,
        requestData: callbackData,
        errorMessage: error.message,
        processingTime,
        additionalInfo: { error: error.stack }
      });

      // 记录性能监控（失败情况）
      await this.paymentLoggerService.logPerformanceMetrics(
        'handleRefundCallback',
        paymentMethod,
        processingTime,
        false,
        { error: error.message }
      );

      this.logger.error(`退款回调处理失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 生成支付单号
   */
  private generatePaymentNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY${timestamp}${random}`;
  }

  /**
   * 生成退款单号
   */
  private generateRefundNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REF${timestamp}${random}`;
  }
}