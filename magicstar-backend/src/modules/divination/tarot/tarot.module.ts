import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TarotController } from './tarot.controller'
import { TarotService } from './tarot.service'
import { TarotAlgorithmService } from './tarot-algorithm.service'
import { TarotCard } from './entities/tarot-card.entity'
import { TarotSpread } from './entities/tarot-spread.entity'
import { DivinationRecord } from './entities/divination-record.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TarotCard,
      TarotSpread,
      DivinationRecord
    ])
  ],
  controllers: [TarotController],
  providers: [
    TarotService,
    TarotAlgorithmService
  ],
  exports: [
    TarotService,
    TarotAlgorithmService
  ]
})
export class TarotModule {}