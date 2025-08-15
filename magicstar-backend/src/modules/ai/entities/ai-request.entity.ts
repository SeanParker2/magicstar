import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AiRequestType {
  DIVINATION_INTERPRETATION = 'divination_interpretation',
  TAROT_READING = 'tarot_reading',
  FORTUNE_ANALYSIS = 'fortune_analysis',
  PERSONALIZED_ADVICE = 'personalized_advice',
  CONTENT_GENERATION = 'content_generation',
}

export enum AiRequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum AiRequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('ai_requests')
@Index(['userId', 'createdAt'])
@Index(['status', 'priority'])
@Index(['requestType', 'status'])
export class AiRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  @Index()
  userId: string;

  @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
  sessionId: string;

  @Column({
    name: 'request_type',
    type: 'enum',
    enum: AiRequestType,
    default: AiRequestType.DIVINATION_INTERPRETATION,
  })
  requestType: AiRequestType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AiRequestStatus,
    default: AiRequestStatus.PENDING,
  })
  @Index()
  status: AiRequestStatus;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: AiRequestPriority,
    default: AiRequestPriority.NORMAL,
  })
  priority: AiRequestPriority;

  @Column({ name: 'prompt_template_id', type: 'varchar', length: 36, nullable: true })
  promptTemplateId: string;

  @Column({ name: 'input_data', type: 'json' })
  inputData: any;

  @Column({ name: 'context_data', type: 'json', nullable: true })
  contextData: any;

  @Column({ name: 'model_config', type: 'json', nullable: true })
  modelConfig: any;

  @Column({ name: 'client_ip', type: 'varchar', length: 45, nullable: true })
  clientIp: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'processing_time', type: 'int', nullable: true, comment: '处理时间(毫秒)' })
  processingTime: number;

  @Column({ name: 'token_usage', type: 'json', nullable: true })
  tokenUsage: any;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 虚拟字段：计算处理状态
  get isExpired(): boolean {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  get canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.status === AiRequestStatus.FAILED;
  }

  get processingDuration(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }
}