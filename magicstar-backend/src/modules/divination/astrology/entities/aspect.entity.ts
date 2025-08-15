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
import { PlanetType } from './planet.entity';

export enum AspectType {
  CONJUNCTION = 'conjunction',     // 合相 0°
  OPPOSITION = 'opposition',       // 对冲 180°
  TRINE = 'trine',                // 三分相 120°
  SQUARE = 'square',              // 四分相 90°
  SEXTILE = 'sextile',            // 六分相 60°
  QUINCUNX = 'quincunx',          // 补十二分相 150°
  SEMISEXTILE = 'semisextile',    // 半六分相 30°
  SEMISQUARE = 'semisquare',      // 半四分相 45°
  SESQUIQUADRATE = 'sesquiquadrate', // 倍半四分相 135°
}

export enum AspectQuality {
  MAJOR = 'major',     // 主要相位
  MINOR = 'minor',     // 次要相位
  HARMONIOUS = 'harmonious', // 和谐相位
  CHALLENGING = 'challenging', // 挑战相位
}

@Entity('aspects')
export class Aspect {
  @ApiProperty({ description: '相位ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '星盘ID' })
  @Column({ name: 'birth_chart_id' })
  birthChartId: number;

  @ApiProperty({ description: '第一个行星' })
  @Column({ type: 'varchar', length: 50, name: 'planet1' })
  planet1: PlanetType;

  @ApiProperty({ description: '第二个行星' })
  @Column({ type: 'varchar', length: 50, name: 'planet2' })
  planet2: PlanetType;

  @ApiProperty({ description: '相位类型' })
  @Column({ type: 'varchar', length: 50})
  type: AspectType;

  @ApiProperty({ description: '相位名称' })
  @Column({ length: 50 })
  name: string;

  @ApiProperty({ description: '相位角度' })
  @Column({ type: 'decimal', precision: 8, scale: 5 })
  angle: number;

  @ApiProperty({ description: '容许度' })
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  orb: number;

  @ApiProperty({ description: '相位质量' })
  @Column({ type: 'varchar', length: 50})
  quality: AspectQuality;

  @ApiProperty({ description: '相位强度（0-100）' })
  @Column({ type: 'int', nullable: true })
  strength?: number;

  @ApiProperty({ description: '相位含义描述' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: '相位影响' })
  @Column({ type: 'text', nullable: true })
  influence?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne('BirthChart', 'aspects')
  @JoinColumn({ name: 'birth_chart_id' })
  birthChart: any;
}