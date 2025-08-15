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

export enum RefundStatus {
  PENDING = 'pending',         // 待处理
  PROCESSING = 'processing',   // 处理中
  SUCCESS = 'success',         // 成功
  FAILED = 'failed',          // 失败
  CANCELLED = 'cancelled',     // 已取消
}

export enum RefundReason {
  USER_REQUEST = 'user_request',           // 用户申请
  SYSTEM_ERROR = 'system_error',           // 系统错误
  PAYMENT_FAILED = 'payment_failed',       // 支付失败
  ORDER_CANCELLED = 'order_cancelled',     // 订单取消
  DUPLICATE_PAYMENT = 'duplicate_payment', // 重复支付
  OTHER = 'other',                         // 其他
}

@Entity('refund_records')
@Index(['status'])
@Index(['refundDate'])
@Index(['userId'])
@Index(['paymentId'])
export class RefundRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '退款单号' })
  refundNo: string;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
    comment: '退款状态',
  })
  status: RefundStatus;

  @Column({
    type: 'enum',
    enum: RefundReason,
    comment: '退款原因',
  })
  reason: RefundReason;

  @Column('decimal', { precision: 10, scale: 2, comment: '退款金额' })
  amount: number;

  @Column({ length: 3, default: 'CNY', comment: '货币类型' })
  currency: string;

  @Column({ comment: '用户ID' })
  userId: string;

  @Column({ comment: '原支付ID' })
  paymentId: string;

  @Column({ nullable: true, comment: '订单ID' })
  orderId: string;

  @Column({ nullable: true, comment: '第三方退款单号' })
  thirdPartyRefundId: string;

  @Column({ nullable: true, comment: '退款描述' })
  description: string;

  @Column({ type: 'datetime', nullable: true, comment: '退款时间' })
  refundDate: Date;

  @Column({ type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt: Date;

  @Column({ nullable: true, comment: '失败原因' })
  failureReason: string;

  @Column('json', { nullable: true, comment: '第三方响应数据' })
  thirdPartyResponse: any;

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

  // 关联关系
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  // 计算属性
  get isProcessing(): boolean {
    return [
      RefundStatus.PENDING,
      RefundStatus.PROCESSING,
    ].includes(this.status);
  }

  get isCompleted(): boolean {
    return [
      RefundStatus.SUCCESS,
      RefundStatus.FAILED,
      RefundStatus.CANCELLED,
    ].includes(this.status);
  }

  get isSuccess(): boolean {
    return this.status === RefundStatus.SUCCESS;
  }

  get processingDays(): number {
    if (!this.completedAt) {
      return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    return Math.floor((this.completedAt.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get displayAmount(): string {
    return `${this.amount} ${this.currency}`;
  }
}