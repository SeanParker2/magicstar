import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { FortuneType } from './fortune-template.entity';

@Entity('fortune_subscriptions')
export class FortuneSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar', length: 50,
    comment: '运势类型'
  })
  type: FortuneType;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用订阅'
  })
  enabled: boolean;

  @Column({
    type: 'json',
    default: () => "'[\"overall\"]'",
    comment: '推送内容类型'
  })
  pushTypes: string[];

  @Column({
    type: 'varchar',
    length: 5,
    default: '08:00',
    comment: '提醒时间 HH:mm'
  })
  reminderTime: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: '每周提醒日期 (0-6, 0为周日)'
  })
  weeklyDay: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '每月提醒日期 (1-28)'
  })
  monthlyDay: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用声音提醒'
  })
  soundEnabled: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用震动提醒'
  })
  vibrationEnabled: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: '最后推送时间'
  })
  lastPushAt: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: '推送次数统计'
  })
  pushCount: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}