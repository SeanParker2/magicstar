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
import { Payment } from '../../entities/payment.entity';
import { User } from '../../../user/entities/user.entity';
import { Order } from '../../entities/order.entity';

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
  CHARGEBACK = 'chargeback',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  DUPLICATE_PAYMENT = 'duplicate_payment',
  FRAUDULENT = 'fraudulent',
  PRODUCT_ISSUE = 'product_issue',
  SERVICE_ISSUE = 'service_issue',
  TECHNICAL_ERROR = 'technical_error',
  CHARGEBACK = 'chargeback',
  OTHER = 'other',
}

@Entity('refunds')
@Index(['status'])
@Index(['refund_type'])
@Index(['reason'])
@Index(['created_at'])
@Index(['processed_at'])
export class Refund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  refund_id: string;

  @Column({ type: 'int' })
  payment_id: number;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'int' })
  order_id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'int' })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({
    type: 'varchar',
    length: 50,
    default: RefundType.FULL,
  })
  refund_type: RefundType;

  @Column({
    type: 'varchar',
    length: 50,
  })
  reason: RefundReason;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  original_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  refund_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  refund_fee: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  net_refund_amount: number;

  @Column({ type: 'varchar', length: 10, default: 'CNY' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  customer_note: string;

  @Column({ type: 'text', nullable: true })
  admin_note: string;

  // 网关相关信息
  @Column({ type: 'varchar', length: 200, nullable: true })
  gateway_refund_id: string;

  @Column({ type: 'json', nullable: true })
  gateway_response: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  gateway_status: string;

  // 审批信息
  @Column({ type: 'int', nullable: true })
  approved_by: number;

  @Column({ type: 'datetime', nullable: true })
  approved_at: Date;

  @Column({ type: 'int', nullable: true })
  processed_by: number;

  @Column({ type: 'datetime', nullable: true })
  processed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  failed_at: Date;

  // 元数据
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  request_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  session_id: string;

  // 重试信息
  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'datetime', nullable: true })
  last_retry_at: Date;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'json', nullable: true })
  error_details: Record<string, any>;

  // 通知信息
  @Column({ type: 'boolean', default: false })
  customer_notified: boolean;

  @Column({ type: 'datetime', nullable: true })
  customer_notified_at: Date;

  @Column({ type: 'boolean', default: false })
  admin_notified: boolean;

  @Column({ type: 'datetime', nullable: true })
  admin_notified_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 计算属性
  get is_pending(): boolean {
    return this.status === RefundStatus.PENDING;
  }

  get is_processing(): boolean {
    return this.status === RefundStatus.PROCESSING;
  }

  get is_completed(): boolean {
    return this.status === RefundStatus.COMPLETED;
  }

  get is_failed(): boolean {
    return this.status === RefundStatus.FAILED;
  }

  get is_cancelled(): boolean {
    return this.status === RefundStatus.CANCELLED;
  }

  get is_full_refund(): boolean {
    return this.refund_type === RefundType.FULL;
  }

  get is_partial_refund(): boolean {
    return this.refund_type === RefundType.PARTIAL;
  }

  get refund_percentage(): number {
    if (this.original_amount === 0) return 0;
    return (this.refund_amount / this.original_amount) * 100;
  }

  get processing_time(): number | null {
    if (this.completed_at && this.created_at) {
      return this.completed_at.getTime() - this.created_at.getTime();
    }
    return null;
  }

  get can_retry(): boolean {
    return this.status === RefundStatus.FAILED && this.retry_count < 3;
  }

  get status_display(): string {
    const statusMap = {
      [RefundStatus.PENDING]: '待处理',
      [RefundStatus.PROCESSING]: '处理中',
      [RefundStatus.COMPLETED]: '已完成',
      [RefundStatus.FAILED]: '失败',
      [RefundStatus.CANCELLED]: '已取消',
    };
    return statusMap[this.status] || this.status;
  }

  get reason_display(): string {
    const reasonMap = {
      [RefundReason.CUSTOMER_REQUEST]: '客户申请',
      [RefundReason.DUPLICATE_PAYMENT]: '重复支付',
      [RefundReason.FRAUDULENT]: '欺诈交易',
      [RefundReason.PRODUCT_ISSUE]: '产品问题',
      [RefundReason.SERVICE_ISSUE]: '服务问题',
      [RefundReason.TECHNICAL_ERROR]: '技术错误',
      [RefundReason.CHARGEBACK]: '拒付',
      [RefundReason.OTHER]: '其他',
    };
    return reasonMap[this.reason] || this.reason;
  }

  get refund_amount_formatted(): string {
    return `¥${this.refund_amount.toLocaleString()}`;
  }

  get net_refund_amount_formatted(): string {
    return `¥${this.net_refund_amount.toLocaleString()}`;
  }
}