import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 塔罗牌阵实体
 */
@Entity('tarot_spreads')
export class TarotSpread {
  @ApiProperty({ description: '牌阵ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '牌阵名称' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: '牌阵名称（中文）' })
  @Column({ length: 100, name: 'name_cn' })
  nameCn: string;

  @ApiProperty({ description: '牌阵描述' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: '牌数' })
  @Column({ name: 'card_count' })
  cardCount: number;

  @ApiProperty({ description: '难度等级', enum: ['beginner', 'intermediate', 'advanced'] })
  @Column({ type: 'varchar', length: 50 })
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ description: '适用场景' })
  @Column({ type: 'json' })
  scenarios: string[];

  @ApiProperty({ description: '牌位配置' })
  @Column({ type: 'json', name: 'positions_config' })
  positionsConfig: {
    position: number;
    name: string;
    meaning: string;
    x: number;
    y: number;
  }[];

  @ApiProperty({ description: '牌阵布局图片' })
  @Column({ name: 'layout_image', nullable: true })
  layoutImage?: string;

  @ApiProperty({ description: '使用次数' })
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @ApiProperty({ description: '是否启用' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: '排序权重' })
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}