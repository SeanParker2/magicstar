import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: configService.get('app.env') === 'development',
        logging: configService.get('app.env') === 'development',
        timezone: '+08:00',
        charset: 'utf8mb4',
        retryAttempts: 3,
        retryDelay: 3000,
        autoLoadEntities: true,
        extra: {
          connectionLimit: 10,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}