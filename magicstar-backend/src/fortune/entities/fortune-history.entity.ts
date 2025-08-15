import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { FortuneType } from './fortune-template.entity';

export enum OperationType {
  VIEW = 'view',
  SHARE = 'share',
  DELETE = 'delete',
  GENERATE = 'generate',
}

@Entity('fortune_histories')
@Index(['userId', 'createdAt'])
export class FortuneHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  fortuneId: number; // 关联的运势ID

  @Column({ type: 'varchar', length: 50})
  type: FortuneType;

  @Column({ type: 'date' })
  fortuneDate: Date; // 运势日期

  @Column({ type: 'varchar', length: 50})
  operation: OperationType; // 操作类型：view, share, delete, generate

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string; // 来源：app, web, api

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外的元数据

  @CreateDateColumn()
  createdAt: Date;
}