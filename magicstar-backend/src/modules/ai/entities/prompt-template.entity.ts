import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AiRequestType } from './ai-request.entity';

export enum PromptTemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
  DEPRECATED = 'deprecated',
}

export enum PromptTemplateCategory {
  DIVINATION = 'divination',
  TAROT = 'tarot',
  FORTUNE = 'fortune',
  ADVICE = 'advice',
  CONTENT = 'content',
  SYSTEM = 'system',
}

@Entity('prompt_templates')
@Index(['category', 'status'])
@Index(['requestType', 'version'])
@Index(['isDefault', 'status'])
export class PromptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'category',
    type: 'enum',
    enum: PromptTemplateCategory,
    default: PromptTemplateCategory.DIVINATION,
  })
  @Index()
  category: PromptTemplateCategory;

  @Column({
    name: 'request_type',
    type: 'enum',
    enum: AiRequestType,
  })
  requestType: AiRequestType;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @Column({ name: 'user_prompt_template', type: 'text' })
  userPromptTemplate: string;

  @Column({ name: 'variables', type: 'json', nullable: true })
  variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description?: string;
    defaultValue?: any;
    validation?: any;
  }[];

  @Column({ name: 'example_input', type: 'json', nullable: true })
  exampleInput: any;

  @Column({ name: 'example_output', type: 'text', nullable: true })
  exampleOutput: string;

  @Column({ name: 'model_config', type: 'json', nullable: true })
  modelConfig: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
  };

  @Column({
    name: 'status',
    type: 'enum',
    enum: PromptTemplateStatus,
    default: PromptTemplateStatus.ACTIVE,
  })
  @Index()
  status: PromptTemplateStatus;

  @Column({ name: 'version', type: 'varchar', length: 20, default: '1.0.0' })
  version: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  @Index()
  isDefault: boolean;

  @Column({ name: 'priority', type: 'int', default: 0, comment: '优先级，数值越大优先级越高' })
  priority: number;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 4, nullable: true })
  successRate: number;

  @Column({ name: 'avg_quality_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  avgQualityScore: number;

  @Column({ name: 'avg_processing_time', type: 'int', nullable: true, comment: '平均处理时间(毫秒)' })
  avgProcessingTime: number;

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 36, nullable: true })
  updatedBy: string;

  @Column({ name: 'approved_by', type: 'varchar', length: 36, nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 虚拟字段：检查模板是否可用
  get isAvailable(): boolean {
    return this.status === PromptTemplateStatus.ACTIVE;
  }

  // 虚拟字段：计算模板质量评分
  get qualityRating(): string {
    if (!this.avgQualityScore) return 'unrated';
    if (this.avgQualityScore >= 4.5) return 'excellent';
    if (this.avgQualityScore >= 3.5) return 'good';
    if (this.avgQualityScore >= 2.5) return 'average';
    return 'poor';
  }

  // 虚拟字段：计算性能评分
  get performanceRating(): string {
    if (!this.avgProcessingTime) return 'unknown';
    if (this.avgProcessingTime < 1000) return 'fast';
    if (this.avgProcessingTime < 3000) return 'normal';
    if (this.avgProcessingTime < 5000) return 'slow';
    return 'very_slow';
  }

  // 方法：渲染模板
  renderTemplate(variables: Record<string, any>): string {
    let rendered = this.userPromptTemplate;
    
    // 简单的模板变量替换
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });
    
    return rendered;
  }

  // 方法：验证输入变量
  validateInput(input: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.variables) {
      return { valid: true, errors: [] };
    }
    
    this.variables.forEach(variable => {
      const value = input[variable.name];
      
      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable '${variable.name}' is missing`);
        return;
      }
      
      if (value !== undefined && value !== null) {
        // 基本类型检查
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (variable.type !== actualType && variable.type !== 'object') {
          errors.push(`Variable '${variable.name}' should be of type '${variable.type}', got '${actualType}'`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}