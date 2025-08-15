import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  RefundRecord,
  RefundStatus,
  RefundReason,
} from '../entities/refund-record.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Order } from '../../shop/entities/order.entity';
import { FinanceService } from './finance.service';
import {
  FinancialRecordType,
  FinancialRecordStatus,
} from '../entities/financial-record.entity';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { QueryRefundDto } from '../dto/query-refund.dto';
import { RefundStatsDto } from '../dto/refund-stats.dto';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(RefundRecord)
    private readonly refundRepository: Repository<RefundRecord>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly financeService: FinanceService,
  ) {}

  /**
   * 创建退款申请
   */
  async createRefund(createDto: CreateRefundDto): Promise<RefundRecord> {
    // 验证支付记录
    const payment = await this.paymentRepository.findOne({
      where: { id: createDto.paymentId },
      relations: ['user', 'order'],
    });

    if (!payment) {
      throw new BadRequestException('支付记录不存在');
    }

    if (payment.status !== 'success') {
      throw new BadRequestException('支付状态不正确，无法退款');
    }

    // 检查是否已有退款记录
    const existingRefund = await this.refundRepository.findOne({
      where: {
        paymentId: createDto.paymentId,
        status: In([RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.SUCCESS]),
      },
    });

    if (existingRefund) {
      throw new BadRequestException('该支付已有退款记录');
    }

    // 验证退款金额
    if (createDto.amount > payment.amount) {
      throw new BadRequestException('退款金额不能超过支付金额');
    }

    // 生成退款单号
    const refundNo = this.generateRefundNo();

    try {
      const refund = this.refundRepository.create({
        refundNo,
        status: RefundStatus.PENDING,
        amount: createDto.amount,
        currency: payment.currency,
        userId: payment.userId,
        paymentId: createDto.paymentId,
        orderId: payment.orderId,
        reason: createDto.reason,
        description: createDto.description,
        operatorId: createDto.operatorId,
        remark: createDto.remark,
        metadata: {
          originalAmount: payment.amount,
          paymentMethod: payment.paymentMethod,
          ...createDto.metadata,
        },
      });

      const savedRefund = await this.refundRepository.save(refund);
      this.logger.log(`退款申请创建成功: ${savedRefund.refundNo}`);

      // 异步处理退款
      this.processRefund(savedRefund.id).catch(error => {
        this.logger.error(`退款处理失败: ${error.message}`, error.stack);
      });

      return savedRefund;
    } catch (error) {
      this.logger.error(`创建退款申请失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理退款
   */
  async processRefund(refundId: string): Promise<RefundRecord> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['payment', 'user'],
    });

    if (!refund) {
      throw new Error('退款记录不存在');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new Error('退款状态不正确');
    }

    try {
      // 更新状态为处理中
      await this.updateRefundStatus(
        refundId,
        RefundStatus.PROCESSING,
        '开始处理退款',
      );

      // 调用第三方退款接口
      const refundResult = await this.callThirdPartyRefund(refund);

      if (refundResult.success) {
        // 退款成功
        refund.status = RefundStatus.SUCCESS;
        refund.refundDate = new Date();
        refund.completedAt = new Date();
        refund.thirdPartyRefundId = refundResult.refundId || '';
        refund.thirdPartyResponse = refundResult.response;

        await this.refundRepository.save(refund);

        // 创建财务记录
        await this.financeService.createFinancialRecord({
          type: FinancialRecordType.REFUND,
          status: FinancialRecordStatus.CONFIRMED,
          amount: refund.amount,
          currency: refund.currency,
          userId: refund.userId,
          paymentId: refund.paymentId,
          orderId: refund.orderId,
          businessType: 'refund',
          description: `退款支出 - ${refund.refundNo}`,
          recordDate: refund.refundDate,
          metadata: {
            refundId: refund.id,
            refundNo: refund.refundNo,
            reason: refund.reason,
          },
        });

        this.logger.log(`退款处理成功: ${refund.refundNo}`);
      } else {
        // 退款失败
        refund.status = RefundStatus.FAILED;
        refund.completedAt = new Date();
        refund.failureReason = refundResult.error || '';
        refund.thirdPartyResponse = refundResult.response;

        await this.refundRepository.save(refund);
        this.logger.error(`退款处理失败: ${refund.refundNo} - ${refundResult.error}`);
      }

      return refund;
    } catch (error) {
      // 处理异常
      await this.updateRefundStatus(
        refundId,
        RefundStatus.FAILED,
        `退款处理异常: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 调用第三方退款接口
   */
  private async callThirdPartyRefund(refund: RefundRecord): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
    response?: any;
  }> {
    // 模拟第三方退款接口调用
    // 实际实现中需要根据支付方式调用对应的退款接口
    try {
      // 这里应该调用微信支付、支付宝等的退款接口
      // 暂时模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        refundId: `refund_${Date.now()}`,
        response: {
          refund_id: `refund_${Date.now()}`,
          status: 'SUCCESS',
          refund_time: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: error.response,
      };
    }
  }

  /**
   * 查询退款记录
   */
  async findRefunds(queryDto: QueryRefundDto): Promise<{
    refunds: RefundRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      status,
      reason,
      userId,
      startDate,
      endDate,
    } = queryDto;

    const queryBuilder = this.refundRepository
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.user', 'user')
      .leftJoinAndSelect('refund.payment', 'payment')
      .leftJoinAndSelect('refund.order', 'order');

    if (status) {
      queryBuilder.andWhere('refund.status = :status', { status });
    }

    if (reason) {
      queryBuilder.andWhere('refund.reason = :reason', { reason });
    }

    if (userId) {
      queryBuilder.andWhere('refund.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('refund.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();
    const refunds = await queryBuilder
      .orderBy('refund.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      refunds,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取退款统计
   */
  async getRefundStats(
    startDate: Date,
    endDate: Date,
  ): Promise<RefundStatsDto> {
    // 总体统计
    const totalStats = await this.refundRepository
      .createQueryBuilder('refund')
      .select('COUNT(refund.id)', 'totalCount')
      .addSelect('SUM(refund.amount)', 'totalAmount')
      .addSelect('AVG(refund.amount)', 'avgAmount')
      .where('refund.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // 按状态统计
    const statusStats = await this.refundRepository
      .createQueryBuilder('refund')
      .select('refund.status', 'status')
      .addSelect('COUNT(refund.id)', 'count')
      .addSelect('SUM(refund.amount)', 'amount')
      .where('refund.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('refund.status')
      .getRawMany();

    // 按原因统计
    const reasonStats = await this.refundRepository
      .createQueryBuilder('refund')
      .select('refund.reason', 'reason')
      .addSelect('COUNT(refund.id)', 'count')
      .addSelect('SUM(refund.amount)', 'amount')
      .where('refund.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('refund.reason')
      .getRawMany();

    // 成功率统计
    const successCount = statusStats.find(
      stat => stat.status === RefundStatus.SUCCESS,
    )?.count || 0;
    const totalCount = parseInt(totalStats?.totalCount?.toString() || '0');
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    return {
      totalCount,
      totalAmount: parseFloat(totalStats?.totalAmount?.toString() || '0'),
      avgAmount: parseFloat(totalStats?.avgAmount?.toString() || '0'),
      successRate,
      statusStats: statusStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.count),
        amount: parseFloat(stat.amount || '0'),
      })),
      reasonStats: reasonStats.map(stat => ({
        reason: stat.reason,
        count: parseInt(stat.count),
        amount: parseFloat(stat.amount || '0'),
      })),
      period: {
        startDate,
        endDate,
      },
    };
  }

  /**
   * 更新退款状态
   */
  async updateRefundStatus(
    id: string,
    status: RefundStatus,
    remark?: string,
  ): Promise<RefundRecord> {
    const refund = await this.refundRepository.findOne({ where: { id } });

    if (!refund) {
      throw new Error(`退款记录不存在: ${id}`);
    }

    refund.status = status;
    if (remark) {
      refund.remark = remark;
    }

    if (status === RefundStatus.SUCCESS || status === RefundStatus.FAILED) {
      refund.completedAt = new Date();
    }

    const updatedRefund = await this.refundRepository.save(refund);
    this.logger.log(`退款状态更新: ${id} -> ${status}`);
    return updatedRefund;
  }

  /**
   * 取消退款
   */
  async cancelRefund(id: string, reason?: string): Promise<RefundRecord> {
    const refund = await this.refundRepository.findOne({ where: { id } });

    if (!refund) {
      throw new BadRequestException('退款记录不存在');
    }

    if (![RefundStatus.PENDING, RefundStatus.PROCESSING].includes(refund.status)) {
      throw new BadRequestException('当前状态无法取消退款');
    }

    return this.updateRefundStatus(id, RefundStatus.CANCELLED, reason);
  }

  /**
   * 生成退款单号
   */
  private generateRefundNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `RF${timestamp}${random}`;
  }

  /**
   * 获取退款详情
   */
  async getRefundById(id: string): Promise<RefundRecord> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['user', 'payment', 'order', 'operator'],
    });

    if (!refund) {
      throw new BadRequestException('退款记录不存在');
    }

    return refund;
  }

  /**
   * 批量处理退款
   */
  async batchProcessRefunds(refundIds: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const refundId of refundIds) {
      try {
        await this.processRefund(refundId);
        success.push(refundId);
      } catch (error) {
        failed.push({
          id: refundId,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `批量处理退款完成: 成功 ${success.length} 个，失败 ${failed.length} 个`,
    );

    return { success, failed };
  }

  /**
   * 获取退款趋势数据
   */
  async getRefundTrends(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<Array<{ date: string; amount: number; count: number }>> {
    const dateFormat = {
      day: '%Y-%m-%d',
      week: '%Y-%u',
      month: '%Y-%m',
    }[granularity];

    const trends = await this.refundRepository
      .createQueryBuilder('refund')
      .select(`DATE_FORMAT(refund.createdAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(refund.id)', 'count')
      .addSelect('SUM(refund.amount)', 'amount')
      .where('refund.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trends.map(trend => ({
      date: trend.date,
      count: parseInt(trend.count),
      amount: parseFloat(trend.amount || '0'),
    }));
  }
}