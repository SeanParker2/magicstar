import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AstrologyController } from './astrology.controller';
import { AstrologyService } from './astrology.service';
import { AstrologyApiService } from './astrology-api.service';
import { AstrologyAlgorithmService } from './astrology-algorithm.service';
import { BirthChart } from './entities/birth-chart.entity';
import { Planet } from './entities/planet.entity';
import { House } from './entities/house.entity';
import { Aspect } from './entities/aspect.entity';
import { ChartInterpretation } from './entities/chart-interpretation.entity';
import { MonitoringModule } from '../../monitoring/monitoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BirthChart,
      Planet,
      House,
      Aspect,
      ChartInterpretation,
    ]),
    HttpModule,
    MonitoringModule,
  ],
  controllers: [AstrologyController],
  providers: [
    AstrologyService,
    AstrologyApiService,
    AstrologyAlgorithmService,
  ],
  exports: [AstrologyService],
})
export class AstrologyModule {}