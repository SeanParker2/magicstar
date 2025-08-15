import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  FinancialReport,
  ReportType,
  ReportStatus,
} from './entities/financial-report.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Refund, RefundStatus } from './entities/refund.entity';
import { User } from '../../user/entities/user.entity';
import { PaymentLogService } from './payment-log.service';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

export interface ReportGenerationOptions {
  reportType: ReportType;
  startDate: Date;
  endDate: Date;
  includeDetails?: boolean;
  exportFormat?: 'json' | 'excel' | 'csv';
  userId?: number;
}

export interface RevenueStats {
  totalRevenue: number;
  paymentRevenue: number;
  refundAmount: number;
  netRevenue: number;
  transactionCount: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundTransactions: number;
  averageTransactionAmount: number;
  successRate: number;
  refundRate: number;
}

export interface UserStats {
  uniqueUsers: number;
  newUsers: number;
  returningUsers: number;
  averageUserSpending: number;
}

export interface PaymentMethodStats {
  [method: string]: {
    count: number;
    amount: number;
    percentage: number;
  };
}

@Injectable()
export class FinancialReportService {
  private readonly logger = new Logger(FinancialReportService.name);

  constructor(
    @InjectRepository(FinancialReport)
    private readonly financialReportRepository: Repository<FinancialReport>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paymentLogService: PaymentLogService,
  ) {}

  /**
   * 生成财务报表
   */
  async generateReport(options: ReportGenerationOptions): Promise<FinancialReport> {
    this.logger.log(`开始生成财务报表: ${options.reportType}`);

    // 创建报表记录
    const report = this.financialReportRepository.create({
      report_type: options.reportType,
      status: ReportStatus.GENERATING,
      report_date: new Date(),
      start_date: options.startDate,
      end_date: options.endDate,
      generated_by: options.userId,
    });

    const savedReport = await this.financialReportRepository.save(report);

    try {
      // 生成报表数据
      const reportData = await this.generateReportData(options.startDate, options.endDate);
      
      // 更新报表
      Object.assign(savedReport, reportData);
      savedReport.status = ReportStatus.COMPLETED;
      savedReport.generated_at = new Date();

      // 如果需要导出文件
      if (options.exportFormat) {
        const filePath = await this.exportReport(savedReport, options.exportFormat);
        savedReport.file_path = filePath;
        savedReport.file_format = options.exportFormat;
        savedReport.exported_at = new Date();
      }

      const finalReport = await this.financialReportRepository.save(savedReport);
      
      this.logger.log(`财务报表生成完成: ${finalReport.id}`);
      return finalReport;
    } catch (error) {
      this.logger.error(`财务报表生成失败: ${error.message}`, error.stack);
      
      savedReport.status = ReportStatus.FAILED;
      await this.financialReportRepository.save(savedReport);
      
      throw error;
    }
  }

  /**
   * 生成报表数据
   */
  private async generateReportData(startDate: Date, endDate: Date) {
    const [revenueStats, userStats, paymentMethodStats, hourlyStats, dailyStats] = await Promise.all([
      this.getRevenueStats(startDate, endDate),
      this.getUserStats(startDate, endDate),
      this.getPaymentMethodStats(startDate, endDate),
      this.getHourlyStats(startDate, endDate),
      this.getDailyStats(startDate, endDate),
    ]);

    return {
      total_revenue: revenueStats.totalRevenue,
      payment_revenue: revenueStats.paymentRevenue,
      refund_amount: revenueStats.refundAmount,
      net_revenue: revenueStats.netRevenue,
      total_transactions: revenueStats.transactionCount,
      successful_transactions: revenueStats.successfulTransactions,
      failed_transactions: revenueStats.failedTransactions,
      refund_transactions: revenueStats.refundTransactions,
      average_transaction_amount: revenueStats.averageTransactionAmount,
      success_rate: revenueStats.successRate,
      refund_rate: revenueStats.refundRate,
      unique_users: userStats.uniqueUsers,
      new_users: userStats.newUsers,
      returning_users: userStats.returningUsers,
      average_user_spending: userStats.averageUserSpending,
      payment_method_stats: paymentMethodStats,
      hourly_stats: hourlyStats,
      daily_stats: dailyStats,
    };
  }

  /**
   * 获取收入统计
   */
  private async getRevenueStats(startDate: Date, endDate: Date): Promise<RevenueStats> {
    // 获取支付数据
    const payments = await this.paymentRepository.find({
      where: {
        created_at: Between(startDate, endDate),
      },
    });

    // 获取退款数据
    const refunds = await this.refundRepository.find({
      where: {
        created_at: Between(startDate, endDate),
        status: RefundStatus.COMPLETED,
      },
    });

    const successfulPayments = payments.filter(p => p.status === PaymentStatus.COMPLETED);
    const failedPayments = payments.filter(p => p.status === PaymentStatus.FAILED);

    const totalRevenue = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const refundAmount = refunds.reduce((sum, r) => sum + Number(r.refund_amount), 0);
    const netRevenue = totalRevenue - refundAmount;

    const averageTransactionAmount = successfulPayments.length > 0 
      ? totalRevenue / successfulPayments.length 
      : 0;

    const successRate = payments.length > 0 
      ? (successfulPayments.length / payments.length) * 100 
      : 0;

    const refundRate = successfulPayments.length > 0 
      ? (refunds.length / successfulPayments.length) * 100 
      : 0;

    return {
      totalRevenue,
      paymentRevenue: totalRevenue,
      refundAmount,
      netRevenue,
      transactionCount: payments.length,
      successfulTransactions: successfulPayments.length,
      failedTransactions: failedPayments.length,
      refundTransactions: refunds.length,
      averageTransactionAmount,
      successRate,
      refundRate,
    };
  }

