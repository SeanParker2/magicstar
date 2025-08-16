import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, PaymentMethod, PaymentType } from '../entities/payment.entity';
import { PaymentRecord, PaymentRecordStatus, PaymentRecordType } from '../entities/payment-record.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentCallbackDto } from '../dto/payment-query.dto';
import { RefundDto } from '../dto/payment-query.dto';
import { WechatPaymentService } from './wechat-payment.service';
import { AlipayService } from './alipay.service';
import { PaymentSecurityService } from './payment-security.service';
import { PaymentLoggerService } from './payment-logger.service';
import { PrometheusService } from '../../monitoring/services/prometheus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentRecord)
    private readonly paymentRecordRepository: Repository<PaymentRecord>,
    private readonly dataSource: DataSource,
    private readonly wechatPaymentService: WechatPaymentService,
    private readonly alipayService: AlipayService,
    private readonly configService: ConfigService,
    private readonly paymentSecurityService: PaymentSecurityService,
    private readonly paymentLoggerService: PaymentLoggerService,
    private readonly prometheusService: PrometheusService,
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
      const payment = new Payment();
      payment.paymentNo = paymentNo;
      payment.userId = userId;
      payment.orderId = paymentData.orderId;
      payment.amount = paymentData.amount;
      payment.currency = paymentData.currency || 'CNY';
      payment.paymentMethod = paymentData.paymentMethod;
      payment.paymentType = paymentData.paymentType || PaymentType.ORDER;
      payment.status = PaymentStatus.PENDING;
      payment.description = paymentData.description || '';
      // 可选字段不需要显式设置，TypeORM会处理
      payment.fee = 0;
      payment.actualAmount = paymentData.amount;
      payment.expiredAt = new Date(Date.now() + 30 * 60 * 1000);
      payment.refundedAmount = 0;

      // 保存到数据库
      const savedPayment = await this.paymentRepository.save(payment);

      // 记录支付创建日志
      await this.paymentLoggerService.logPaymentCreation({
        paymentNo,
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
        userId,
        orderId: paymentData.orderId,
        additionalInfo: { paymentId: savedPayment.id }
      });

      // 根据支付方式调用相应的支付服务
      let paymentResult;
      try {
        switch (paymentData.paymentMethod) {
          case PaymentMethod.WECHAT_PAY:
            paymentResult = await this.wechatPaymentService.createPayment(savedPayment, {
              paymentId: savedPayment.id,
              tradeType: paymentData.paymentParams?.tradeType || 'JSAPI',
              openid: paymentData.paymentParams?.openid,
            });
            break;
          case PaymentMethod.ALIPAY:
            paymentResult = await this.alipayService.createPayment(savedPayment, {
              paymentId: savedPayment.id,
              productCode: paymentData.paymentParams?.productCode || 'QUICK_MSECURITY_PAY',
            });
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

        // 记录Prometheus指标
        this.prometheusService.recordPaymentRequest(paymentData.paymentMethod, 'success');

        return {
          paymentId: savedPayment.id,
          paymentNo: savedPayment.paymentNo,
          ...paymentResult,
        };
      } catch (error) {
        // 支付创建失败，更新状态
        savedPayment.status = PaymentStatus.FAILED;
        savedPayment.failureReason = error.message;
        
        // 记录Prometheus指标
        this.prometheusService.recordPaymentRequest(paymentData.paymentMethod, 'failed');
        await this.paymentRepository.save(savedPayment);

        // 记录错误日志
        await this.paymentLoggerService.logPaymentCreation({
          paymentNo,
          paymentMethod: paymentData.paymentMethod,
          amount: paymentData.amount,
          userId,
          orderId: paymentData.orderId,
          errorMessage: error.message,
          additionalInfo: { paymentId: savedPayment.id }
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
      const payment = await this.paymentRepository.findOne({ where: { paymentNo } });
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

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
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

    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');
    
    // 应用过滤条件
    if (queryDto.userId) {
      queryBuilder.andWhere('payment.userId = :userId', { userId: queryDto.userId });
    }
    if (queryDto.status) {
      queryBuilder.andWhere('payment.status = :status', { status: queryDto.status });
    }
    if (queryDto.paymentMethod) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod: queryDto.paymentMethod });
    }

    // 分页
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const offset = (page - 1) * limit;
    
    queryBuilder.skip(offset).take(limit).orderBy('payment.createdAt', 'DESC');
    
    const [items, total] = await queryBuilder.getManyAndCount();

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

    const payment = await this.paymentRepository.findOne({ where: { id: refundDto.paymentId } });
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

    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');
    
    if (startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    // 总计统计
    const totalStats = await queryBuilder
      .select('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'totalAmount')
      .getRawOne();

    // 成功支付统计
    const successStats = await queryBuilder
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .select('COUNT(*)', 'successCount')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'successAmount')
      .getRawOne();

    // 退款统计
    const refundStats = await queryBuilder
      .andWhere('payment.status IN (:...statuses)', { statuses: [PaymentStatus.REFUNDED, PaymentStatus.PARTIAL_REFUNDED] })
      .select('COUNT(*)', 'refundCount')
      .addSelect('COALESCE(SUM(payment.refundedAmount), 0)', 'refundAmount')
      .getRawOne();

    const totalCount = parseInt(totalStats.totalCount) || 0;
    const successCount = parseInt(successStats.successCount) || 0;
    const successRate = totalCount > 0 ? successCount / totalCount : 0;

    return {
      totalAmount: parseFloat(totalStats.totalAmount) || 0,
      totalCount,
      successAmount: parseFloat(successStats.successAmount) || 0,
      successCount,
      refundAmount: parseFloat(refundStats.refundAmount) || 0,
      refundCount: parseInt(refundStats.refundCount) || 0,
      successRate: Math.round(successRate * 10000) / 10000, // 保留4位小数
    };
  }

  /**
   * 查询支付记录
   */
  async queryPayment(paymentNo: string) {
    this.logger.log(`查询支付记录: ${paymentNo}`);
    
    const payment = await this.paymentRepository.findOne({ where: { paymentNo } });
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
    const offset = (page - 1) * limit;
    
    const [data, total] = await this.paymentRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' }
    });
    
    return {
      data,
      total,
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
    const payment = await this.paymentRepository.findOne({ where: { paymentNo } });
    
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
    
    await this.paymentRepository.save(payment);
    
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
    const payment = await this.paymentRepository.findOne({ where: { paymentNo } });
    
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }
    
    // 更新支付状态
     payment.status = status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
     payment.transactionId = transactionId;
     if (status === 'SUCCESS') {
        payment.paidAt = new Date();
      }
     
     await this.paymentRepository.save(payment);
    
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
      const payment = await this.paymentRepository.findOne({ where: { paymentNo } });
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