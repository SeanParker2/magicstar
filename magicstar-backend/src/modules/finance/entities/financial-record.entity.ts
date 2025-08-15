import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Order } from '../../shop/entities/order.entity';

export enum FinancialRecordType {
  INCOME = 'income',           // 收入
  REFUND = 'refund',          // 退款
  FEE = 'fee',                // 手续费
  COMMISSION = 'commission',   // 佣金
  ADJUSTMENT = 'adjustment',   // 调整
}

export enum FinancialRecordStatus {
  PENDING = 'pending',         // 待处理
  CONFIRMED = 'confirmed',     // 已确认
  CANCELLED = 'cancelled',     // 已取消
  FAILED = 'failed',          // 失败
}

@Entity('financial_records')
@Index(['type', 'status'])
@Index(['recordDate'])
@Index(['userId'])
export class FinancialRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: FinancialRecordType,
    comment: '记录类型',
  })
  type: FinancialRecordType;

  @Column({
    type: 'enum',
    enum: FinancialRecordStatus,
    default: FinancialRecordStatus.PENDING,
    comment: '记录状态',
  })
  status: FinancialRecordStatus;

  @Column('decimal', { precision: 10, scale: 2, comment: '金额' })
  amount: number;

  @Column({ length: 3, default: 'CNY', comment: '货币类型' })
  currency: string;

  @Column({ nullable: true, comment: '用户ID' })
  userId: string;

  @Column({ nullable: true, comment: '支付ID' })
  paymentId: string;

  @Column({ nullable: true, comment: '订单ID' })
  orderId: string;

  @Column({ nullable: true, comment: '关联业务ID' })
  businessId: string;

  @Column({ nullable: true, comment: '业务类型' })
  businessType: string;

  @Column({ nullable: true, comment: '描述' })
  description: string;

  @Column({ type: 'date', comment: '记录日期' })
  recordDate: Date;

  @Column('json', { nullable: true, comment: '扩展数据' })
  metadata: any;

  @Column({ nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // 计算属性
  get isIncome(): boolean {
    return this.type === FinancialRecordType.INCOME;
  }

  get isExpense(): boolean {
    return [
      FinancialRecordType.REFUND,
      FinancialRecordType.FEE,
      FinancialRecordType.COMMISSION,
    ].includes(this.type);
  }

  get isConfirmed(): boolean {
    return this.status === FinancialRecordStatus.CONFIRMED;
  }

  get displayAmount(): string {
    const sign = this.isIncome ? '+' : '-';
    return `${sign}${this.amount} ${this.currency}`;
  }
}