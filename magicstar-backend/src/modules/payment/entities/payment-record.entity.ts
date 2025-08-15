import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

export enum PaymentRecordType {
  CREATE = 'create',
  NOTIFY = 'notify',
  QUERY = 'query',
  REFUND = 'refund',
  CANCEL = 'cancel',
}

export enum PaymentRecordStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('payment_records')
export class PaymentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { comment: '支付ID' })
  paymentId: string;

  @Column({
    type: 'varchar', length: 50,
    comment: '记录类型',
  })
  type: PaymentRecordType;

  @Column({
    type: 'varchar', length: 50,
    comment: '操作状态',
  })
  status: PaymentRecordStatus;

  @Column({ comment: '操作描述' })
  description: string;

  @Column('json', { nullable: true, comment: '请求参数' })
  requestData: any;

  @Column('json', { nullable: true, comment: '响应数据' })
  responseData: any;

  @Column({ nullable: true, comment: '错误信息' })
  errorMessage: string;

  @Column({ nullable: true, comment: '第三方交易号' })
  thirdPartyTransactionId: string;

  @Column('int', { default: 0, comment: '处理耗时(毫秒)' })
  processingTime: number;

  @Column({ nullable: true, comment: '客户端IP' })
  clientIp: string;

  @Column({ nullable: true, comment: '用户代理' })
  userAgent: string;

  @Column({ nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;
}