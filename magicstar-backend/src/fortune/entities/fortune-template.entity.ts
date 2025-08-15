import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum FortuneType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ZodiacSign {
  ARIES = 'aries',        // 白羊座
  TAURUS = 'taurus',      // 金牛座
  GEMINI = 'gemini',      // 双子座
  CANCER = 'cancer',      // 巨蟹座
  LEO = 'leo',            // 狮子座
  VIRGO = 'virgo',        // 处女座
  LIBRA = 'libra',        // 天秤座
  SCORPIO = 'scorpio',    // 天蝎座
  SAGITTARIUS = 'sagittarius', // 射手座
  CAPRICORN = 'capricorn', // 摩羯座
  AQUARIUS = 'aquarius',   // 水瓶座
  PISCES = 'pisces',       // 双鱼座
}

export enum ChineseZodiac {
  RAT = 'rat',           // 鼠
  OX = 'ox',             // 牛
  TIGER = 'tiger',       // 虎
  RABBIT = 'rabbit',     // 兔
  DRAGON = 'dragon',     // 龙
  SNAKE = 'snake',       // 蛇
  HORSE = 'horse',       // 马
  GOAT = 'goat',         // 羊
  MONKEY = 'monkey',     // 猴
  ROOSTER = 'rooster',   // 鸡
  DOG = 'dog',           // 狗
  PIG = 'pig',           // 猪
}

@Entity('fortune_templates')
export class FortuneTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50})
  type: FortuneType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  zodiacSign: ZodiacSign;

  @Column({ type: 'varchar', length: 50, nullable: true })
  chineseZodiac: ChineseZodiac;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json' })
  scores: {
    love: number;      // 爱情运势 (1-5)
    career: number;    // 事业运势 (1-5)
    wealth: number;    // 财运 (1-5)
    health: number;    // 健康运势 (1-5)
    overall: number;   // 综合运势 (1-5)
  };

  @Column({ type: 'text', nullable: true })
  keywords: string; // 关键词标签

  @Column({ type: 'text', nullable: true })
  advice: string; // 建议

  @Column({ type: 'varchar', length: 7, nullable: true })
  luckyColor: string; // 幸运颜色 (hex)

  @Column({ type: 'int', nullable: true })
  luckyNumber: number; // 幸运数字

  @Column({ type: 'varchar', length: 100, nullable: true })
  luckyDirection: string; // 幸运方位

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 1 })
  weight: number; // 权重，用于随机选择

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}