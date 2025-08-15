import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../user/entities/user.entity';

export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH_ON_DELIVERY = 'cash_on_delivery',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
}

@Entity('payments')
@Index(['order_id'])
@Index(['user_id'])
@Index(['status'])
@Index(['payment_method'])
@Index(['transaction_id'], { unique: true })
@Index(['created_at'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  transaction_id: string;

  @Column({
    type: 'varchar', length: 50,
  })
  payment_method: PaymentMethod;

  @Column({
    type: 'varchar', length: 50,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'varchar', length: 50,
    default: PaymentType.PAYMENT,
  })
  type: PaymentType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'CNY' })
  currency: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  gateway_transaction_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  gateway_reference: string;

  @Column({ type: 'json', nullable: true })
  gateway_response: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  processed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  failed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  refunded_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refunded_amount: number;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column()
  order_id: number;

  @ManyToOne(() => Order, (order) => order.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @BeforeInsert()
  generateTransactionId() {
    if (!this.transaction_id) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.transaction_id = `PAY${timestamp}${random}`;
    }
  }

  // Virtual fields
  get is_successful(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  get is_failed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get is_pending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  get is_refunded(): boolean {
    return [
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ].includes(this.status);
  }

  get can_refund(): boolean {
    return this.is_successful && this.refunded_amount < this.amount;
  }

  get remaining_refund_amount(): number {
    return this.amount - this.refunded_amount;
  }

  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  }

  get payment_method_display(): string {
    const methodMap: Record<PaymentMethod, string> = {
      [PaymentMethod.WECHAT_PAY]: '微信支付',
      [PaymentMethod.ALIPAY]: '支付宝',
      [PaymentMethod.CREDIT_CARD]: '信用卡',
      [PaymentMethod.BANK_TRANSFER]: '银行转账',
      [PaymentMethod.CASH_ON_DELIVERY]: '货到付款',
    };
    
    return methodMap[this.payment_method] || this.payment_method;
  }

  get status_display(): string {
    const statusMap: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: '待支付',
      [PaymentStatus.PROCESSING]: '处理中',
      [PaymentStatus.COMPLETED]: '已完成',
      [PaymentStatus.FAILED]: '支付失败',
      [PaymentStatus.CANCELLED]: '已取消',
      [PaymentStatus.REFUNDED]: '已退款',
      [PaymentStatus.PARTIALLY_REFUNDED]: '部分退款',
    };
    
    return statusMap[this.status] || this.status;
  }

  get amount_formatted(): string {
    return `¥${this.amount.toFixed(2)}`;
  }

  get processing_time(): number | null {
    if (!this.processed_at) return null;
    
    const diffTime = new Date(this.processed_at).getTime() - new Date(this.created_at).getTime();
    return Math.round(diffTime / 1000); // seconds
  }
}