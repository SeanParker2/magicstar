import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../user/entities/user.entity';
import type { Planet } from './planet.entity';
import type { House } from './house.entity';
import type { Aspect } from './aspect.entity';
import type { ChartInterpretation } from './chart-interpretation.entity';

@Entity('birth_charts')
export class BirthChart {
  @ApiProperty({ description: '星盘ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '用户ID' })
  @Column({ name: 'user_id' })
  userId: number;

  @ApiProperty({ description: '星盘名称' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: '出生日期' })
  @Column({ type: 'date', name: 'birth_date' })
  birthDate: Date;

  @ApiProperty({ description: '出生时间' })
  @Column({ type: 'time', name: 'birth_time' })
  birthTime: string;

  @ApiProperty({ description: '出生地点' })
  @Column({ length: 200, name: 'birth_place' })
  birthPlace: string;

  @ApiProperty({ description: '出生地纬度' })
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @ApiProperty({ description: '出生地经度' })
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @ApiProperty({ description: '时区' })
  @Column({ length: 50 })
  timezone: string;

  @ApiProperty({ description: '星盘数据（JSON格式）' })
  @Column({ type: 'json', name: 'chart_data' })
  chartData: {
    houses: any[];
    planets: any[];
    aspects: any[];
    cusps: any[];
    [key: string]: any;
  };

  @ApiProperty({ description: '是否公开' })
  @Column({ default: false, name: 'is_public' })
  isPublic: boolean;

  @ApiProperty({ description: '分享码' })
  @Column({ length: 32, nullable: true, name: 'share_code' })
  shareCode?: string;

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

  @OneToMany('Planet', 'birthChart')
  planets: any[];

  @OneToMany('House', 'birthChart')
  houses: any[];

  @OneToMany('Aspect', 'birthChart')
  aspects: any[];

  @OneToMany('ChartInterpretation', 'birthChart')
  interpretations: any[];
}