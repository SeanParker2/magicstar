import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityMiddleware } from '../middleware/security.middleware';
import { SecurityService } from './security.service';
import { SecurityGuard } from './security.guard';

@Module({
  imports: [ConfigModule],
  providers: [SecurityService, SecurityGuard],
  exports: [SecurityService, SecurityGuard],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*'); // 应用到所有路由
  }
}