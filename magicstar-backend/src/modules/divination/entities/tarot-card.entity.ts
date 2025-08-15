import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 塔罗牌实体
 */
@Entity('tarot_cards')
export class TarotCard {
  @ApiProperty({ description: '塔罗牌ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '牌名（英文）' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: '牌名（中文）' })
  @Column({ length: 100, name: 'name_cn' })
  nameCn: string;

  @ApiProperty({ description: '牌组类型', enum: ['major', 'minor'] })
  @Column({ type: 'varchar', length: 50 })
  type: 'major' | 'minor';

  @ApiProperty({ description: '花色（仅小阿卡纳）', enum: ['wands', 'cups', 'swords', 'pentacles', null] })
  @Column({ type: 'varchar', length: 50, nullable: true })
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';

  @ApiProperty({ description: '牌号' })
  @Column()
  number: number;

  @ApiProperty({ description: '正位关键词' })
  @Column({ type: 'text', name: 'upright_keywords' })
  uprightKeywords: string;

  @ApiProperty({ description: '逆位关键词' })
  @Column({ type: 'text', name: 'reversed_keywords' })
  reversedKeywords: string;

  @ApiProperty({ description: '正位含义' })
  @Column({ type: 'text', name: 'upright_meaning' })
  uprightMeaning: string;

  @ApiProperty({ description: '逆位含义' })
  @Column({ type: 'text', name: 'reversed_meaning' })
  reversedMeaning: string;

  @ApiProperty({ description: '牌面描述' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: '牌面图片URL' })
  @Column({ name: 'image_url' })
  imageUrl: string;

  @ApiProperty({ description: '元素属性' })
  @Column({ nullable: true })
  element?: string;

  @ApiProperty({ description: '占星对应' })
  @Column({ nullable: true })
  astrology?: string;

  @ApiProperty({ description: '数字含义' })
  @Column({ type: 'text', nullable: true, name: 'numerology_meaning' })
  numerologyMeaning?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}