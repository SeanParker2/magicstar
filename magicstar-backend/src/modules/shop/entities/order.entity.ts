import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderAddress } from './order-address.entity';
import { Payment } from './payment.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum ShippingStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('orders')
@Index(['user_id'])
@Index(['status'])
@Index(['payment_status'])
@Index(['created_at'])
@Index(['order_number'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  order_number: string;

  @Column({
    type: 'varchar', length: 50,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'varchar', length: 50,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column({
    type: 'varchar', length: 50,
    default: ShippingStatus.PENDING,
  })
  shipping_status: ShippingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 3, default: 'CNY' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  coupon_code: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  confirmed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  shipped_at: Date;

  @Column({ type: 'datetime', nullable: true })
  delivered_at: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shipping_carrier: string;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
  })
  items: OrderItem[];

  @OneToMany(() => OrderAddress, (address) => address.order, {
    cascade: true,
  })
  addresses: OrderAddress[];

  @OneToMany(() => Payment, (payment) => payment.order, {
    cascade: true,
  })
  payments: Payment[];

  @BeforeInsert()
  generateOrderNumber() {
    if (!this.order_number) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.order_number = `ORD${timestamp}${random}`;
    }
  }

  // Virtual fields
  get item_count(): number {
    return this.items ? this.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  }

  get is_paid(): boolean {
    return this.payment_status === PaymentStatus.PAID;
  }

  get is_cancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }

  get is_completed(): boolean {
    return this.status === OrderStatus.DELIVERED;
  }

  get can_cancel(): boolean {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ].includes(this.status);
  }

  get can_refund(): boolean {
    return this.is_paid && [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ].includes(this.status);
  }

  get shipping_address(): OrderAddress | undefined {
    return this.addresses?.find(addr => addr.type === 'shipping');
  }

  get billing_address(): OrderAddress | undefined {
    return this.addresses?.find(addr => addr.type === 'billing');
  }

  get latest_payment(): Payment | undefined {
    return this.payments?.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  }

  get days_since_order(): number {
    const diffTime = Math.abs(new Date().getTime() - new Date(this.created_at).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}