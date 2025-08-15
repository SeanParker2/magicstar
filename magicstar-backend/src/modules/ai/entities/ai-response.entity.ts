import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AiRequest } from './ai-request.entity';

export enum AiResponseQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  POOR = 'poor',
  UNRATED = 'unrated',
}

export enum AiModelProvider {
  OPENAI = 'openai',
  BAIDU = 'baidu',
  ALIBABA = 'alibaba',
  TENCENT = 'tencent',
  LOCAL = 'local',
}

@Entity('ai_responses')
@Index(['requestId'])
@Index(['modelProvider', 'modelName'])
@Index(['quality', 'createdAt'])
export class AiResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 36 })
  @Index()
  requestId: string;

  @OneToOne(() => AiRequest)
  @JoinColumn({ name: 'request_id' })
  request: AiRequest;

  @Column({
    name: 'model_provider',
    type: 'enum',
    enum: AiModelProvider,
    default: AiModelProvider.OPENAI,
  })
  modelProvider: AiModelProvider;

  @Column({ name: 'model_name', type: 'varchar', length: 100 })
  modelName: string;

  @Column({ name: 'model_version', type: 'varchar', length: 50, nullable: true })
  modelVersion: string;

  @Column({ name: 'prompt_text', type: 'text' })
  promptText: string;

  @Column({ name: 'response_text', type: 'text' })
  responseText: string;

  @Column({ name: 'formatted_response', type: 'json', nullable: true })
  formattedResponse: any;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse: any;

  @Column({ name: 'token_usage', type: 'json', nullable: true })
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
  };

  @Column({ name: 'processing_time', type: 'int', comment: '处理时间(毫秒)' })
  processingTime: number;

  @Column({ name: 'response_time', type: 'int', comment: 'API响应时间(毫秒)' })
  responseTime: number;

  @Column({
    name: 'quality',
    type: 'enum',
    enum: AiResponseQuality,
    default: AiResponseQuality.UNRATED,
  })
  quality: AiResponseQuality;

  @Column({ name: 'quality_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ name: 'user_rating', type: 'int', nullable: true, comment: '用户评分(1-5)' })
  userRating: number;

  @Column({ name: 'user_feedback', type: 'text', nullable: true })
  userFeedback: string;

  @Column({ name: 'is_cached', type: 'boolean', default: false })
  isCached: boolean;

  @Column({ name: 'cache_key', type: 'varchar', length: 255, nullable: true })
  cacheKey: string;

  @Column({ name: 'cache_ttl', type: 'int', nullable: true, comment: '缓存TTL(秒)' })
  cacheTtl: number;

  @Column({ name: 'content_filter_flags', type: 'json', nullable: true })
  contentFilterFlags: any;

  @Column({ name: 'safety_rating', type: 'varchar', length: 50, nullable: true })
  safetyRating: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 虚拟字段：计算成本效率
  get costEfficiency(): number | null {
    if (!this.tokenUsage?.cost || !this.tokenUsage?.totalTokens) return null;
    return this.tokenUsage.totalTokens / this.tokenUsage.cost;
  }

  // 虚拟字段：计算响应质量指标
  get performanceScore(): number {
    let score = 0;
    
    // 响应时间评分 (30%)
    if (this.responseTime < 1000) score += 30;
    else if (this.responseTime < 3000) score += 20;
    else if (this.responseTime < 5000) score += 10;
    
    // 质量评分 (40%)
    switch (this.quality) {
      case AiResponseQuality.EXCELLENT: score += 40; break;
      case AiResponseQuality.GOOD: score += 30; break;
      case AiResponseQuality.AVERAGE: score += 20; break;
      case AiResponseQuality.POOR: score += 10; break;
      default: score += 15; break;
    }
    
    // 用户评分 (30%)
    if (this.userRating) {
      score += (this.userRating / 5) * 30;
    } else {
      score += 15; // 默认中等分数
    }
    
    return Math.round(score);
  }
}