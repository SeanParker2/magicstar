import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { FortuneType, ZodiacSign, ChineseZodiac } from './fortune-template.entity';

@Entity('user_fortunes')
@Index(['userId', 'type', 'fortuneDate'], { unique: true })
export class UserFortune {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 50})
  type: FortuneType;

  @Column({ type: 'date' })
  fortuneDate: Date; // 运势日期

  @Column({ type: 'varchar', length: 50, nullable: true })
  zodiacSign: ZodiacSign;

  @Column({ type: 'varchar', length: 50, nullable: true })
  chineseZodiac: ChineseZodiac;

  @Column({ type: 'text' })
  content: string; // 运势内容

  @Column({ type: 'json' })
  scores: {
    love: number;      // 爱情运势 (1-5)
    career: number;    // 事业运势 (1-5)
    wealth: number;    // 财运 (1-5)
    health: number;    // 健康运势 (1-5)
    overall: number;   // 综合运势 (1-5)
  };

  @Column({ type: 'json', nullable: true })
  keywords: string[]; // 关键词标签

  @Column({ type: 'text', nullable: true })
  advice: string; // 个性化建议

  @Column({ type: 'varchar', length: 7, nullable: true })
  luckyColor: string; // 幸运颜色

  @Column({ type: 'int', nullable: true })
  luckyNumber: number; // 幸运数字

  @Column({ type: 'varchar', length: 100, nullable: true })
  luckyDirection: string; // 幸运方位

  @Column({ type: 'int', nullable: true })
  templateId: number; // 关联的模板ID

  @Column({ type: 'boolean', default: false })
  isRead: boolean; // 是否已读

  @Column({ type: 'datetime', nullable: true })
  readAt: Date; // 阅读时间

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}