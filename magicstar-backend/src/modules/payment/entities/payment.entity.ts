import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Order } from '../../shop/entities/order.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIAL_REFUNDED = 'partial_refunded',
}

export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  BANK_CARD = 'bank_card',
  BALANCE = 'balance',
}

export enum PaymentType {
  ORDER = 'order',
  RECHARGE = 'recharge',
  REFUND = 'refund',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: '支付单号' })
  paymentNo: string;

  @Column({ nullable: true, comment: '第三方支付流水号' })
  transactionId: string;

  @Column({ nullable: true, comment: '商户订单号' })
  outTradeNo: string;

  @Column('uuid', { comment: '用户ID' })
  userId: string;

  @Column('uuid', { nullable: true, comment: '关联订单ID' })
  orderId: string;

  @Column({
    type: 'varchar', length: 50,
    comment: '支付方式',
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'varchar', length: 50,
    default: PaymentType.ORDER,
    comment: '支付类型',
  })
  paymentType: PaymentType;

  @Column({
    type: 'varchar', length: 50,
    default: PaymentStatus.PENDING,
    comment: '支付状态',
  })
  status: PaymentStatus;

  @Column('decimal', { precision: 10, scale: 2, comment: '支付金额' })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, comment: '手续费' })
  fee: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, comment: '实际到账金额' })
  actualAmount: number;

  @Column({ default: 'CNY', comment: '货币类型' })
  currency: string;

  @Column({ nullable: true, comment: '支付描述' })
  description: string;

  @Column('json', { nullable: true, comment: '支付参数' })
  paymentParams: any;

  @Column('json', { nullable: true, comment: '第三方支付响应数据' })
  paymentResponse: any;

  @Column({ nullable: true, comment: '支付失败原因' })
  failureReason: string;

  @Column({ nullable: true, comment: '退款原因' })
  refundReason: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0, comment: '已退款金额' })
  refundedAmount: number;

  @Column({ nullable: true, comment: '支付完成时间' })
  paidAt: Date;

  @Column({ nullable: true, comment: '支付过期时间' })
  expiredAt: Date;

  @Column({ nullable: true, comment: '退款时间' })
  refundedAt: Date;

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

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}