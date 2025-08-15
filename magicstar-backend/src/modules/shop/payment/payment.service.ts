import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentMethod, PaymentStatus, PaymentType } from '../entities/payment.entity';
import { Order } from '../entities/order.entity';
import { User } from '../../user/entities/user.entity';
import { PaymentSecurityService, PaymentSecurityContext } from './payment-security.service';
import { PaymentLogService } from './payment-log.service';

export interface CreatePaymentDto {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  description?: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface PaymentCallbackData {
  transactionId: string;
  gatewayTransactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  signature: string;
  rawData: Record<string, any>;
}

export interface PaymentQueryResult {
  payment: Payment;
  gatewayStatus?: string;
  gatewayData?: Record<string, any>;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly paymentSecurityService: PaymentSecurityService,
    private readonly paymentLogService: PaymentLogService,
  ) {}

  /**
   * 创建支付订单
   */
  async createPayment(
    createPaymentDto: CreatePaymentDto,
    context: PaymentSecurityContext,
  ): Promise<Payment> {
    const { orderId, amount, currency, paymentMethod, paymentType, description, returnUrl, notifyUrl } = createPaymentDto;

    // 验证用户
    const user = await this.userRepository.findOne({
      where: { id: context.userId.toString() },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 验证订单
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user_id: context.userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 验证订单状态
    if (order.status !== 'pending') {
      throw new BadRequestException('Order is not in pending status');
    }

    // 验证支付金额
    if (!this.paymentSecurityService.validatePaymentAmount(amount)) {
      throw new BadRequestException('Invalid payment amount');
    }

    // 验证金额是否与订单一致
    if (Math.abs(amount - order.total_amount) > 0.01) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    // 检查支付频率限制
    const rateLimitPassed = await this.paymentSecurityService.checkPaymentRateLimit(
      context.userId,
      context,
    );
    if (!rateLimitPassed) {
      throw new BadRequestException('Payment rate limit exceeded');
    }

    // 生成安全的交易ID
    const transactionId = this.paymentSecurityService.generateSecureTransactionId();

    // 检查重复支付
    const duplicateCheck = await this.paymentSecurityService.checkDuplicatePayment(
      transactionId,
      context,
    );
    if (duplicateCheck.isDuplicate) {
      throw new ConflictException('Duplicate payment detected');
    }

    // 创建支付记录
    const payment = this.paymentRepository.create({
      transaction_id: transactionId,
      order_id: orderId,
      user_id: context.userId,
      amount,
      currency,
      payment_method: paymentMethod,
      status: PaymentStatus.PENDING,
      type: paymentType,
      notes: description,
      metadata: {
        return_url: returnUrl,
        notify_url: notifyUrl,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        request_id: context.requestId,
        session_id: context.sessionId,
      },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // 记录支付创建日志
    await this.paymentLogService.logPaymentCreated(
      savedPayment,
      context.userId,
      context.ipAddress,
      context.userAgent,
    );

    // 检测可疑活动
    await this.paymentSecurityService.detectSuspiciousActivity(savedPayment, context);

    this.logger.log(`Payment created: ${transactionId} for user ${context.userId}`);

    return savedPayment;
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(
    callbackData: PaymentCallbackData,
    context: PaymentSecurityContext,
  ): Promise<Payment> {
    const { transactionId, gatewayTransactionId, status, amount, currency, signature, rawData } = callbackData;

    // 查找支付记录
    const payment = await this.paymentRepository.findOne({
      where: { transaction_id: transactionId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 验证签名
    let signatureResult;
    if (payment.payment_method === PaymentMethod.WECHAT_PAY) {
      signatureResult = await this.paymentSecurityService.verifyWechatSignature(
        rawData,
        signature,
        context,
      );
    } else if (payment.payment_method === PaymentMethod.ALIPAY) {
      signatureResult = await this.paymentSecurityService.verifyAlipaySignature(
        rawData,
        signature,
        context,
      );
    } else {
      throw new BadRequestException('Unsupported payment method for signature verification');
    }

    if (!signatureResult.isValid) {
      throw new BadRequestException(`Invalid signature: ${signatureResult.reason}`);
    }

    // 验证金额
    if (Math.abs(amount - payment.amount) > 0.01) {
      throw new BadRequestException('Payment amount mismatch');
    }

    // 验证货币
    if (currency !== payment.currency) {
      throw new BadRequestException('Payment currency mismatch');
    }

    // 更新支付状态
    payment.status = status;
    payment.gateway_transaction_id = gatewayTransactionId;
    payment.gateway_response = rawData;
    payment.updated_at = new Date();

    const updatedPayment = await this.paymentRepository.save(payment);

    // 记录支付状态变更日志
    if (status === PaymentStatus.COMPLETED) {
      await this.paymentLogService.logPaymentCompleted(
        payment,
        rawData,
      );

      // 更新订单状态
      await this.updateOrderStatus(payment.order_id, 'paid');
    } else if (status === PaymentStatus.FAILED) {
      await this.paymentLogService.logPaymentFailed(
        payment,
        'Payment failed from gateway',
        rawData,
      );

      // 更新订单状态
      await this.updateOrderStatus(payment.order_id, 'payment_failed');
    }

    this.logger.log(`Payment callback processed: ${transactionId}, status: ${status}`);

    return updatedPayment;
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(
    transactionId: string,
    context: PaymentSecurityContext,
  ): Promise<PaymentQueryResult> {
    const payment = await this.paymentRepository.findOne({
      where: { transaction_id: transactionId },
      relations: ['order', 'user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 验证用户权限
    if (payment.user_id !== context.userId) {
      throw new BadRequestException('Access denied');
    }

    // 如果支付仍在处理中，可以查询第三方支付网关状态
    let gatewayStatus;
    let gatewayData;

    if (payment.status === PaymentStatus.PENDING) {
      try {
        // 这里可以调用第三方支付网关的查询接口
        // const gatewayResult = await this.queryGatewayStatus(payment);
        // gatewayStatus = gatewayResult.status;
        // gatewayData = gatewayResult.data;
      } catch (error) {
        this.logger.error('Failed to query gateway status', error.stack);
      }
    }

    return {
      payment,
      gatewayStatus,
      gatewayData,
    };
  }

  /**
   * 取消支付
   */
  async cancelPayment(
    transactionId: string,
    context: PaymentSecurityContext,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transaction_id: transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 验证用户权限
    if (payment.user_id !== context.userId) {
      throw new BadRequestException('Access denied');
    }

    // 只能取消待支付的订单
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be cancelled');
    }

    // 更新支付状态
    payment.status = PaymentStatus.CANCELLED;
    payment.updated_at = new Date();

    const updatedPayment = await this.paymentRepository.save(payment);

    // 记录取消日志
    await this.paymentLogService.logPaymentFailed(
      payment,
      'Payment cancelled by user',
    );

    // 更新订单状态
    await this.updateOrderStatus(payment.order_id, 'cancelled');

    this.logger.log(`Payment cancelled: ${transactionId}`);

    return updatedPayment;
  }

  /**
   * 获取用户支付历史
   */
  async getUserPaymentHistory(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ payments: Payment[]; total: number }> {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { user_id: userId },
      relations: ['order'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { payments, total };
  }

  /**
   * 处理支付退款
   */
  async processRefund(
    transactionId: string,
    refundAmount: number,
    reason: string,
    context: PaymentSecurityContext,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transaction_id: transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 只能退款已完成的支付
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment is not completed');
    }

    // 验证退款金额
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    // 检查是否已经退款
    if (payment.refunded_amount && payment.refunded_amount >= payment.amount) {
      throw new BadRequestException('Payment has been fully refunded');
    }

    // 计算可退款金额
    const currentRefundedAmount = payment.refunded_amount || 0;
    const availableRefundAmount = payment.amount - currentRefundedAmount;

    if (refundAmount > availableRefundAmount) {
      throw new BadRequestException('Refund amount exceeds available refund amount');
    }

    // 更新支付记录
    payment.refunded_amount = currentRefundedAmount + refundAmount;
    payment.updated_at = new Date();

    // 如果全额退款，更新状态
    if (payment.refunded_amount >= payment.amount) {
      payment.status = PaymentStatus.REFUNDED;
    }

    const updatedPayment = await this.paymentRepository.save(payment);

    // 记录退款日志
    await this.paymentLogService.logPaymentCreated(
      updatedPayment,
      context.userId,
      context.ipAddress,
      context.userAgent,
    );

    this.logger.log(`Payment refunded: ${transactionId}, amount: ${refundAmount}`);

    return updatedPayment;
  }

  /**
   * 更新订单状态
   */
  private async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await this.orderRepository.update(orderId, {
      status: status as any,
      updated_at: new Date(),
    });
  }

  /**
   * 获取支付统计信息
   */
  async getPaymentStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalAmount: number;
    totalCount: number;
    successCount: number;
    failedCount: number;
    refundedAmount: number;
  }> {
    const payments = await this.paymentRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
    });

    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCount = payments.length;
    const successCount = payments.filter(p => p.status === PaymentStatus.COMPLETED).length;
    const failedCount = payments.filter(p => p.status === PaymentStatus.FAILED).length;
    const refundedAmount = payments.reduce((sum, payment) => sum + (payment.refunded_amount || 0), 0);

    return {
      totalAmount,
      totalCount,
      successCount,
      failedCount,
      refundedAmount,
    };
  }
}