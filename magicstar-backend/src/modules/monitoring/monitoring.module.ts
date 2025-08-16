import { Module } from '@nestjs/common';
import { PrometheusService } from './services/prometheus.service';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsMiddleware } from './middleware/metrics.middleware';

@Module({
  controllers: [MetricsController],
  providers: [PrometheusService, MetricsMiddleware],
  exports: [PrometheusService],
})
export class MonitoringModule {}