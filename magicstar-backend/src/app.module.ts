import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { DatabaseOptimizerService } from './common/services/database-optimizer.service';
import { RedisOptimizerService } from './common/services/redis-optimizer.service';
import { ConnectionPoolOptimizerService } from './common/services/connection-pool-optimizer.service';
import { CompressionMiddleware } from './common/middleware/compression.middleware';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DivinationModule } from './modules/divination/divination.module';
import { FortuneModule } from './fortune/fortune.module';
import { ShopModule } from './modules/shop/shop.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AiModule } from './modules/ai/ai.module';
import { FinanceModule } from './modules/finance/finance.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { MetricsMiddleware } from './modules/monitoring/middleware/metrics.middleware';
import { SecurityModule } from './common/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule, // 启用数据库连接
    UserModule,
    AuthModule,
    DivinationModule,
    FortuneModule,
    ShopModule,
    PaymentModule,
    AiModule,
    FinanceModule,
    MonitoringModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    DatabaseOptimizerService,
    RedisOptimizerService,
    ConnectionPoolOptimizerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CompressionMiddleware)
      .forRoutes('*');
  }
}
