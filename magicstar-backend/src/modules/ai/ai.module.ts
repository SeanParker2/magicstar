import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiController } from './controllers/ai.controller';
import { InterpretationController } from './controllers/interpretation.controller';
import { AiService } from './services/ai.service';
import { OpenaiService } from './services/openai.service';
import { PromptService } from './services/prompt.service';
import { PromptEngineeringService } from './services/prompt-engineering.service';
import { InterpretationService } from './services/interpretation.service';
import { InterpretationQualityService } from './services/interpretation-quality.service';
import { InterpretationOptimizerService } from './services/interpretation-optimizer.service';
import { AiCacheService } from './services/ai-cache.service';
import { AiQueueService } from './services/ai-queue.service';
import { AiLoggerService } from './services/ai-logger.service';
import { AiRequest } from './entities/ai-request.entity';
import { AiResponse } from './entities/ai-response.entity';
import { PromptTemplate } from './entities/prompt-template.entity';
import aiConfig from './config/ai.config';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    TypeOrmModule.forFeature([
      AiRequest,
      AiResponse,
      PromptTemplate,
    ]),
    // AI请求队列配置
    BullModule.registerQueueAsync({
      name: 'ai-requests',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_AI_DB', 2),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AiController, InterpretationController],
  providers: [
    AiService,
    OpenaiService,
    PromptService,
    PromptEngineeringService,
    InterpretationService,
    InterpretationQualityService,
    InterpretationOptimizerService,
    AiCacheService,
    AiQueueService,
    AiLoggerService,
  ],
  exports: [
    AiService,
    OpenaiService,
    PromptService,
    PromptEngineeringService,
    InterpretationService,
    InterpretationQualityService,
    InterpretationOptimizerService,
    AiCacheService,
    AiQueueService,
    AiLoggerService,
  ],
})
export class AiModule {}