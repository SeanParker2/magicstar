import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 实体导入
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductImage } from './entities/product-image.entity';
import { CartItem } from './entities/cart-item.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderAddress } from './entities/order-address.entity';
import { Payment } from './entities/payment.entity';

// 服务导入
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';

// 控制器导入
import { ProductController } from './controllers/product.controller';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';

// 模块导入
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductCategory,
      ProductImage,
      CartItem,
      Order,
      OrderItem,
      OrderAddress,
      Payment,
    ]),
    UserModule,
    AuthModule,
    PaymentModule,
  ],
  controllers: [
    ProductController,
    CartController,
    OrderController,
  ],
  providers: [
    ProductService,
    CartService,
    OrderService,
  ],
  exports: [
    // ProductService,
    // CartService,
    // OrderService,
  ],
})
export class ShopModule {}