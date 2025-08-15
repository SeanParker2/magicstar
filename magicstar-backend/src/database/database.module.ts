import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiRequest } from '../modules/ai/entities/ai-request.entity';
import { AiResponse } from '../modules/ai/entities/ai-response.entity';
import { PromptTemplate } from '../modules/ai/entities/prompt-template.entity';
import { Order } from '../modules/shop/entities/order.entity';
import { Payment } from '../modules/shop/entities/payment.entity';
import { Product } from '../modules/shop/entities/product.entity';
import { OrderItem } from '../modules/shop/entities/order-item.entity';
import { OrderAddress } from '../modules/shop/entities/order-address.entity';
import { CartItem } from '../modules/shop/entities/cart-item.entity';
import { ProductCategory } from '../modules/shop/entities/product-category.entity';
import { ProductImage } from '../modules/shop/entities/product-image.entity';
import { User } from '../modules/user/entities/user.entity';
import { Role } from '../modules/user/entities/role.entity';
import { TarotCard } from '../modules/divination/entities/tarot-card.entity';
import { TarotSpread } from '../modules/divination/entities/tarot-spread.entity';
import { TarotReading } from '../modules/divination/entities/tarot-reading.entity';
import { BirthChart } from '../modules/divination/astrology/entities/birth-chart.entity';
import { Planet } from '../modules/divination/astrology/entities/planet.entity';
import { House } from '../modules/divination/astrology/entities/house.entity';
import { Aspect } from '../modules/divination/astrology/entities/aspect.entity';
import { ChartInterpretation } from '../modules/divination/astrology/entities/chart-interpretation.entity';
import { DatabaseOptimizerService } from './database-optimizer.service';
import { RedisOptimizerService } from '../common/services/redis-optimizer.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV');
        const isProduction = nodeEnv === 'production';
        const isTest = nodeEnv === 'test';
        
        if (isTest) {
          // 测试环境使用内存SQLite
          return {
            type: 'sqlite',
            database: ':memory:',
            entities: [
               AiRequest,
               AiResponse,
               PromptTemplate,
               Order,
               Payment,
               Product,
               OrderItem,
               OrderAddress,
               CartItem,
               ProductCategory,
               ProductImage,
               User,
               Role,
               TarotCard,
               TarotSpread,
               TarotReading,
               BirthChart,
               Planet,
               House,
               Aspect,
               ChartInterpretation,
             ],
            synchronize: true,
            logging: false,
            dropSchema: true, // 每次测试前清空数据库
            retryAttempts: 1,
            retryDelay: 1000,
          };
        } else if (isProduction) {
          // 生产环境使用MySQL
          return {
            type: 'mysql',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 3306),
            username: configService.get('DB_USERNAME', 'root'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE', 'magicstar'),
            entities: [
               AiRequest,
               AiResponse,
               PromptTemplate,
               Order,
               Payment,
               Product,
               OrderItem,
               OrderAddress,
               CartItem,
               ProductCategory,
               ProductImage,
               User,
               Role,
               TarotCard,
               TarotSpread,
               TarotReading,
               BirthChart,
               Planet,
               House,
               Aspect,
               ChartInterpretation,
             ],
            synchronize: false, // 生产环境不自动同步
            logging: ['error', 'warn'],
            // 连接池配置
            extra: {
              connectionLimit: 20,
              acquireTimeout: 60000,
              timeout: 60000,
              reconnect: true,
            },
            // 重试配置
            retryAttempts: 3,
            retryDelay: 3000,
            // 缓存配置
            cache: {
              type: 'redis',
              options: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                db: configService.get('REDIS_CACHE_DB', 1),
              },
              duration: 30000, // 30秒缓存
            },
          };
        } else {
          // 开发环境使用SQLite
          return {
            type: 'sqlite',
            database: './dev.db',
            entities: [
               AiRequest,
               AiResponse,
               PromptTemplate,
               Order,
               Payment,
               Product,
               OrderItem,
               OrderAddress,
               CartItem,
               ProductCategory,
               ProductImage,
               User,
               Role,
               TarotCard,
               TarotSpread,
               TarotReading,
               BirthChart,
               Planet,
               House,
               Aspect,
               ChartInterpretation,
             ],
            synchronize: true,
            logging: true,
            retryAttempts: 3,
            retryDelay: 3000,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    DatabaseOptimizerService,
    RedisOptimizerService,
  ],
  exports: [
    DatabaseOptimizerService,
    RedisOptimizerService,
  ],
})
export class DatabaseModule {}
