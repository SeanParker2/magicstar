import { Module } from '@nestjs/common';
import { TarotModule } from './tarot/tarot.module';
import { AstrologyModule } from './astrology/astrology.module';

@Module({
  imports: [
    TarotModule,
    AstrologyModule,
  ],
  exports: [
    TarotModule,
    AstrologyModule,
  ],
})
export class DivinationModule {}