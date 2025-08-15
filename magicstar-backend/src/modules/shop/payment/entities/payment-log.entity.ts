import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Payment } from '../../entities/payment.entity';
import { User } from '../../../user/entities/user.entity';

export enum PaymentLogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SECURITY = 'security',
}

export enum PaymentLogAction {
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_PROCESSED = 'payment_processed',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_CANCELLED = 'payment_cancelled',
  PAYMENT_REFUNDED = 'payment_refunded',
  SIGNATURE_VERIFIED = 'signature_verified',
  SIGNATURE_FAILED = 'signature_failed',
  DUPLICATE_PAYMENT_BLOCKED = 'duplicate_payment_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  WEBHOOK_RECEIVED = 'webhook_received',
  WEBHOOK_VERIFIED = 'webhook_verified',
  WEBHOOK_FAILED = 'webhook_failed',
}

@Entity('payment_logs')
@Index(['payment_id'])
@Index(['user_id'])
@Index(['level'])
@Index(['action'])
@Index(['created_at'])
@Index(['ip_address'])
export class PaymentLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  level: PaymentLogLevel;

  @Column({ type: 'varchar', length: 100 })
  action: PaymentLogAction;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  request_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  session_id: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @Column({ nullable: true })
  payment_id: number;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  get is_security_event(): boolean {
    return this.level === PaymentLogLevel.SECURITY;
  }

  get is_error(): boolean {
    return this.level === PaymentLogLevel.ERROR;
  }

  get formatted_message(): string {
    const timestamp = this.created_at.toISOString();
    return `[${timestamp}] [${this.level.toUpperCase()}] ${this.action}: ${this.message}`;
  }
}