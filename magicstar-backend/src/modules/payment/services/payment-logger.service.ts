import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentRecord, PaymentRecordType, PaymentRecordStatus } from '../entities/payment-record.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';

export interface PaymentLogData {
  paymentNo: string;
  paymentMethod: PaymentMethod;
  amount: number;
  userId?: string;
  orderId?: string;
  clientIp?: string;
  userAgent?: string;
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
  processingTime?: number;
  additionalInfo?: any;
}

@Injectable()
export class PaymentLoggerService {
  private readonly logger = new Logger(PaymentLoggerService.name);

  constructor(
    @InjectRepository(PaymentRecord)
    private readonly paymentRecordRepository: Repository<PaymentRecord>,
  ) {}

  /**
   * 记录支付创建日志
   */
  async logPaymentCreation(logData: PaymentLogData): Promise<void> {
    try {
      await this.createPaymentRecord({
        ...logData,
        type: PaymentRecordType.CREATE,
        status: 'success',
        message: '支付订单创建成功'
      });

      this.logger.log(`支付创建: ${logData.paymentNo}`, {
        paymentMethod: logData.paymentMethod,
        amount: logData.amount,
        userId: logData.userId
      });
    } catch (error) {
      this.logger.error(`记录支付创建日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 记录支付通知日志
   */
  async logPaymentNotification(logData: PaymentLogData): Promise<void> {
    try {
      await this.createPaymentRecord({
        ...logData,
        type: PaymentRecordType.NOTIFY,
        status: logData.errorMessage ? 'failed' : 'success',
        message: logData.errorMessage || '支付通知处理成功'
      });

      if (logData.errorMessage) {
        this.logger.error(`支付通知处理失败: ${logData.paymentNo}`, {
          error: logData.errorMessage,
          requestData: logData.requestData
        });
      } else {
        this.logger.log(`支付通知处理成功: ${logData.paymentNo}`, {
          paymentMethod: logData.paymentMethod,
          amount: logData.amount
        });
      }
    } catch (error) {
      this.logger.error(`记录支付通知日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 记录支付查询日志
   */
  async logPaymentQuery(logData: PaymentLogData): Promise<void> {
    try {
      await this.createPaymentRecord({
        ...logData,
        type: PaymentRecordType.QUERY,
        status: logData.errorMessage ? 'failed' : 'success',
        message: logData.errorMessage || '支付查询成功'
      });

      this.logger.log(`支付查询: ${logData.paymentNo}`, {
        paymentMethod: logData.paymentMethod,
        processingTime: logData.processingTime
      });
    } catch (error) {
      this.logger.error(`记录支付查询日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 记录退款日志
   */
  async logRefund(logData: PaymentLogData): Promise<void> {
    try {
      await this.createPaymentRecord({
        ...logData,
        type: PaymentRecordType.REFUND,
        status: logData.errorMessage ? 'failed' : 'success',
        message: logData.errorMessage || '退款处理成功'
      });

      if (logData.errorMessage) {
        this.logger.error(`退款处理失败: ${logData.paymentNo}`, {
          error: logData.errorMessage,
          amount: logData.amount
        });
      } else {
        this.logger.log(`退款处理成功: ${logData.paymentNo}`, {
          paymentMethod: logData.paymentMethod,
          amount: logData.amount
        });
      }
    } catch (error) {
      this.logger.error(`记录退款日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 记录支付取消日志
   */
  async logPaymentCancellation(logData: PaymentLogData): Promise<void> {
    try {
      await this.createPaymentRecord({
        ...logData,
        type: PaymentRecordType.CANCEL,
        status: logData.errorMessage ? 'failed' : 'success',
        message: logData.errorMessage || '支付取消成功'
      });

      this.logger.log(`支付取消: ${logData.paymentNo}`, {
        paymentMethod: logData.paymentMethod,
        reason: logData.additionalInfo?.reason
      });
    } catch (error) {
      this.logger.error(`记录支付取消日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 记录安全异常日志
   */
  async logSecurityException(
    paymentNo: string,
    exceptionType: string,
    details: any,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      const logData: PaymentLogData = {
        paymentNo,
        paymentMethod: details.paymentMethod || PaymentMethod.ALIPAY,
        amount: details.amount || 0,
        clientIp: details.clientIp,
        userAgent: details.userAgent,
        errorMessage: `安全异常: ${exceptionType}`,
        additionalInfo: {
          exceptionType,
          severity,
          details
        }
      };

      await this.createPaymentRecord({
        ...logData,
        type: PaymentRecordType.NOTIFY, // 使用NOTIFY类型记录安全异常
        status: 'failed',
        message: `安全异常: ${exceptionType}`
      });

      const logMethod = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'log';
      this.logger[logMethod](`支付安全异常: ${exceptionType}`, {
        paymentNo,
        severity,
        details
      });
    } catch (error) {
      this.logger.error(`记录安全异常日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 记录性能监控日志
   */
  async logPerformanceMetrics(
    operation: string,
    paymentMethod: PaymentMethod,
    processingTime: number,
    success: boolean,
    additionalMetrics?: any
  ): Promise<void> {
    try {
      const metrics = {
        operation,
        paymentMethod,
        processingTime,
        success,
        timestamp: new Date().toISOString(),
        ...additionalMetrics
      };

      this.logger.log(`性能监控: ${operation}`, metrics);

      // 如果处理时间过长，记录警告
      if (processingTime > 5000) { // 5秒
        this.logger.warn(`支付操作耗时过长: ${operation}`, {
          processingTime,
          paymentMethod
        });
      }
    } catch (error) {
      this.logger.error(`记录性能监控日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取支付统计信息
   */
  async getPaymentStatistics(
    startDate: Date,
    endDate: Date,
    paymentMethod?: PaymentMethod
  ): Promise<any> {
    try {
      const queryBuilder = this.paymentRecordRepository
        .createQueryBuilder('record')
        .select([
          'record.type',
          'record.status',
          'record.paymentMethod',
          'COUNT(*) as count',
          'AVG(record.processingTime) as avgProcessingTime'
        ])
        .where('record.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy('record.type, record.status, record.paymentMethod');

      if (paymentMethod) {
        queryBuilder.andWhere('record.paymentMethod = :paymentMethod', {
          paymentMethod
        });
      }

      const statistics = await queryBuilder.getRawMany();

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        paymentMethod,
        statistics
      };
    } catch (error) {
      this.logger.error(`获取支付统计信息失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建支付记录
   */
  private async createPaymentRecord(data: {
    paymentNo: string;
    paymentMethod: PaymentMethod;
    type: PaymentRecordType;
    status: string;
    message: string;
    amount?: number;
    userId?: string;
    orderId?: string;
    clientIp?: string;
    userAgent?: string;
    requestData?: any;
    responseData?: any;
    processingTime?: number;
    additionalInfo?: any;
  }): Promise<PaymentRecord> {
    // 需要先找到对应的Payment记录来获取paymentId
    // 这里暂时使用一个默认的UUID，实际使用时需要传入正确的paymentId
    const record = this.paymentRecordRepository.create({
      paymentId: data.additionalInfo?.paymentId || '00000000-0000-0000-0000-000000000000',
      type: data.type,
      status: this.mapToPaymentRecordStatus(data.status),
      description: data.message,
      requestData: data.requestData,
      responseData: data.responseData,
      processingTime: data.processingTime || 0,
      clientIp: data.clientIp,
      userAgent: data.userAgent,
      remark: JSON.stringify({
        paymentNo: data.paymentNo,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        userId: data.userId,
        orderId: data.orderId,
        ...data.additionalInfo
      })
    });

    return await this.paymentRecordRepository.save(record);
  }

  /**
   * 映射状态到PaymentRecordStatus枚举
   */
  private mapToPaymentRecordStatus(status: string): PaymentRecordStatus {
    switch (status.toLowerCase()) {
      case 'success':
        return PaymentRecordStatus.SUCCESS;
      case 'failed':
        return PaymentRecordStatus.FAILED;
      case 'pending':
        return PaymentRecordStatus.PENDING;
      default:
        return PaymentRecordStatus.PENDING;
    }
  }

  /**
   * 清理过期日志
   */
  async cleanupExpiredLogs(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.paymentRecordRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`清理过期支付日志完成，删除 ${result.affected} 条记录`);
    } catch (error) {
      this.logger.error(`清理过期支付日志失败: ${error.message}`, error.stack);
    }
  }
}