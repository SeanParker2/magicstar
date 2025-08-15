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

export enum PlanetType {
  SUN = 'sun',
  MOON = 'moon',
  MERCURY = 'mercury',
  VENUS = 'venus',
  MARS = 'mars',
  JUPITER = 'jupiter',
  SATURN = 'saturn',
  URANUS = 'uranus',
  NEPTUNE = 'neptune',
  PLUTO = 'pluto',
  NORTH_NODE = 'north_node',
  SOUTH_NODE = 'south_node',
  CHIRON = 'chiron',
  ASCENDANT = 'ascendant',
  MIDHEAVEN = 'midheaven',
}

export enum ZodiacSign {
  ARIES = 'aries',
  TAURUS = 'taurus',
  GEMINI = 'gemini',
  CANCER = 'cancer',
  LEO = 'leo',
  VIRGO = 'virgo',
  LIBRA = 'libra',
  SCORPIO = 'scorpio',
  SAGITTARIUS = 'sagittarius',
  CAPRICORN = 'capricorn',
  AQUARIUS = 'aquarius',
  PISCES = 'pisces',
}

@Entity('planets')
export class Planet {
  @ApiProperty({ description: '行星ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '星盘ID' })
  @Column({ name: 'birth_chart_id' })
  birthChartId: number;

  @ApiProperty({ description: '行星类型' })
  @Column({ type: 'varchar', length: 50})
  type: PlanetType;

  @ApiProperty({ description: '行星名称' })
  @Column({ length: 50 })
  name: string;

  @ApiProperty({ description: '所在星座' })
  @Column({ type: 'varchar', length: 50})
  sign: ZodiacSign;

  @ApiProperty({ description: '度数' })
  @Column({ type: 'decimal', precision: 8, scale: 5 })
  degree: number;

  @ApiProperty({ description: '所在宫位' })
  @Column({ name: 'house_number' })
  houseNumber: number;

  @ApiProperty({ description: '是否逆行' })
  @Column({ default: false, name: 'is_retrograde' })
  isRetrograde: boolean;

  @ApiProperty({ description: '行星符号' })
  @Column({ length: 10, nullable: true })
  symbol?: string;

  @ApiProperty({ description: '行星含义描述' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne('BirthChart', 'planets')
  @JoinColumn({ name: 'birth_chart_id' })
  birthChart: any;
}