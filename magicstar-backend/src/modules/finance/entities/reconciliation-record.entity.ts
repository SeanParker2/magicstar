import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReconciliationStatus {
  PENDING = 'pending',         // 待对账
  PROCESSING = 'processing',   // 对账中
  MATCHED = 'matched',         // 已匹配
  UNMATCHED = 'unmatched',     // 未匹配
  EXCEPTION = 'exception',     // 异常
  COMPLETED = 'completed',     // 已完成
}

export enum ReconciliationType {
  DAILY = 'daily',             // 日对账
  WEEKLY = 'weekly',           // 周对账
  MONTHLY = 'monthly',         // 月对账
  MANUAL = 'manual',           // 手动对账
}

export enum PaymentChannel {
  WECHAT = 'wechat',           // 微信支付
  ALIPAY = 'alipay',           // 支付宝
  BANK = 'bank',               // 银行卡
  ALL = 'all',                 // 全渠道
}

@Entity('reconciliation_records')
@Index(['status'])
@Index(['reconciliationDate'])
@Index(['paymentChannel'])
@Index(['type'])
export class ReconciliationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '对账批次号' })
  batchNo: string;

  @Column({
    type: 'enum',
    enum: ReconciliationType,
    comment: '对账类型',
  })
  type: ReconciliationType;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
    comment: '对账状态',
  })
  status: ReconciliationStatus;

  @Column({
    type: 'enum',
    enum: PaymentChannel,
    comment: '支付渠道',
  })
  paymentChannel: PaymentChannel;

  @Column({ type: 'date', comment: '对账日期' })
  reconciliationDate: Date;

  @Column({ type: 'datetime', nullable: true, comment: '开始时间' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true, comment: '结束时间' })
  endTime: Date;

  // 系统数据统计
  @Column({ type: 'int', default: 0, comment: '系统交易笔数' })
  systemTransactionCount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, comment: '系统交易金额' })
  systemTransactionAmount: number;

  @Column({ type: 'int', default: 0, comment: '系统退款笔数' })
  systemRefundCount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, comment: '系统退款金额' })
  systemRefundAmount: number;

  // 第三方数据统计
  @Column({ type: 'int', default: 0, comment: '第三方交易笔数' })
  thirdPartyTransactionCount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, comment: '第三方交易金额' })
  thirdPartyTransactionAmount: number;

  @Column({ type: 'int', default: 0, comment: '第三方退款笔数' })
  thirdPartyRefundCount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, comment: '第三方退款金额' })
  thirdPartyRefundAmount: number;

  // 差异统计
  @Column({ type: 'int', default: 0, comment: '交易笔数差异' })
  transactionCountDiff: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, comment: '交易金额差异' })
  transactionAmountDiff: number;

  @Column({ type: 'int', default: 0, comment: '退款笔数差异' })
  refundCountDiff: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, comment: '退款金额差异' })
  refundAmountDiff: number;

  // 匹配结果
  @Column({ type: 'int', default: 0, comment: '匹配成功笔数' })
  matchedCount: number;

  @Column({ type: 'int', default: 0, comment: '未匹配笔数' })
  unmatchedCount: number;

  @Column({ type: 'int', default: 0, comment: '异常笔数' })
  exceptionCount: number;

  @Column('json', { nullable: true, comment: '未匹配记录详情' })
  unmatchedDetails: any;

  @Column('json', { nullable: true, comment: '异常记录详情' })
  exceptionDetails: any;

  @Column({ nullable: true, comment: '第三方对账文件路径' })
  thirdPartyFilePath: string;

  @Column({ nullable: true, comment: '对账报告文件路径' })
  reportFilePath: string;

  @Column('json', { nullable: true, comment: '扩展数据' })
  metadata: any;

  @Column({ nullable: true, comment: '操作员ID' })
  operatorId: string;

  @Column({ nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 计算属性
  get isCompleted(): boolean {
    return [
      ReconciliationStatus.MATCHED,
      ReconciliationStatus.UNMATCHED,
      ReconciliationStatus.COMPLETED,
    ].includes(this.status);
  }

  get hasDiscrepancy(): boolean {
    return (
      this.transactionCountDiff !== 0 ||
      this.transactionAmountDiff !== 0 ||
      this.refundCountDiff !== 0 ||
      this.refundAmountDiff !== 0
    );
  }

  get matchRate(): number {
    const total = this.matchedCount + this.unmatchedCount + this.exceptionCount;
    return total > 0 ? (this.matchedCount / total) * 100 : 0;
  }

  get processingDuration(): number {
    if (!this.startTime || !this.endTime) {
      return 0;
    }
    return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }

  get systemNetAmount(): number {
    return this.systemTransactionAmount - this.systemRefundAmount;
  }

  get thirdPartyNetAmount(): number {
    return this.thirdPartyTransactionAmount - this.thirdPartyRefundAmount;
  }

  get netAmountDiff(): number {
    return this.systemNetAmount - this.thirdPartyNetAmount;
  }
}