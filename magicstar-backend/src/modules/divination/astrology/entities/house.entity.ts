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
import { ZodiacSign } from './planet.entity';

@Entity('houses')
export class House {
  @ApiProperty({ description: '宫位ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '星盘ID' })
  @Column({ name: 'birth_chart_id' })
  birthChartId: number;

  @ApiProperty({ description: '宫位号码（1-12）' })
  @Column({ name: 'house_number' })
  houseNumber: number;

  @ApiProperty({ description: '宫位名称' })
  @Column({ length: 50 })
  name: string;

  @ApiProperty({ description: '宫头星座' })
  @Column({ type: 'varchar', length: 50, name: 'cusp_sign' })
  cuspSign: ZodiacSign;

  @ApiProperty({ description: '宫头度数' })
  @Column({ type: 'decimal', precision: 8, scale: 5, name: 'cusp_degree' })
  cuspDegree: number;

  @ApiProperty({ description: '宫位大小（度数）' })
  @Column({ type: 'decimal', precision: 8, scale: 5, nullable: true })
  size?: number;

  @ApiProperty({ description: '宫位含义描述' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: '宫位关键词' })
  @Column({ type: 'text', nullable: true })
  keywords?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne('BirthChart', 'houses')
  @JoinColumn({ name: 'birth_chart_id' })
  birthChart: any;
}