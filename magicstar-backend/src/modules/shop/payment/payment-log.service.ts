import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentLog,
  PaymentLogLevel,
  PaymentLogAction,
} from './entities/payment-log.entity';
import { Payment } from '../entities/payment.entity';

export interface LogPaymentEventDto {
  level: PaymentLogLevel;
  action: PaymentLogAction;
  message: string;
  paymentId?: number;
  userId?: number;
  data?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}

@Injectable()
export class PaymentLogService {
  constructor(
    @InjectRepository(PaymentLog)
    private readonly paymentLogRepository: Repository<PaymentLog>,
  ) {}

  /**
   * 记录支付事件日志
   */
  async logEvent(logData: LogPaymentEventDto): Promise<PaymentLog> {
    const log = this.paymentLogRepository.create({
      level: logData.level,
      action: logData.action,
      message: logData.message,
      payment_id: logData.paymentId,
      user_id: logData.userId,
      data: logData.data,
      ip_address: logData.ipAddress,
      user_agent: logData.userAgent,
      request_id: logData.requestId,
      session_id: logData.sessionId,
    });

    return await this.paymentLogRepository.save(log);
  }

  /**
   * 记录支付创建事件
   */
  async logPaymentCreated(
    payment: Payment,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.INFO,
      action: PaymentLogAction.PAYMENT_CREATED,
      message: `Payment created with amount ${payment.amount} ${payment.currency}`,
      paymentId: payment.id,
      userId,
      data: {
        transaction_id: payment.transaction_id,
        payment_method: payment.payment_method,
        amount: payment.amount,
        currency: payment.currency,
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录支付完成事件
   */
  async logPaymentCompleted(
    payment: Payment,
    gatewayResponse?: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.INFO,
      action: PaymentLogAction.PAYMENT_COMPLETED,
      message: `Payment completed successfully`,
      paymentId: payment.id,
      userId: payment.user_id,
      data: {
        transaction_id: payment.transaction_id,
        gateway_transaction_id: payment.gateway_transaction_id,
        amount: payment.amount,
        gateway_response: gatewayResponse,
      },
    });
  }

  /**
   * 记录支付失败事件
   */
  async logPaymentFailed(
    payment: Payment,
    reason: string,
    gatewayResponse?: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.ERROR,
      action: PaymentLogAction.PAYMENT_FAILED,
      message: `Payment failed: ${reason}`,
      paymentId: payment.id,
      userId: payment.user_id,
      data: {
        transaction_id: payment.transaction_id,
        failure_reason: reason,
        gateway_response: gatewayResponse,
      },
    });
  }

  /**
   * 记录签名验证成功事件
   */
  async logSignatureVerified(
    paymentId: number,
    provider: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.INFO,
      action: PaymentLogAction.SIGNATURE_VERIFIED,
      message: `Payment signature verified for ${provider}`,
      paymentId,
      data: { provider },
      ipAddress,
    });
  }

  /**
   * 记录签名验证失败事件
   */
  async logSignatureFailed(
    paymentId: number,
    provider: string,
    reason: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.SECURITY,
      action: PaymentLogAction.SIGNATURE_FAILED,
      message: `Payment signature verification failed for ${provider}: ${reason}`,
      paymentId,
      data: {
        provider,
        failure_reason: reason,
      },
      ipAddress,
    });
  }

  /**
   * 记录重复支付阻止事件
   */
  async logDuplicatePaymentBlocked(
    transactionId: string,
    userId: number,
    ipAddress?: string,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.SECURITY,
      action: PaymentLogAction.DUPLICATE_PAYMENT_BLOCKED,
      message: `Duplicate payment attempt blocked`,
      userId,
      data: {
        transaction_id: transactionId,
      },
      ipAddress,
    });
  }

  /**
   * 记录可疑活动事件
   */
  async logSuspiciousActivity(
    userId: number,
    activity: string,
    details: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.SECURITY,
      action: PaymentLogAction.SUSPICIOUS_ACTIVITY,
      message: `Suspicious payment activity detected: ${activity}`,
      userId,
      data: details,
      ipAddress,
    });
  }

  /**
   * 记录限流事件
   */
  async logRateLimitExceeded(
    userId: number,
    endpoint: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.logEvent({
      level: PaymentLogLevel.WARNING,
      action: PaymentLogAction.RATE_LIMIT_EXCEEDED,
      message: `Rate limit exceeded for payment endpoint: ${endpoint}`,
      userId,
      data: { endpoint },
      ipAddress,
    });
  }

  /**
   * 获取支付日志
   */
  async getPaymentLogs(
    paymentId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const [logs, total] = await this.paymentLogRepository.findAndCount({
      where: { payment_id: paymentId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取安全事件日志
   */
  async getSecurityLogs(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50,
  ) {
    const queryBuilder = this.paymentLogRepository
      .createQueryBuilder('log')
      .where('log.level = :level', { level: PaymentLogLevel.SECURITY })
      .orderBy('log.created_at', 'DESC');

    if (startDate) {
      queryBuilder.andWhere('log.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.created_at <= :endDate', { endDate });
    }

    const [logs, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取用户支付活动统计
   */
  async getUserPaymentStats(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.paymentLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.created_at >= :startDate', { startDate })
      .groupBy('log.action')
      .getRawMany();

    return stats.reduce((acc, stat) => {
      acc[stat.action] = parseInt(stat.count);
      return acc;
    }, {});
  }
}