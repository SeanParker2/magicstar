import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { MonitoringModule } from '../src/modules/monitoring/monitoring.module';
import { register } from 'prom-client';

describe('AppController (extended e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // 清理Prometheus注册表
    register.clear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        // 使用简单的SQLite配置，不包含任何实体
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [], // 空实体列表
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        MonitoringModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request.default(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request.default(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/metrics (GET)', () => {
    return request.default(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('# HELP');
        expect(res.text).toContain('# TYPE');
      });
  });
});