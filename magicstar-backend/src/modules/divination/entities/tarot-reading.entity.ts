import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { TarotSpread } from './tarot-spread.entity';

/**
 * 塔罗占卜记录实体
 */
@Entity('tarot_readings')
export class TarotReading {
  @ApiProperty({ description: '占卜记录ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '用户ID' })
  @Column({ name: 'user_id' })
  userId: number;

  @ApiProperty({ description: '牌阵ID' })
  @Column({ name: 'spread_id' })
  spreadId: number;

  @ApiProperty({ description: '占卜问题' })
  @Column({ type: 'text' })
  question: string;

  @ApiProperty({ description: '抽取的牌' })
  @Column({ type: 'json', name: 'drawn_cards' })
  drawnCards: {
    position: number;
    cardId: number;
    isReversed: boolean;
    cardName: string;
    cardNameCn: string;
    meaning: string;
  }[];

  @ApiProperty({ description: '整体解读' })
  @Column({ type: 'text', name: 'overall_interpretation' })
  overallInterpretation: string;

  @ApiProperty({ description: '详细解读' })
  @Column({ type: 'json', name: 'detailed_interpretation' })
  detailedInterpretation: {
    position: number;
    positionName: string;
    cardInterpretation: string;
    advice: string;
  }[];

  @ApiProperty({ description: '占卜结果摘要' })
  @Column({ type: 'text' })
  summary: string;

  @ApiProperty({ description: '建议和指导' })
  @Column({ type: 'text', nullable: true })
  advice?: string;

  @ApiProperty({ description: '占卜时间' })
  @Column({ name: 'reading_time' })
  readingTime: Date;

  @ApiProperty({ description: '是否公开分享' })
  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @ApiProperty({ description: '分享次数' })
  @Column({ name: 'share_count', default: 0 })
  shareCount: number;

  @ApiProperty({ description: '用户评分' })
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating?: number;

  @ApiProperty({ description: '用户反馈' })
  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => TarotSpread)
  @JoinColumn({ name: 'spread_id' })
  spread: TarotSpread;
}