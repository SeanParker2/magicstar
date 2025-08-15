import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Refund, RefundStatus, RefundType, RefundReason } from './entities/refund.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Order } from '../entities/order.entity';
import { User } from '../../user/entities/user.entity';
import { PaymentLogService } from './payment-log.service';
import { PaymentLogLevel, PaymentLogAction } from './entities/payment-log.entity';
import { PaymentSecurityService } from './payment-security.service';
import * as crypto from 'crypto';

export interface CreateRefundDto {
  paymentId: number;
  refundType: RefundType;
  reason: RefundReason;
  refundAmount?: number;
  description?: string;
  customerNote?: string;
  adminNote?: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}

export interface RefundQueryDto {
  page?: number;
  limit?: number;
  status?: RefundStatus;
  refundType?: RefundType;
  reason?: RefundReason;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  paymentId?: number;
  orderId?: number;
}

export interface ProcessRefundDto {
  refundId: number;
  adminNote?: string;
  processedBy: number;
}

export interface RefundStats {
  totalRefunds: number;
  totalAmount: number;
  pendingRefunds: number;
  pendingAmount: number;
  completedRefunds: number;
  completedAmount: number;
  failedRefunds: number;
  averageRefundAmount: number;
  refundRate: number;
  averageProcessingTime: number;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paymentLogService: PaymentLogService,
    private readonly paymentSecurityService: PaymentSecurityService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建退款申请
   */
  async createRefund(createRefundDto: CreateRefundDto): Promise<Refund> {
    const { paymentId, refundType, reason, refundAmount, description, customerNote, adminNote, userId, ipAddress, userAgent, requestId, sessionId } = createRefundDto;

    // 获取支付记录
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order', 'user'],
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentId}`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('只能对已完成的支付进行退款');
    }

    // 检查是否已有退款记录
    const existingRefund = await this.refundRepository.findOne({
      where: {
        payment_id: paymentId,
        status: RefundStatus.COMPLETED,
      },
    });

    if (existingRefund && refundType === RefundType.FULL) {
      throw new BadRequestException('该支付已完成退款');
    }

    // 计算退款金额
    let finalRefundAmount = Number(payment.amount);
    if (refundType === RefundType.PARTIAL) {
      if (!refundAmount || refundAmount <= 0) {
        throw new BadRequestException('部分退款必须指定退款金额');
      }
      if (refundAmount > Number(payment.amount)) {
        throw new BadRequestException('退款金额不能超过支付金额');
      }
      finalRefundAmount = refundAmount;
    }

    // 计算已退款金额
    const existingRefunds = await this.refundRepository.find({
      where: {
        payment_id: paymentId,
        status: RefundStatus.COMPLETED,
      },
    });

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.refund_amount), 0);
    if (totalRefunded + finalRefundAmount > Number(payment.amount)) {
      throw new BadRequestException('累计退款金额不能超过支付金额');
    }

    // 生成退款ID
    const refundId = this.generateRefundId();

    // 计算退款手续费（如果有）
    const refundFee = this.calculateRefundFee(finalRefundAmount, reason);
    const netRefundAmount = finalRefundAmount - refundFee;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建退款记录
      const refund = this.refundRepository.create({
        refund_id: refundId,
        payment_id: paymentId,
        order_id: payment.order_id,
        user_id: payment.user_id,
        status: RefundStatus.PENDING,
        refund_type: refundType,
        reason,
        original_amount: Number(payment.amount),
        refund_amount: finalRefundAmount,
        refund_fee: refundFee,
        net_refund_amount: netRefundAmount,
        currency: payment.currency,
        description,
        customer_note: customerNote,
        admin_note: adminNote,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId,
        session_id: sessionId,
        metadata: {
          payment_method: payment.payment_method,
          gateway_transaction_id: payment.gateway_transaction_id,
          created_by: userId || payment.user_id,
        },
      });

      const savedRefund = await queryRunner.manager.save(refund);

      // 记录日志
      await this.paymentLogService.logEvent({
        level: PaymentLogLevel.INFO,
        action: PaymentLogAction.PAYMENT_REFUNDED,
        message: `退款申请已创建: ${savedRefund.refund_id}`,
        paymentId: payment.id,
        userId: payment.user_id,
        data: { refund: savedRefund },
        ipAddress,
        userAgent,
        requestId,
        sessionId,
      });

      await queryRunner.commitTransaction();
      
      this.logger.log(`退款申请已创建: ${savedRefund.refund_id}`);
      return savedRefund;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`创建退款申请失败: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 处理退款
   */
  async processRefund(processRefundDto: ProcessRefundDto): Promise<Refund> {
    const { refundId, adminNote, processedBy } = processRefundDto;

    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['payment', 'order', 'user'],
    });

    if (!refund) {
      throw new NotFoundException(`退款记录不存在: ${refundId}`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('只能处理待处理状态的退款');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新退款状态
      refund.status = RefundStatus.PROCESSING;
      refund.processed_by = processedBy;
      refund.processed_at = new Date();
      if (adminNote) {
        refund.admin_note = adminNote;
      }

      await queryRunner.manager.save(refund);

      // 调用支付网关退款接口
      const gatewayResult = await this.processGatewayRefund(refund);
      
      if (gatewayResult.success) {
        refund.status = RefundStatus.COMPLETED;
        refund.completed_at = new Date();
        refund.gateway_refund_id = gatewayResult.gatewayRefundId || '';
        refund.gateway_response = gatewayResult.response;
        refund.gateway_status = gatewayResult.status || '';

        // 更新订单状态（如果是全额退款）
        if (refund.refund_type === RefundType.FULL) {
          await queryRunner.manager.update(Order, refund.order_id, {
            status: 'refunded' as any,
            updated_at: new Date(),
          });
        }

        // 记录成功日志
        await this.paymentLogService.logEvent({
          level: PaymentLogLevel.INFO,
          action: PaymentLogAction.PAYMENT_REFUNDED,
          message: `退款处理成功: ${refund.refund_id}`,
          paymentId: refund.payment_id,
          userId: refund.user_id,
          data: { refund, gatewayResponse: gatewayResult.response },
        });
      } else {
        refund.status = RefundStatus.FAILED;
        refund.failed_at = new Date();
        refund.error_message = gatewayResult.error || '';
        refund.error_details = gatewayResult.errorDetails;

        // 记录失败日志
        await this.paymentLogService.logEvent({
          level: PaymentLogLevel.ERROR,
          action: PaymentLogAction.PAYMENT_FAILED,
          message: `退款处理失败: ${refund.refund_id}`,
          paymentId: refund.payment_id,
          userId: refund.user_id,
          data: { refund, error: gatewayResult.error, errorDetails: gatewayResult.errorDetails },
        });
      }

      const finalRefund = await queryRunner.manager.save(refund);
      await queryRunner.commitTransaction();
      
      this.logger.log(`退款处理完成: ${finalRefund.refund_id}, 状态: ${finalRefund.status}`);
      return finalRefund;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`处理退款失败: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 重试失败的退款
   */
  async retryRefund(refundId: number, processedBy: number): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['payment', 'order', 'user'],
    });

    if (!refund) {
      throw new NotFoundException(`退款记录不存在: ${refundId}`);
    }

    if (refund.status !== RefundStatus.FAILED) {
      throw new BadRequestException('只能重试失败状态的退款');
    }

    if (!refund.can_retry) {
      throw new BadRequestException('退款重试次数已达上限');
    }

    refund.retry_count += 1;
    refund.last_retry_at = new Date();
    refund.status = RefundStatus.PROCESSING;
    refund.processed_by = processedBy;
    refund.processed_at = new Date();

    return this.processRefund({ refundId, processedBy });
  }

  /**
   * 取消退款
   */
  async cancelRefund(refundId: number, reason: string, cancelledBy: number): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['user'],
    });

    if (!refund) {
      throw new NotFoundException(`退款记录不存在: ${refundId}`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('只能取消待处理状态的退款');
    }

    refund.status = RefundStatus.CANCELLED;
    refund.admin_note = `${refund.admin_note || ''}\n取消原因: ${reason}`;
    refund.processed_by = cancelledBy;
    refund.processed_at = new Date();

    const savedRefund = await this.refundRepository.save(refund);

    // 记录日志
    await this.paymentLogService.logEvent({
      level: PaymentLogLevel.INFO,
      action: PaymentLogAction.PAYMENT_CANCELLED,
      message: `退款已取消: ${savedRefund.refund_id}`,
      paymentId: savedRefund.payment_id,
      userId: refund.user_id,
      data: { refund: savedRefund, reason, cancelledBy },
    });

    this.logger.log(`退款已取消: ${savedRefund.refund_id}`);
    return savedRefund;
  }

  /**
   * 查询退款列表
   */
  async getRefunds(queryDto: RefundQueryDto) {
    const { page = 1, limit = 20, status, refundType, reason, userId, startDate, endDate, paymentId, orderId } = queryDto;

    const queryBuilder = this.refundRepository.createQueryBuilder('refund')
      .leftJoinAndSelect('refund.payment', 'payment')
      .leftJoinAndSelect('refund.order', 'order')
      .leftJoinAndSelect('refund.user', 'user');

    if (status) {
      queryBuilder.andWhere('refund.status = :status', { status });
    }

    if (refundType) {
      queryBuilder.andWhere('refund.refund_type = :refundType', { refundType });
    }

    if (reason) {
      queryBuilder.andWhere('refund.reason = :reason', { reason });
    }

    if (userId) {
      queryBuilder.andWhere('refund.user_id = :userId', { userId });
    }

    if (paymentId) {
      queryBuilder.andWhere('refund.payment_id = :paymentId', { paymentId });
    }

    if (orderId) {
      queryBuilder.andWhere('refund.order_id = :orderId', { orderId });
    }

    if (startDate) {
      queryBuilder.andWhere('refund.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('refund.created_at <= :endDate', { endDate });
    }

    const [refunds, total] = await queryBuilder
      .orderBy('refund.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      refunds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取退款详情
   */
  async getRefundById(id: number): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['payment', 'order', 'user'],
    });

    if (!refund) {
      throw new NotFoundException(`退款记录不存在: ${id}`);
    }

    return refund;
  }

  /**
   * 获取退款统计
   */
  async getRefundStats(startDate?: Date, endDate?: Date): Promise<RefundStats> {
    const queryBuilder = this.refundRepository.createQueryBuilder('refund');

    if (startDate) {
      queryBuilder.andWhere('refund.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('refund.created_at <= :endDate', { endDate });
    }

    const refunds = await queryBuilder.getMany();

    const totalRefunds = refunds.length;
    const totalAmount = refunds.reduce((sum, r) => sum + Number(r.refund_amount), 0);
    
    const pendingRefunds = refunds.filter(r => r.status === RefundStatus.PENDING);
    const pendingAmount = pendingRefunds.reduce((sum, r) => sum + Number(r.refund_amount), 0);
    
    const completedRefunds = refunds.filter(r => r.status === RefundStatus.COMPLETED);
    const completedAmount = completedRefunds.reduce((sum, r) => sum + Number(r.refund_amount), 0);
    
    const failedRefunds = refunds.filter(r => r.status === RefundStatus.FAILED);
    
    const averageRefundAmount = totalRefunds > 0 ? totalAmount / totalRefunds : 0;
    
    // 计算平均处理时间（毫秒）
    const processedRefunds = refunds.filter(r => r.processing_time !== null);
    const averageProcessingTime = processedRefunds.length > 0
      ? processedRefunds.reduce((sum, r) => sum + (r.processing_time || 0), 0) / processedRefunds.length
      : 0;

    // 计算退款率（需要获取同期支付数据）
    const paymentQueryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED });

    if (startDate) {
      paymentQueryBuilder.andWhere('payment.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      paymentQueryBuilder.andWhere('payment.created_at <= :endDate', { endDate });
    }

    const totalPayments = await paymentQueryBuilder.getCount();
    const refundRate = totalPayments > 0 ? (completedRefunds.length / totalPayments) * 100 : 0;

    return {
      totalRefunds,
      totalAmount,
      pendingRefunds: pendingRefunds.length,
      pendingAmount,
      completedRefunds: completedRefunds.length,
      completedAmount,
      failedRefunds: failedRefunds.length,
      averageRefundAmount,
      refundRate,
      averageProcessingTime,
    };
  }

  /**
   * 对账功能 - 检查退款状态一致性
   */
  async reconcileRefunds(startDate: Date, endDate: Date) {
    this.logger.log(`开始退款对账: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    const refunds = await this.refundRepository.find({
      where: {
        created_at: Between(startDate, endDate),
        status: RefundStatus.COMPLETED,
      },
      relations: ['payment'],
    });

    const reconciliationResults: Array<{
      refundId: string;
      localStatus: string;
      gatewayStatus: string;
      discrepancy: boolean;
      message: string;
    }> = [];

    for (const refund of refunds) {
      try {
        // 查询网关退款状态
        const gatewayStatus = await this.queryGatewayRefundStatus(refund);
        
        if (gatewayStatus.status !== refund.gateway_status) {
          reconciliationResults.push({
            refundId: refund.refund_id,
            localStatus: refund.gateway_status,
            gatewayStatus: gatewayStatus.status,
            discrepancy: true,
            message: '状态不一致',
          });

          // 更新本地状态
          refund.gateway_status = gatewayStatus.status;
          refund.gateway_response = { ...refund.gateway_response, ...gatewayStatus.response };
          await this.refundRepository.save(refund);
        } else {
          reconciliationResults.push({
            refundId: refund.refund_id,
            localStatus: refund.gateway_status,
            gatewayStatus: gatewayStatus.status,
            discrepancy: false,
            message: '状态一致',
          });
        }
      } catch (error) {
        reconciliationResults.push({
          refundId: refund.refund_id,
          localStatus: refund.gateway_status,
          gatewayStatus: 'unknown',
          discrepancy: true,
          message: `查询失败: ${error.message}`,
        });
      }
    }

    this.logger.log(`退款对账完成，处理 ${refunds.length} 条记录`);
    return reconciliationResults;
  }

  /**
   * 生成退款ID
   */
  private generateRefundId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex');
    return `RF${timestamp}${random}`.toUpperCase();
  }

  /**
   * 计算退款手续费
   */
  private calculateRefundFee(amount: number, reason: RefundReason): number {
    // 根据退款原因计算手续费
    switch (reason) {
      case RefundReason.CUSTOMER_REQUEST:
        return amount * 0.01; // 1% 手续费
      case RefundReason.DUPLICATE_PAYMENT:
      case RefundReason.TECHNICAL_ERROR:
        return 0; // 系统错误不收手续费
      case RefundReason.FRAUDULENT:
      case RefundReason.CHARGEBACK:
        return amount * 0.02; // 2% 手续费
      default:
        return amount * 0.005; // 0.5% 默认手续费
    }
  }

  /**
   * 处理网关退款
   */
  private async processGatewayRefund(refund: Refund): Promise<{
    success: boolean;
    gatewayRefundId?: string;
    response?: any;
    status?: string;
    error?: string;
    errorDetails?: any;
  }> {
    try {
      // 这里应该调用实际的支付网关API
      // 模拟网关调用
      const gatewayRefundId = `GW_RF_${Date.now()}`;
      const response = {
        refund_id: gatewayRefundId,
        amount: refund.refund_amount,
        currency: refund.currency,
        status: 'success',
        processed_at: new Date().toISOString(),
      };

      return {
        success: true,
        gatewayRefundId,
        response,
        status: 'completed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorDetails: error,
      };
    }
  }

  /**
   * 查询网关退款状态
   */
  private async queryGatewayRefundStatus(refund: Refund): Promise<{
    status: string;
    response: any;
  }> {
    // 这里应该调用实际的支付网关查询API
    // 模拟网关查询
    return {
      status: 'completed',
      response: {
        refund_id: refund.gateway_refund_id,
        status: 'completed',
        amount: refund.refund_amount,
        processed_at: refund.completed_at?.toISOString(),
      },
    };
  }
}