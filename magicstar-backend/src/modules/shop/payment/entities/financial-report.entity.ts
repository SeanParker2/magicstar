import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('financial_reports')
@Index(['report_type'])
@Index(['status'])
@Index(['report_date'])
@Index(['created_at'])
export class FinancialReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  report_type: ReportType;

  @Column({
    type: 'varchar',
    length: 50,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'date' })
  report_date: Date;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  // 收入统计
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  payment_revenue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  refund_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  net_revenue: number;

  // 交易统计
  @Column({ type: 'int', default: 0 })
  total_transactions: number;

  @Column({ type: 'int', default: 0 })
  successful_transactions: number;

  @Column({ type: 'int', default: 0 })
  failed_transactions: number;

  @Column({ type: 'int', default: 0 })
  refund_transactions: number;

  // 支付方式统计
  @Column({ type: 'json', nullable: true })
  payment_method_stats: Record<string, {
    count: number;
    amount: number;
    percentage: number;
  }>;

  // 用户统计
  @Column({ type: 'int', default: 0 })
  unique_users: number;

  @Column({ type: 'int', default: 0 })
  new_users: number;

  @Column({ type: 'int', default: 0 })
  returning_users: number;

  // 平均值统计
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_transaction_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_user_spending: number;

  // 成功率统计
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  success_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  refund_rate: number;

  // 时间段统计
  @Column({ type: 'json', nullable: true })
  hourly_stats: Record<string, {
    hour: number;
    count: number;
    amount: number;
  }>;

  @Column({ type: 'json', nullable: true })
  daily_stats: Record<string, {
    date: string;
    count: number;
    amount: number;
  }>;

  // 报表元数据
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_path: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  file_format: string;

  @Column({ type: 'int', nullable: true })
  file_size: number;

  @Column({ type: 'datetime', nullable: true })
  generated_at: Date;

  @Column({ type: 'datetime', nullable: true })
  exported_at: Date;

  @Column({ type: 'int', nullable: true })
  generated_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 计算属性
  get revenue_growth(): number | null {
    // 这里可以实现收入增长率计算逻辑
    return null;
  }

  get transaction_growth(): number | null {
    // 这里可以实现交易增长率计算逻辑
    return null;
  }

  get is_completed(): boolean {
    return this.status === ReportStatus.COMPLETED;
  }

  get is_failed(): boolean {
    return this.status === ReportStatus.FAILED;
  }

  get processing_time(): number | null {
    if (this.generated_at && this.created_at) {
      return this.generated_at.getTime() - this.created_at.getTime();
    }
    return null;
  }

  get report_period(): string {
    const start = this.start_date.toISOString().split('T')[0];
    const end = this.end_date.toISOString().split('T')[0];
    return `${start} to ${end}`;
  }

  get success_rate_formatted(): string {
    return `${this.success_rate.toFixed(2)}%`;
  }

  get refund_rate_formatted(): string {
    return `${this.refund_rate.toFixed(2)}%`;
  }

  get total_revenue_formatted(): string {
    return `¥${this.total_revenue.toLocaleString()}`;
  }

  get net_revenue_formatted(): string {
    return `¥${this.net_revenue.toLocaleString()}`;
  }
}