  /**
   * 获取用户统计
   */
  private async getUserStats(startDate: Date, endDate: Date): Promise<UserStats> {
    // 获取期间内有支付行为的用户
    const paymentUsers = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DISTINCT payment.user_id', 'user_id')
      .addSelect('MIN(payment.created_at)', 'first_payment')
      .where('payment.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.user_id')
      .getRawMany();

    // 获取新用户（首次支付在统计期间内）
    const newUsers = paymentUsers.filter(u => {
      const firstPayment = new Date(u.first_payment);
      return firstPayment >= startDate && firstPayment <= endDate;
    });

    // 计算平均用户消费
    const userSpending = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.user_id', 'user_id')
      .addSelect('SUM(payment.amount)', 'total_amount')
      .where('payment.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.user_id')
      .getRawMany();

    const totalSpending = userSpending.reduce((sum, u) => sum + Number(u.total_amount), 0);
    const averageUserSpending = userSpending.length > 0 ? totalSpending / userSpending.length : 0;

    return {
      uniqueUsers: paymentUsers.length,
      newUsers: newUsers.length,
      returningUsers: paymentUsers.length - newUsers.length,
      averageUserSpending,
    };
  }

  /**
   * 获取支付方式统计
   */
  private async getPaymentMethodStats(startDate: Date, endDate: Date): Promise<PaymentMethodStats> {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.payment_method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('payment.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.payment_method')
      .getRawMany();

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const stats: PaymentMethodStats = {};

    payments.forEach(p => {
      const percentage = totalAmount > 0 ? (Number(p.amount) / totalAmount) * 100 : 0;
      stats[p.method] = {
        count: Number(p.count),
        amount: Number(p.amount),
        percentage,
      };
    });

    return stats;
  }

