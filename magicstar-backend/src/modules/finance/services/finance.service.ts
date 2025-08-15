import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  FinancialRecord,
  FinancialRecordType,
  FinancialRecordStatus,
} from '../entities/financial-record.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Order } from '../../shop/entities/order.entity';
import { CreateFinancialRecordDto } from '../dto/create-financial-record.dto';
import { QueryFinancialRecordsDto } from '../dto/query-financial-records.dto';
import { FinancialSummaryDto } from '../dto/financial-summary.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(FinancialRecord)
    private readonly financialRecordRepository: Repository<FinancialRecord>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * 创建财务记录
   */
  async createFinancialRecord(
    createDto: CreateFinancialRecordDto,
  ): Promise<FinancialRecord> {
    try {
      const record = this.financialRecordRepository.create({
        ...createDto,
        recordDate: createDto.recordDate || new Date(),
      });

      const savedRecord = await this.financialRecordRepository.save(record);
      this.logger.log(`财务记录创建成功: ${savedRecord.id}`);
      return savedRecord;
    } catch (error) {
      this.logger.error(`创建财务记录失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据支付记录创建财务记录
   */
  async createRecordFromPayment(payment: Payment): Promise<FinancialRecord> {
    const createDto: CreateFinancialRecordDto = {
      type: FinancialRecordType.INCOME,
      status: FinancialRecordStatus.CONFIRMED,
      amount: payment.amount,
      currency: payment.currency,
      userId: payment.userId,
      paymentId: payment.id,
      orderId: payment.orderId,
      businessType: 'payment',
      description: `支付收入 - ${payment.paymentMethod}`,
      recordDate: payment.paidAt || new Date(),
      metadata: {
        paymentMethod: payment.paymentMethod,
        thirdPartyTransactionId: payment.transactionId,
      },
    };

    return this.createFinancialRecord(createDto);
  }

  /**
   * 查询财务记录
   */
  async findFinancialRecords(
    queryDto: QueryFinancialRecordsDto,
  ): Promise<{
    records: FinancialRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      type,
      status,
      userId,
      startDate,
      endDate,
      businessType,
    } = queryDto;

    const queryBuilder = this.financialRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.user', 'user')
      .leftJoinAndSelect('record.payment', 'payment')
      .leftJoinAndSelect('record.order', 'order');

    // 条件筛选
    if (type) {
      queryBuilder.andWhere('record.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('record.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('record.userId = :userId', { userId });
    }

    if (businessType) {
      queryBuilder.andWhere('record.businessType = :businessType', {
        businessType,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('record.recordDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // 分页和排序
    const total = await queryBuilder.getCount();
    const records = await queryBuilder
      .orderBy('record.recordDate', 'DESC')
      .addOrderBy('record.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      records,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取财务汇总信息
   */
  async getFinancialSummary(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<FinancialSummaryDto> {
    const whereConditions: any = {
      recordDate: Between(startDate, endDate),
      status: FinancialRecordStatus.CONFIRMED,
    };

    if (userId) {
      whereConditions.userId = userId;
    }

    // 收入统计
    const incomeResult = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select('SUM(record.amount)', 'totalAmount')
      .addSelect('COUNT(record.id)', 'totalCount')
      .where({
        ...whereConditions,
        type: FinancialRecordType.INCOME,
      })
      .getRawOne();

    // 支出统计
    const expenseTypes = [
      FinancialRecordType.REFUND,
      FinancialRecordType.FEE,
      FinancialRecordType.COMMISSION,
    ];

    const expenseResult = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select('SUM(record.amount)', 'totalAmount')
      .addSelect('COUNT(record.id)', 'totalCount')
      .where({
        ...whereConditions,
        type: In(expenseTypes),
      })
      .getRawOne();

    // 按类型分组统计
    const typeStats = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select('record.type', 'type')
      .addSelect('SUM(record.amount)', 'totalAmount')
      .addSelect('COUNT(record.id)', 'totalCount')
      .where(whereConditions)
      .groupBy('record.type')
      .getRawMany();

    const totalIncome = parseFloat(incomeResult?.totalAmount || '0');
    const totalExpense = parseFloat(expenseResult?.totalAmount || '0');
    const netIncome = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netIncome,
      incomeCount: parseInt(incomeResult?.totalCount || '0'),
      expenseCount: parseInt(expenseResult?.totalCount || '0'),
      typeStats: typeStats.map(stat => ({
        type: stat.type,
        amount: parseFloat(stat.totalAmount),
        count: parseInt(stat.totalCount),
      })),
      period: {
        startDate,
        endDate,
      },
    };
  }

  /**
   * 获取收入趋势数据
   */
  async getIncomeTrend(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<Array<{ date: string; amount: number; count: number }>> {
    let dateFormat: string;
    switch (granularity) {
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const result = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select(`DATE_FORMAT(record.recordDate, '${dateFormat}')`, 'date')
      .addSelect('SUM(record.amount)', 'amount')
      .addSelect('COUNT(record.id)', 'count')
      .where({
        recordDate: Between(startDate, endDate),
        type: FinancialRecordType.INCOME,
        status: FinancialRecordStatus.CONFIRMED,
      })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map(item => ({
      date: item.date,
      amount: parseFloat(item.amount || '0'),
      count: parseInt(item.count || '0'),
    }));
  }

  /**
   * 更新财务记录状态
   */
  async updateRecordStatus(
    id: string,
    status: FinancialRecordStatus,
    remark?: string,
  ): Promise<FinancialRecord> {
    const record = await this.financialRecordRepository.findOne({
      where: { id },
    });

    if (!record) {
      throw new Error(`财务记录不存在: ${id}`);
    }

    record.status = status;
    if (remark) {
      record.remark = remark;
    }

    const updatedRecord = await this.financialRecordRepository.save(record);
    this.logger.log(`财务记录状态更新: ${id} -> ${status}`);
    return updatedRecord;
  }

  /**
   * 删除财务记录
   */
  async deleteRecord(id: string): Promise<void> {
    const result = await this.financialRecordRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`财务记录不存在: ${id}`);
    }
    this.logger.log(`财务记录删除成功: ${id}`);
  }

  /**
   * 批量创建财务记录
   */
  async batchCreateRecords(
    records: CreateFinancialRecordDto[],
  ): Promise<FinancialRecord[]> {
    try {
      const entities = records.map(record =>
        this.financialRecordRepository.create({
          ...record,
          recordDate: record.recordDate || new Date(),
        }),
      );

      const savedRecords = await this.financialRecordRepository.save(entities);
      this.logger.log(`批量创建财务记录成功: ${savedRecords.length} 条`);
      return savedRecords;
    } catch (error) {
      this.logger.error(`批量创建财务记录失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量创建财务记录（别名）
   */
  async createBatch(
    records: CreateFinancialRecordDto[],
  ): Promise<FinancialRecord[]> {
    try {
      const financialRecords = records.map(record =>
        this.financialRecordRepository.create(record),
      );
      const savedRecords = await this.financialRecordRepository.save(
        financialRecords,
      );
      this.logger.log(`批量创建财务记录成功: ${savedRecords.length}条`);
      return savedRecords;
    } catch (error) {
      this.logger.error(`批量创建财务记录失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建财务记录（别名）
   */
  async create(createDto: CreateFinancialRecordDto): Promise<FinancialRecord> {
    return this.createFinancialRecord(createDto);
  }

  /**
   * 查询财务记录（别名）
   */
  async findAll(queryDto: QueryFinancialRecordsDto): Promise<{
    records: FinancialRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.findFinancialRecords(queryDto);
  }

  /**
   * 根据ID查找财务记录
   */
  async findOne(id: string): Promise<FinancialRecord> {
    const record = await this.financialRecordRepository.findOne({
      where: { id },
      relations: ['user', 'payment', 'order'],
    });

    if (!record) {
      throw new Error('财务记录不存在');
    }

    return record;
  }

  /**
   * 获取财务汇总（别名）
   */
  async getSummary(
    startDate?: Date,
    endDate?: Date,
    userId?: string,
  ): Promise<FinancialSummaryDto> {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();
    return this.getFinancialSummary(start, end, userId);
  }
}