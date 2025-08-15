import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { CacheModule } from '@nestjs/cache-manager';
import { FortuneController } from './fortune.controller';
import { FortuneAdminController } from './fortune-admin.controller';
import { FortuneService } from './fortune.service';
import { FortuneAlgorithmService } from './fortune-algorithm.service';
import { FortuneDataService } from './fortune-data.service';
import { FortuneSeedService } from './fortune-seed.service';
import { FortuneTemplate } from './entities/fortune-template.entity';
import { UserFortune } from './entities/user-fortune.entity';
import { FortuneHistory } from './entities/fortune-history.entity';
import { FortuneSubscription } from './entities/fortune-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FortuneTemplate,
      UserFortune,
      FortuneHistory,
      FortuneSubscription,
    ]),
    // CacheModule.register(),
  ],
  controllers: [FortuneController, FortuneAdminController],
  providers: [FortuneService, FortuneAlgorithmService, FortuneDataService, FortuneSeedService],
  exports: [FortuneService, FortuneAlgorithmService, FortuneDataService, FortuneSeedService],
})
export class FortuneModule {}