  /**
   * 获取小时统计
   */
  private async getHourlyStats(startDate: Date, endDate: Date) {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('HOUR(payment.created_at)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('payment.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('HOUR(payment.created_at)')
      .getRawMany();

    const stats: Record<string, any> = {};
    payments.forEach(p => {
      stats[p.hour] = {
        hour: Number(p.hour),
        count: Number(p.count),
        amount: Number(p.amount),
      };
    });

    return stats;
  }

  /**
   * 获取日统计
   */
  private async getDailyStats(startDate: Date, endDate: Date) {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('payment.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('DATE(payment.created_at)')
      .getRawMany();

    const stats: Record<string, any> = {};
    payments.forEach(p => {
      stats[p.date] = {
        date: p.date,
        count: Number(p.count),
        amount: Number(p.amount),
      };
    });

    return stats;
  }

  /**
   * 导出报表
   */
  private async exportReport(report: FinancialReport, format: string): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports', 'financial-reports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `financial-report-${report.id}-${Date.now()}.${format}`;
    const filePath = path.join(exportDir, fileName);

    switch (format) {
      case 'excel':
        await this.exportToExcel(report, filePath);
        break;
      case 'json':
        await this.exportToJson(report, filePath);
        break;
      case 'csv':
        await this.exportToCsv(report, filePath);
        break;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }

    const stats = fs.statSync(filePath);
    report.file_size = stats.size;

    return filePath;
  }

  /**
   * 导出到Excel
   */
  private async exportToExcel(report: FinancialReport, filePath: string) {
    const workbook = new ExcelJS.Workbook();
    
    // 概览工作表
    const summarySheet = workbook.addWorksheet('财务概览');
    summarySheet.addRow(['报表类型', report.report_type]);
    summarySheet.addRow(['报表期间', report.report_period]);
    summarySheet.addRow(['总收入', report.total_revenue_formatted]);
    summarySheet.addRow(['净收入', report.net_revenue_formatted]);
    summarySheet.addRow(['退款金额', `¥${report.refund_amount.toLocaleString()}`]);
    summarySheet.addRow(['交易总数', report.total_transactions]);
    summarySheet.addRow(['成功交易', report.successful_transactions]);
    summarySheet.addRow(['成功率', report.success_rate_formatted]);
    summarySheet.addRow(['退款率', report.refund_rate_formatted]);
    summarySheet.addRow(['独立用户', report.unique_users]);
    summarySheet.addRow(['新用户', report.new_users]);
    summarySheet.addRow(['平均交易金额', `¥${report.average_transaction_amount.toLocaleString()}`]);
    summarySheet.addRow(['平均用户消费', `¥${report.average_user_spending.toLocaleString()}`]);

    // 支付方式统计工作表
    if (report.payment_method_stats) {
      const methodSheet = workbook.addWorksheet('支付方式统计');
      methodSheet.addRow(['支付方式', '交易数量', '交易金额', '占比']);
      
      Object.entries(report.payment_method_stats).forEach(([method, stats]) => {
        methodSheet.addRow([
          method,
          stats.count,
          `¥${stats.amount.toLocaleString()}`,
          `${stats.percentage.toFixed(2)}%`
        ]);
      });
    }

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * 导出到JSON
   */
  private async exportToJson(report: FinancialReport, filePath: string) {
    const data = {
      report_info: {
        id: report.id,
        type: report.report_type,
        period: report.report_period,
        generated_at: report.generated_at,
      },
      summary: {
        total_revenue: report.total_revenue,
        net_revenue: report.net_revenue,
        refund_amount: report.refund_amount,
        total_transactions: report.total_transactions,
        successful_transactions: report.successful_transactions,
        success_rate: report.success_rate,
        refund_rate: report.refund_rate,
        unique_users: report.unique_users,
        new_users: report.new_users,
        average_transaction_amount: report.average_transaction_amount,
        average_user_spending: report.average_user_spending,
      },
      payment_method_stats: report.payment_method_stats,
      hourly_stats: report.hourly_stats,
      daily_stats: report.daily_stats,
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * 导出到CSV
   */
  private async exportToCsv(report: FinancialReport, filePath: string) {
    const csvData = [
      ['指标', '数值'],
      ['报表类型', report.report_type],
      ['报表期间', report.report_period],
      ['总收入', report.total_revenue],
      ['净收入', report.net_revenue],
      ['退款金额', report.refund_amount],
      ['交易总数', report.total_transactions],
      ['成功交易', report.successful_transactions],
      ['成功率', `${report.success_rate}%`],
      ['退款率', `${report.refund_rate}%`],
      ['独立用户', report.unique_users],
      ['新用户', report.new_users],
      ['平均交易金额', report.average_transaction_amount],
      ['平均用户消费', report.average_user_spending],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    fs.writeFileSync(filePath, csvContent);
  }

  /**
   * 获取报表列表
   */
  async getReports(page = 1, limit = 20, filters?: {
    reportType?: ReportType;
    status?: ReportStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const queryBuilder = this.financialReportRepository.createQueryBuilder('report');

    if (filters?.reportType) {
      queryBuilder.andWhere('report.report_type = :reportType', { reportType: filters.reportType });
    }

    if (filters?.status) {
      queryBuilder.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('report.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('report.created_at <= :endDate', { endDate: filters.endDate });
    }

    const [reports, total] = await queryBuilder
      .orderBy('report.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取报表详情
   */
  async getReportById(id: number): Promise<FinancialReport> {
    const report = await this.financialReportRepository.findOne({
      where: { id },
    });

    if (!report) {
      throw new Error(`报表不存在: ${id}`);
    }

    return report;
  }

  /**
   * 删除报表
   */
  async deleteReport(id: number): Promise<void> {
    const report = await this.getReportById(id);
    
    // 删除文件
    if (report.file_path && fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    await this.financialReportRepository.delete(id);
    this.logger.log(`财务报表已删除: ${id}`);
  }

  /**
   * 定时生成日报
   */
  // @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateDailyReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endDate = new Date(yesterday);
    endDate.setHours(23, 59, 59, 999);

    try {
      await this.generateReport({
        reportType: ReportType.DAILY,
        startDate: yesterday,
        endDate,
        exportFormat: 'excel',
      });
      
      this.logger.log('日报生成完成');
    } catch (error) {
      this.logger.error('日报生成失败', error.stack);
    }
  }

  /**
   * 定时生成周报
   */
  // @Cron(CronExpression.EVERY_MONDAY_AT_2AM)
  async generateWeeklyReport() {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    try {
      await this.generateReport({
        reportType: ReportType.WEEKLY,
        startDate: lastWeek,
        endDate,
        exportFormat: 'excel',
      });
      
      this.logger.log('周报生成完成');
    } catch (error) {
      this.logger.error('周报生成失败', error.stack);
    }
  }

  /**
   * 定时生成月报
   */
  // @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_3AM)
  async generateMonthlyReport() {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);
    
    const endDate = new Date(lastMonth);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);

    try {
      await this.generateReport({
        reportType: ReportType.MONTHLY,
        startDate: lastMonth,
        endDate,
        exportFormat: 'excel',
      });
      
      this.logger.log('月报生成完成');
    } catch (error) {
      this.logger.error('月报生成失败', error.stack);
    }
  }

  /**
   * 获取实时财务概览
   */
  async getRealtimeOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const [todayStats, monthStats, yearStats] = await Promise.all([
      this.getRevenueStats(today, endOfToday),
      this.getRevenueStats(new Date(today.getFullYear(), today.getMonth(), 1), endOfToday),
      this.getRevenueStats(new Date(today.getFullYear(), 0, 1), endOfToday),
    ]);

    return {
      today: todayStats,
      thisMonth: monthStats,
      thisYear: yearStats,
      lastUpdated: new Date(),
    };
  }
}