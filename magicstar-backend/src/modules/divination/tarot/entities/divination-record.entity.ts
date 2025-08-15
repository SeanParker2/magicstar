import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { SpreadType } from '../dto/create-divination.dto'
import { TarotSpread } from './tarot-spread.entity'

@Entity('divination_records')
export class DivinationRecord {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @Column('text')
  question: string

  @Column({
    type: 'varchar', length: 50,
    name: 'spread_type'
  })
  spreadType: SpreadType

  @Column({ name: 'spread_id', nullable: true })
  spreadId?: number

  @ManyToOne(() => TarotSpread)
  @JoinColumn({ name: 'spread_id' })
  spread?: TarotSpread

  @Column('simple-array', { name: 'card_ids' })
  cardIds: number[]

  @Column('json', { name: 'card_results' })
  cardResults: Array<{
    id: number
    name: string
    nameEn: string
    suit: string
    number: number
    type: string
    keywords: string[]
    keywordsReversed: string[]
    imageUrl: string
    description: string
    position: string
    reversed: boolean
    meaning: string
  }>

  @Column('json')
  interpretation: {
    summary: string
    overview: string
    detailed: string
    advice: string
    cardMeanings: Array<{
      cardName: string
      position: string
      meaning: string
      description: string
    }>
  }

  @Column({ name: 'share_token', length: 100, nullable: true })
  shareToken?: string

  @Column({ name: 'share_count', default: 0 })
  shareCount: number

  @Column({ name: 'is_public', default: false })
  isPublic: boolean

  @Column({ name: 'is_favorite', default: false })
  isFavorite: boolean

  @Column('json', { nullable: true })
  tags?: string[]

  @Column({ name: 'divination_time', type: 'datetime', nullable: true })
  divinationTime?: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}