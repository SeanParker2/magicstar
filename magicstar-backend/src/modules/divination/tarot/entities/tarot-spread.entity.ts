import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { SpreadType } from '../dto/create-divination.dto'

@Entity('tarot_spreads')
export class TarotSpread {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100 })
  name: string

  @Column({ name: 'name_en', length: 100 })
  nameEn: string

  @Column({
    type: 'varchar', length: 50,
    default: SpreadType.SINGLE
  })
  type: SpreadType

  @Column({ name: 'card_count' })
  cardCount: number

  @Column('simple-array')
  positions: string[]

  @Column('text')
  description: string

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string

  @Column({ name: 'difficulty_level', default: 1 })
  difficultyLevel: number

  @Column({ name: 'suitable_for', type: 'simple-array', nullable: true })
  suitableFor?: string[]

  @Column({ default: true })
  active: boolean

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}