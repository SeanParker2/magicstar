import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  ReconciliationRecord,
  ReconciliationStatus,
  ReconciliationType,
  PaymentChannel,
} from '../entities/reconciliation-record.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { RefundRecord, RefundStatus } from '../entities/refund-record.entity';
import { CreateReconciliationDto } from '../dto/create-reconciliation.dto';
import { QueryReconciliationDto } from '../dto/query-reconciliation.dto';
import { ReconciliationResultDto } from '../dto/reconciliation-result.dto';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationRecord)
    private readonly reconciliationRepository: Repository<ReconciliationRecord>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(RefundRecord)
    private readonly refundRepository: Repository<RefundRecord>,
  ) {}

  /**
   * 创建对账任务
   */
  async createReconciliation(
    createDto: CreateReconciliationDto,
  ): Promise<ReconciliationRecord> {
    const batchNo = this.generateBatchNo(createDto.type, createDto.paymentChannel);

    try {
      const reconciliation = this.reconciliationRepository.create({
        batchNo,
        type: createDto.type,
        status: ReconciliationStatus.PENDING,
        paymentChannel: createDto.paymentChannel,
        reconciliationDate: createDto.reconciliationDate,
        operatorId: createDto.operatorId,
        remark: createDto.remark,
      });

      const savedReconciliation = await this.reconciliationRepository.save(
        reconciliation,
      );
      this.logger.log(`对账任务创建成功: ${savedReconciliation.batchNo}`);

      // 异步执行对账
      this.executeReconciliation(savedReconciliation.id).catch(error => {
        this.logger.error(`对账执行失败: ${error.message}`, error.stack);
      });

      return savedReconciliation;
    } catch (error) {
      this.logger.error(`创建对账任务失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行对账
   */
  async executeReconciliation(reconciliationId: string): Promise<ReconciliationRecord> {
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id: reconciliationId },
    });

    if (!reconciliation) {
      throw new Error('对账记录不存在');
    }

    if (reconciliation.status !== ReconciliationStatus.PENDING) {
      throw new Error('对账状态不正确');
    }

    try {
      // 更新状态为处理中
      reconciliation.status = ReconciliationStatus.PROCESSING;
      reconciliation.startTime = new Date();
      await this.reconciliationRepository.save(reconciliation);

      // 获取对账日期范围
      const { startDate, endDate } = this.getReconciliationDateRange(
        reconciliation.reconciliationDate,
        reconciliation.type,
      );

      // 获取系统数据
      const systemData = await this.getSystemData(
        startDate,
        endDate,
        reconciliation.paymentChannel,
      );

      // 获取第三方数据（模拟）
      const thirdPartyData = await this.getThirdPartyData(
        startDate,
        endDate,
        reconciliation.paymentChannel,
      );

      // 执行对账比较
      const reconciliationResult = this.compareData(systemData, thirdPartyData);

      // 更新对账记录
      reconciliation.status = reconciliationResult.hasDiscrepancy
        ? ReconciliationStatus.UNMATCHED
        : ReconciliationStatus.MATCHED;
      reconciliation.endTime = new Date();

      // 更新统计数据
      Object.assign(reconciliation, {
        systemTransactionCount: systemData.transactionCount,
        systemTransactionAmount: systemData.transactionAmount,
        systemRefundCount: systemData.refundCount,
        systemRefundAmount: systemData.refundAmount,
        thirdPartyTransactionCount: thirdPartyData.transactionCount,
        thirdPartyTransactionAmount: thirdPartyData.transactionAmount,
        thirdPartyRefundCount: thirdPartyData.refundCount,
        thirdPartyRefundAmount: thirdPartyData.refundAmount,
        transactionCountDiff: reconciliationResult.transactionCountDiff,
        transactionAmountDiff: reconciliationResult.transactionAmountDiff,
        refundCountDiff: reconciliationResult.refundCountDiff,
        refundAmountDiff: reconciliationResult.refundAmountDiff,
        matchedCount: reconciliationResult.matchedCount,
        unmatchedCount: reconciliationResult.unmatchedCount,
        exceptionCount: reconciliationResult.exceptionCount,
        unmatchedDetails: reconciliationResult.unmatchedDetails,
        exceptionDetails: reconciliationResult.exceptionDetails,
      });

      const updatedReconciliation = await this.reconciliationRepository.save(
        reconciliation,
      );

      // 生成对账报告
      await this.generateReconciliationReport(updatedReconciliation);

      this.logger.log(`对账执行完成: ${reconciliation.batchNo}`);
      return updatedReconciliation;
    } catch (error) {
      // 更新状态为异常
      reconciliation.status = ReconciliationStatus.EXCEPTION;
      reconciliation.endTime = new Date();
      reconciliation.remark = `对账异常: ${error.message}`;
      await this.reconciliationRepository.save(reconciliation);
      throw error;
    }
  }

  /**
   * 获取系统数据
   */
  private async getSystemData(
    startDate: Date,
    endDate: Date,
    paymentChannel: PaymentChannel,
  ): Promise<{
    transactionCount: number;
    transactionAmount: number;
    refundCount: number;
    refundAmount: number;
    transactions: any[];
    refunds: any[];
  }> {
    let paymentMethodFilter: string[] = [];
    
    switch (paymentChannel) {
      case PaymentChannel.WECHAT:
        paymentMethodFilter = ['wechat'];
        break;
      case PaymentChannel.ALIPAY:
        paymentMethodFilter = ['alipay'];
        break;
      case PaymentChannel.BANK:
        paymentMethodFilter = ['bank'];
        break;
      default:
        paymentMethodFilter = ['wechat', 'alipay', 'bank'];
    }

    // 获取交易数据
    const transactionQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.paidAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('payment.status = :status', { status: 'success' });

    if (paymentChannel !== PaymentChannel.ALL) {
      transactionQuery.andWhere('payment.paymentMethod IN (:...methods)', {
        methods: paymentMethodFilter,
      });
    }

    const transactions = await transactionQuery.getMany();
    const transactionCount = transactions.length;
    const transactionAmount = transactions.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    // 获取退款数据
    const refundQuery = this.refundRepository
      .createQueryBuilder('refund')
      .leftJoin('refund.payment', 'payment')
      .where('refund.refundDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('refund.status = :status', { status: RefundStatus.SUCCESS });

    if (paymentChannel !== PaymentChannel.ALL) {
      refundQuery.andWhere('payment.paymentMethod IN (:...methods)', {
        methods: paymentMethodFilter,
      });
    }

    const refunds = await refundQuery.getMany();
    const refundCount = refunds.length;
    const refundAmount = refunds.reduce(
      (sum, refund) => sum + refund.amount,
      0,
    );

    return {
      transactionCount,
      transactionAmount,
      refundCount,
      refundAmount,
      transactions,
      refunds,
    };
  }

  /**
   * 获取第三方数据（模拟）
   */
  private async getThirdPartyData(
    startDate: Date,
    endDate: Date,
    paymentChannel: PaymentChannel,
  ): Promise<{
    transactionCount: number;
    transactionAmount: number;
    refundCount: number;
    refundAmount: number;
    transactions: any[];
    refunds: any[];
  }> {
    // 模拟第三方数据
    // 实际实现中需要调用微信支付、支付宝等的对账接口
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟数据，实际应该从第三方获取
    return {
      transactionCount: 100,
      transactionAmount: 10000,
      refundCount: 5,
      refundAmount: 500,
      transactions: [],
      refunds: [],
    };
  }

  /**
   * 比较系统数据和第三方数据
   */
  private compareData(
    systemData: any,
    thirdPartyData: any,
  ): {
    hasDiscrepancy: boolean;
    transactionCountDiff: number;
    transactionAmountDiff: number;
    refundCountDiff: number;
    refundAmountDiff: number;
    matchedCount: number;
    unmatchedCount: number;
    exceptionCount: number;
    unmatchedDetails: any[];
    exceptionDetails: any[];
  } {
    const transactionCountDiff =
      systemData.transactionCount - thirdPartyData.transactionCount;
    const transactionAmountDiff =
      systemData.transactionAmount - thirdPartyData.transactionAmount;
    const refundCountDiff = systemData.refundCount - thirdPartyData.refundCount;
    const refundAmountDiff =
      systemData.refundAmount - thirdPartyData.refundAmount;

    const hasDiscrepancy =
      transactionCountDiff !== 0 ||
      transactionAmountDiff !== 0 ||
      refundCountDiff !== 0 ||
      refundAmountDiff !== 0;

    // 模拟匹配结果
    const matchedCount = Math.min(
      systemData.transactionCount,
      thirdPartyData.transactionCount,
    );
    const unmatchedCount = Math.abs(transactionCountDiff);
    const exceptionCount = 0;

    return {
      hasDiscrepancy,
      transactionCountDiff,
      transactionAmountDiff,
      refundCountDiff,
      refundAmountDiff,
      matchedCount,
      unmatchedCount,
      exceptionCount,
      unmatchedDetails: [],
      exceptionDetails: [],
    };
  }

  /**
   * 生成对账报告
   */
  private async generateReconciliationReport(
    reconciliation: ReconciliationRecord,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('对账报告');

    // 设置表头
    worksheet.addRow(['对账批次号', reconciliation.batchNo]);
    worksheet.addRow(['对账类型', reconciliation.type]);
    worksheet.addRow(['支付渠道', reconciliation.paymentChannel]);
    worksheet.addRow(['对账日期', reconciliation.reconciliationDate.toISOString().split('T')[0]]);
    worksheet.addRow(['对账状态', reconciliation.status]);
    worksheet.addRow([]);

    // 统计数据
    worksheet.addRow(['统计项目', '系统数据', '第三方数据', '差异']);
    worksheet.addRow([
      '交易笔数',
      reconciliation.systemTransactionCount,
      reconciliation.thirdPartyTransactionCount,
      reconciliation.transactionCountDiff,
    ]);
    worksheet.addRow([
      '交易金额',
      reconciliation.systemTransactionAmount,
      reconciliation.thirdPartyTransactionAmount,
      reconciliation.transactionAmountDiff,
    ]);
    worksheet.addRow([
      '退款笔数',
      reconciliation.systemRefundCount,
      reconciliation.thirdPartyRefundCount,
      reconciliation.refundCountDiff,
    ]);
    worksheet.addRow([
      '退款金额',
      reconciliation.systemRefundAmount,
      reconciliation.thirdPartyRefundAmount,
      reconciliation.refundAmountDiff,
    ]);

    // 生成文件
    const fileName = `对账报告_${reconciliation.batchNo}.xlsx`;
    const filePath = path.join(process.cwd(), 'uploads', 'reconciliation', fileName);

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    // 更新报告文件路径
    reconciliation.reportFilePath = filePath;
    await this.reconciliationRepository.save(reconciliation);

    this.logger.log(`对账报告生成成功: ${fileName}`);
  }

  /**
   * 查询对账记录
   */
  async findReconciliations(
    queryDto: QueryReconciliationDto,
  ): Promise<{
    reconciliations: ReconciliationRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      type,
      status,
      paymentChannel,
      startDate,
      endDate,
    } = queryDto;

    const queryBuilder = this.reconciliationRepository.createQueryBuilder(
      'reconciliation',
    );

    if (type) {
      queryBuilder.andWhere('reconciliation.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('reconciliation.status = :status', { status });
    }

    if (paymentChannel) {
      queryBuilder.andWhere('reconciliation.paymentChannel = :paymentChannel', {
        paymentChannel,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'reconciliation.reconciliationDate BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    }

    const total = await queryBuilder.getCount();
    const reconciliations = await queryBuilder
      .orderBy('reconciliation.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      reconciliations,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取对账结果
   */
  async getReconciliationResult(
    id: string,
  ): Promise<ReconciliationResultDto> {
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id },
    });

    if (!reconciliation) {
      throw new Error('对账记录不存在');
    }

    return {
      id: reconciliation.id,
      batchNo: reconciliation.batchNo,
      type: reconciliation.type,
      status: reconciliation.status,
      paymentChannel: reconciliation.paymentChannel,
      reconciliationDate: reconciliation.reconciliationDate,
      hasDiscrepancy: reconciliation.hasDiscrepancy,
      matchRate: reconciliation.matchRate,
      systemData: {
        transactionCount: reconciliation.systemTransactionCount,
        transactionAmount: reconciliation.systemTransactionAmount,
        refundCount: reconciliation.systemRefundCount,
        refundAmount: reconciliation.systemRefundAmount,
      },
      thirdPartyData: {
        transactionCount: reconciliation.thirdPartyTransactionCount,
        transactionAmount: reconciliation.thirdPartyTransactionAmount,
        refundCount: reconciliation.thirdPartyRefundCount,
        refundAmount: reconciliation.thirdPartyRefundAmount,
      },
      differences: {
        transactionCountDiff: reconciliation.transactionCountDiff,
        transactionAmountDiff: reconciliation.transactionAmountDiff,
        refundCountDiff: reconciliation.refundCountDiff,
        refundAmountDiff: reconciliation.refundAmountDiff,
      },
      matchResult: {
        matchedCount: reconciliation.matchedCount,
        unmatchedCount: reconciliation.unmatchedCount,
        exceptionCount: reconciliation.exceptionCount,
      },
      reportFilePath: reconciliation.reportFilePath,
      processingDuration: reconciliation.processingDuration,
      createdAt: reconciliation.createdAt,
      updatedAt: reconciliation.updatedAt,
    };
  }

  /**
   * 生成批次号
   */
  private generateBatchNo(
    type: ReconciliationType,
    channel: PaymentChannel,
  ): string {
    const timestamp = Date.now();
    const typePrefix = type.toUpperCase().substring(0, 1);
    const channelPrefix = channel.toUpperCase().substring(0, 1);
    return `RC${typePrefix}${channelPrefix}${timestamp}`;
  }

  /**
   * 获取对账日期范围
   */
  private getReconciliationDateRange(
    reconciliationDate: Date,
    type: ReconciliationType,
  ): { startDate: Date; endDate: Date } {
    const date = new Date(reconciliationDate);
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case ReconciliationType.DAILY:
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        break;

      case ReconciliationType.WEEKLY:
        const dayOfWeek = date.getDay();
        startDate = new Date(date);
        startDate.setDate(date.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case ReconciliationType.MONTHLY:
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        break;

      default:
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  /**
   * 手动标记对账完成
   */
  async markAsCompleted(id: string, remark?: string): Promise<ReconciliationRecord> {
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id },
    });

    if (!reconciliation) {
      throw new Error('对账记录不存在');
    }

    reconciliation.status = ReconciliationStatus.COMPLETED;
    if (remark) {
      reconciliation.remark = remark;
    }

    const updatedReconciliation = await this.reconciliationRepository.save(
      reconciliation,
    );
    this.logger.log(`对账标记完成: ${reconciliation.batchNo}`);
    return updatedReconciliation;
  }

  /**
   * 获取对账报告文件
   */
  async getReportFile(id: string): Promise<string> {
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id },
    });

    if (!reconciliation || !reconciliation.reportFilePath) {
      throw new Error('对账报告文件不存在');
    }

    if (!fs.existsSync(reconciliation.reportFilePath)) {
      throw new Error('对账报告文件已被删除');
    }

    return reconciliation.reportFilePath;
  }
}