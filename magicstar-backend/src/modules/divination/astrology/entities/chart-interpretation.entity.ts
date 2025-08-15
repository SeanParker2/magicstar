import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { BirthChart } from './birth-chart.entity';

export enum InterpretationType {
  GENERAL = 'general',           // 综合解读
  PERSONALITY = 'personality',   // 性格特质
  CAREER = 'career',            // 事业发展
  LOVE = 'love',                // 爱情关系
  HEALTH = 'health',            // 健康状况
  WEALTH = 'wealth',            // 财富运势
  FAMILY = 'family',            // 家庭关系
  SPIRITUAL = 'spiritual',      // 精神成长
}

@Entity('chart_interpretations')
export class ChartInterpretation {
  @ApiProperty({ description: '解读ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '星盘ID' })
  @Column({ name: 'birth_chart_id' })
  birthChartId: number;

  @ApiProperty({ description: '解读类型' })
  @Column({ type: 'varchar', length: 50})
  type: InterpretationType;

  @ApiProperty({ description: '解读标题' })
  @Column({ length: 200 })
  title: string;

  @ApiProperty({ description: '解读内容' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: '关键词' })
  @Column({ type: 'text', nullable: true })
  keywords?: string;

  @ApiProperty({ description: '重要程度（1-5）' })
  @Column({ type: 'int', default: 3 })
  importance: number;

  @ApiProperty({ description: '解读来源' })
  @Column({ length: 50, default: 'system' })
  source: string;

  @ApiProperty({ description: '是否AI生成' })
  @Column({ default: false, name: 'is_ai_generated' })
  isAiGenerated: boolean;

  @ApiProperty({ description: '解读数据（JSON格式）' })
  @Column({ type: 'json', nullable: true, name: 'interpretation_data' })
  interpretationData?: {
    planets?: any[];
    houses?: any[];
    aspects?: any[];
    scores?: {
      personality: number;
      career: number;
      love: number;
      health: number;
      wealth: number;
    };
    [key: string]: any;
  };

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne('BirthChart', 'interpretations')
  @JoinColumn({ name: 'birth_chart_id' })
  birthChart: any;
}