import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  FinancialRecord,
  FinancialRecordType,
  FinancialRecordStatus,
} from '../entities/financial-record.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Order } from '../../shop/entities/order.entity';
import { RefundRecord, RefundStatus } from '../entities/refund-record.entity';
import {
  DailyReportDto,
  MonthlyReportDto,
  PaymentChannelReportDto,
  UserReportDto,
  ExportReportDto,
} from '../dto/report.dto';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(FinancialRecord)
    private readonly financialRecordRepository: Repository<FinancialRecord>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(RefundRecord)
    private readonly refundRecordRepository: Repository<RefundRecord>,
  ) {}

  /**
   * 生成日报
   */
  async generateDailyReport(date: Date): Promise<DailyReportDto> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // 收入统计
    const incomeStats = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select('SUM(record.amount)', 'totalAmount')
      .addSelect('COUNT(record.id)', 'totalCount')
      .where({
        recordDate: Between(startDate, endDate),
        type: FinancialRecordType.INCOME,
        status: FinancialRecordStatus.CONFIRMED,
      })
      .getRawOne();

    // 退款统计
    const refundStats = await this.refundRecordRepository
      .createQueryBuilder('refund')
      .select('SUM(refund.amount)', 'totalAmount')
      .addSelect('COUNT(refund.id)', 'totalCount')
      .where({
        refundDate: Between(startDate, endDate),
        status: RefundStatus.SUCCESS,
      })
      .getRawOne();

    // 支付方式统计
    const paymentMethodStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'method')
      .addSelect('SUM(payment.amount)', 'totalAmount')
      .addSelect('COUNT(payment.id)', 'totalCount')
      .where({
        paidAt: Between(startDate, endDate),
        status: 'paid',
      })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    // 新用户统计
    const newUserCount = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(DISTINCT payment.userId)', 'count')
      .where({
        paidAt: Between(startDate, endDate),
        status: 'paid',
      })
      .andWhere(
        'payment.userId NOT IN (SELECT DISTINCT p2.userId FROM payments p2 WHERE p2.paidAt < :startDate)',
        { startDate },
      )
      .getRawOne();

    // 订单统计
    const orderStats = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalCount')
      .addSelect('SUM(order.totalAmount)', 'totalAmount')
      .where({
        createdAt: Between(startDate, endDate),
        status: 'paid',
      })
      .getRawOne();

    return {
      date: date.toISOString().split('T')[0],
      income: {
        totalAmount: parseFloat(incomeStats?.totalAmount || '0'),
        totalCount: parseInt(incomeStats?.totalCount || '0'),
      },
      refund: {
        totalAmount: parseFloat(refundStats?.totalAmount || '0'),
        totalCount: parseInt(refundStats?.totalCount || '0'),
      },
      netIncome:
        parseFloat(incomeStats?.totalAmount || '0') -
        parseFloat(refundStats?.totalAmount || '0'),
      paymentMethods: paymentMethodStats.map(stat => ({
        method: stat.method,
        amount: parseFloat(stat.totalAmount),
        count: parseInt(stat.totalCount),
      })),
      newUserCount: parseInt(newUserCount?.count || '0'),
      orders: {
        totalCount: parseInt(orderStats?.totalCount || '0'),
        totalAmount: parseFloat(orderStats?.totalAmount || '0'),
      },
    };
  }

  /**
   * 生成月报
   */
  async generateMonthlyReport(
    year: number,
    month: number,
  ): Promise<MonthlyReportDto> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 按日统计
    const dailyStats = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select('DATE(record.recordDate)', 'date')
      .addSelect('SUM(CASE WHEN record.type = :income THEN record.amount ELSE 0 END)', 'income')
      .addSelect('SUM(CASE WHEN record.type = :refund THEN record.amount ELSE 0 END)', 'refund')
      .addSelect('COUNT(CASE WHEN record.type = :income THEN 1 END)', 'incomeCount')
      .addSelect('COUNT(CASE WHEN record.type = :refund THEN 1 END)', 'refundCount')
      .where({
        recordDate: Between(startDate, endDate),
        status: FinancialRecordStatus.CONFIRMED,
      })
      .setParameters({
        income: FinancialRecordType.INCOME,
        refund: FinancialRecordType.REFUND,
      })
      .groupBy('DATE(record.recordDate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 月度汇总
    const monthlyTotal = await this.financialRecordRepository
      .createQueryBuilder('record')
      .select('SUM(CASE WHEN record.type = :income THEN record.amount ELSE 0 END)', 'totalIncome')
      .addSelect('SUM(CASE WHEN record.type = :refund THEN record.amount ELSE 0 END)', 'totalRefund')
      .addSelect('COUNT(CASE WHEN record.type = :income THEN 1 END)', 'incomeCount')
      .addSelect('COUNT(CASE WHEN record.type = :refund THEN 1 END)', 'refundCount')
      .where({
        recordDate: Between(startDate, endDate),
        status: FinancialRecordStatus.CONFIRMED,
      })
      .setParameters({
        income: FinancialRecordType.INCOME,
        refund: FinancialRecordType.REFUND,
      })
      .getRawOne();

    // 用户统计
    const userStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COUNT(DISTINCT payment.userId)', 'activeUsers')
      .where({
        paidAt: Between(startDate, endDate),
        status: 'paid',
      })
      .getRawOne();

    const totalIncome = parseFloat(monthlyTotal?.totalIncome || '0');
    const totalRefund = parseFloat(monthlyTotal?.totalRefund || '0');

    return {
      year,
      month,
      summary: {
        totalIncome,
        totalRefund,
        netIncome: totalIncome - totalRefund,
        incomeCount: parseInt(monthlyTotal?.incomeCount || '0'),
        refundCount: parseInt(monthlyTotal?.refundCount || '0'),
        activeUsers: parseInt(userStats?.activeUsers || '0'),
      },
      dailyData: dailyStats.map(stat => ({
        date: stat.date,
        income: parseFloat(stat.income || '0'),
        refund: parseFloat(stat.refund || '0'),
        netIncome: parseFloat(stat.income || '0') - parseFloat(stat.refund || '0'),
        incomeCount: parseInt(stat.incomeCount || '0'),
        refundCount: parseInt(stat.refundCount || '0'),
      })),
    };
  }

  /**
   * 生成支付渠道报表
   */
  async generatePaymentChannelReport(
    startDate: Date,
    endDate: Date,
  ): Promise<PaymentChannelReportDto[]> {
    const channelStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'channel')
      .addSelect('SUM(payment.amount)', 'totalAmount')
      .addSelect('COUNT(payment.id)', 'totalCount')
      .addSelect('AVG(payment.amount)', 'avgAmount')
      .addSelect('MAX(payment.amount)', 'maxAmount')
      .addSelect('MIN(payment.amount)', 'minAmount')
      .where({
        paidAt: Between(startDate, endDate),
        status: 'paid',
      })
      .groupBy('payment.paymentMethod')
      .orderBy('totalAmount', 'DESC')
      .getRawMany();

    // 获取退款统计
    const refundStats = await this.refundRecordRepository
      .createQueryBuilder('refund')
      .leftJoin('refund.payment', 'payment')
      .select('payment.paymentMethod', 'channel')
      .addSelect('SUM(refund.amount)', 'refundAmount')
      .addSelect('COUNT(refund.id)', 'refundCount')
      .where({
        refundDate: Between(startDate, endDate),
        status: RefundStatus.SUCCESS,
      })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    const refundMap = new Map(
      refundStats.map(stat => [
        stat.channel,
        {
          amount: parseFloat(stat.refundAmount || '0'),
          count: parseInt(stat.refundCount || '0'),
        },
      ]),
    );

    return channelStats.map(stat => {
      const refundData = refundMap.get(stat.channel) || { amount: 0, count: 0 };
      const totalAmount = parseFloat(stat.totalAmount);
      const refundAmount = refundData.amount;

      return {
        channel: stat.channel,
        totalAmount,
        totalCount: parseInt(stat.totalCount),
        avgAmount: parseFloat(stat.avgAmount),
        maxAmount: parseFloat(stat.maxAmount),
        minAmount: parseFloat(stat.minAmount),
        refundAmount,
        refundCount: refundData.count,
        netAmount: totalAmount - refundAmount,
        refundRate: totalAmount > 0 ? (refundAmount / totalAmount) * 100 : 0,
      };
    });
  }

  /**
   * 生成用户报表
   */
  async generateUserReport(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<UserReportDto[]> {
    const userStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.user', 'user')
      .select('payment.userId', 'userId')
      .addSelect('user.nickname', 'nickname')
      .addSelect('SUM(payment.amount)', 'totalAmount')
      .addSelect('COUNT(payment.id)', 'totalCount')
      .addSelect('AVG(payment.amount)', 'avgAmount')
      .addSelect('MAX(payment.paidAt)', 'lastPaymentAt')
      .addSelect('MIN(payment.paidAt)', 'firstPaymentAt')
      .where({
        paidAt: Between(startDate, endDate),
        status: 'paid',
      })
      .groupBy('payment.userId')
      .addGroupBy('user.nickname')
      .orderBy('totalAmount', 'DESC')
      .limit(limit)
      .getRawMany();

    return userStats.map(stat => ({
      userId: stat.userId,
      nickname: stat.nickname || '未知用户',
      totalAmount: parseFloat(stat.totalAmount),
      totalCount: parseInt(stat.totalCount),
      avgAmount: parseFloat(stat.avgAmount),
      firstPaymentAt: stat.firstPaymentAt,
      lastPaymentAt: stat.lastPaymentAt,
    }));
  }

  /**
   * 导出财务报表
   */
  async exportReport(
    type: 'daily' | 'monthly' | 'channel' | 'user',
    params: any,
  ): Promise<ExportReportDto> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('财务报表');

    let data: any[];
    let headers: string[];

    switch (type) {
      case 'daily':
        const dailyReport = await this.generateDailyReport(params.date);
        headers = ['日期', '收入金额', '收入笔数', '退款金额', '退款笔数', '净收入'];
        data = [
          [
            dailyReport.date,
            dailyReport.income.totalAmount,
            dailyReport.income.totalCount,
            dailyReport.refund.totalAmount,
            dailyReport.refund.totalCount,
            dailyReport.netIncome,
          ],
        ];
        break;

      case 'monthly':
        const monthlyReport = await this.generateMonthlyReport(
          params.year,
          params.month,
        );
        headers = ['日期', '收入金额', '退款金额', '净收入', '收入笔数', '退款笔数'];
        data = monthlyReport.dailyData.map(day => [
          day.date,
          day.income,
          day.refund,
          day.netIncome,
          day.incomeCount,
          day.refundCount,
        ]);
        break;

      case 'channel':
        const channelReport = await this.generatePaymentChannelReport(
          params.startDate,
          params.endDate,
        );
        headers = [
          '支付渠道',
          '总金额',
          '总笔数',
          '平均金额',
          '退款金额',
          '退款笔数',
          '净金额',
          '退款率(%)',
        ];
        data = channelReport.map(channel => [
          channel.channel,
          channel.totalAmount,
          channel.totalCount,
          channel.avgAmount,
          channel.refundAmount,
          channel.refundCount,
          channel.netAmount,
          channel.refundRate.toFixed(2),
        ]);
        break;

      case 'user':
        const userReport = await this.generateUserReport(
          params.startDate,
          params.endDate,
          params.limit,
        );
        headers = [
          '用户ID',
          '用户昵称',
          '总金额',
          '总笔数',
          '平均金额',
          '首次支付时间',
          '最后支付时间',
        ];
        data = userReport.map(user => [
          user.userId,
          user.nickname,
          user.totalAmount,
          user.totalCount,
          user.avgAmount,
          user.firstPaymentAt,
          user.lastPaymentAt,
        ]);
        break;

      default:
        throw new Error(`不支持的报表类型: ${type}`);
    }

    // 设置表头
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };

    // 添加数据
    data.forEach(row => {
      worksheet.addRow(row);
    });

    // 自动调整列宽
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // 生成文件
    const fileName = `财务报表_${type}_${Date.now()}.xlsx`;
    const filePath = path.join(process.cwd(), 'uploads', 'reports', fileName);

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    this.logger.log(`财务报表导出成功: ${fileName}`);

    return {
      fileName,
      filePath,
      downloadUrl: `/api/finance/reports/download/${fileName}`,
      createdAt: new Date(),
    };
  }

  /**
   * 获取报表文件
   */
  async getReportFile(fileName: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'uploads', 'reports', fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('报表文件不存在');
    }

    return filePath;
  }
}