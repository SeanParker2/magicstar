import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('tarot_cards')
export class TarotCard {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100 })
  name: string

  @Column({ name: 'name_en', length: 100 })
  nameEn: string

  @Column({ length: 50 })
  suit: string

  @Column()
  number: number

  @Column({ length: 50 })
  type: string

  @Column('simple-array')
  keywords: string[]

  @Column({ name: 'keywords_reversed', type: 'simple-array' })
  keywordsReversed: string[]

  @Column({ name: 'image_url', length: 500 })
  imageUrl: string

  @Column('text')
  description: string

  @Column({ name: 'upright_meaning', type: 'text' })
  uprightMeaning: string

  @Column({ name: 'reversed_meaning', type: 'text' })
  reversedMeaning: string

  @Column({ name: 'love_meaning', type: 'text', nullable: true })
  loveMeaning?: string

  @Column({ name: 'career_meaning', type: 'text', nullable: true })
  careerMeaning?: string

  @Column({ name: 'health_meaning', type: 'text', nullable: true })
  healthMeaning?: string

  @Column({ name: 'finance_meaning', type: 'text', nullable: true })
  financeMeaning?: string

  @Column({ default: true })
  active: boolean

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}