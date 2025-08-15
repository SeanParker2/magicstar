import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, ShippingStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderAddress, AddressType } from '../entities/order-address.entity';
import { Payment, PaymentStatus as PaymentEntityStatus } from '../entities/payment.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Product } from '../entities/product.entity';
import { User } from '../../user/entities/user.entity';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderQueryDto,
  CancelOrderDto,
  OrderResponseDto,
} from '../dto/order.dto';
import { CartService } from './cart.service';
import { ProductService } from './product.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderAddress)
    private readonly orderAddressRepository: Repository<OrderAddress>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
  ) {}

  async createOrder(
    userId: number,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const { items, addresses, notes, coupon_code } = createOrderDto;

    // Validate user
    const user = await this.userRepository.findOne({ 
      where: { id: userId.toString() } 
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Start transaction
    return await this.dataSource.transaction(async (manager) => {
      // Validate and calculate order totals
      let subtotal = 0;
      const validatedItems: Array<{
        product_id: number;
        quantity: number;
        product_options?: Record<string, any>;
        notes?: string;
        product: Product;
        unit_price: number;
        total_price: number;
      }> = [];

      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.product_id },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.product_id} not found`);
        }

        // Check stock availability
        if (product.track_inventory && product.stock_quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}`,
          );
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        validatedItems.push({
          ...item,
          product,
          unit_price: product.price,
          total_price: itemTotal,
        });
      }

      // Calculate taxes and shipping
      const tax_amount = subtotal * 0.08; // 8% tax
      const shipping_amount = subtotal >= 100 ? 0 : 10; // Free shipping over $100
      const discount_amount = 0; // TODO: Implement coupon logic
      const total_amount = subtotal + tax_amount + shipping_amount - discount_amount;

      // Create order
      const order = manager.create(Order, {
        user_id: userId,
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
        shipping_status: ShippingStatus.PENDING,
        subtotal_amount: subtotal,
        tax_amount,
        shipping_amount,
        discount_amount,
        total_amount,
        currency: 'USD',
        notes,
        coupon_code,
      });

      const savedOrder = await manager.save(order);

      // Create order items
      const orderItems: OrderItem[] = [];
      for (const item of validatedItems) {
        const orderItem = manager.create(OrderItem, {
          order_id: savedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_name: item.product.name,
          product_sku: item.product.sku,
          product_image: item.product.images?.[0]?.url,
          product_options: item.product_options,
          product_snapshot: {
            name: item.product.name,
            description: item.product.description,
            price: item.product.price,
            attributes: item.product.attributes,
          },
          notes: item.notes,
        });

        const savedOrderItem = await manager.save(orderItem);
        orderItems.push(savedOrderItem);

        // Update product stock
        if (item.product.track_inventory) {
          await manager.decrement(
            Product,
            { id: item.product_id },
            'stock_quantity',
            item.quantity,
          );
        }

        // Increment sold count
        await manager.increment(
          Product,
          { id: item.product_id },
          'sold_count',
          item.quantity,
        );
      }

      // Create addresses
      if (addresses && addresses.length > 0) {
        for (const address of addresses) {
          const orderAddress = manager.create(OrderAddress, {
            order_id: savedOrder.id,
            ...address,
          });
          await manager.save(orderAddress);
        }
      }

      // Clear user's cart
      await manager.delete(CartItem, { user_id: userId });

      // Load complete order with relations
      const completeOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'addresses', 'user'],
      });

      return this.formatOrderResponse(completeOrder!);
    });
  }

  async findAll(queryDto: OrderQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      shipping_status,
      user_id,
      start_date,
      end_date,

      search,
    } = queryDto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.addresses', 'addresses')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.payments', 'payments');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (payment_status) {
      queryBuilder.andWhere('order.payment_status = :paymentStatus', {
        paymentStatus: payment_status,
      });
    }

    if (shipping_status) {
      queryBuilder.andWhere('order.shipping_status = :shippingStatus', {
        shippingStatus: shipping_status,
      });
    }

    if (user_id) {
      queryBuilder.andWhere('order.user_id = :userId', { userId: user_id });
    }

    if (start_date) {
      queryBuilder.andWhere('order.created_at >= :startDate', {
        startDate: start_date,
      });
    }

    if (end_date) {
      queryBuilder.andWhere('order.created_at <= :endDate', {
        endDate: end_date,
      });
    }



    if (search) {
      queryBuilder.andWhere(
        '(order.order_number LIKE :search OR user.email LIKE :search OR user.username LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy('order.created_at', 'DESC');

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders.map(order => this.formatOrderResponse(order)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, userId?: number): Promise<OrderResponseDto> {
    const whereCondition: any = { id };
    if (userId) {
      whereCondition.user_id = userId;
    }

    const order = await this.orderRepository.findOne({
      where: whereCondition,
      relations: ['items', 'addresses', 'user', 'payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrderResponse(order);
  }

  async findByOrderNumber(
    orderNumber: string,
    userId?: number,
  ): Promise<OrderResponseDto> {
    const whereCondition: any = { order_number: orderNumber };
    if (userId) {
      whereCondition.user_id = userId;
    }

    const order = await this.orderRepository.findOne({
      where: whereCondition,
      relations: ['items', 'addresses', 'user', 'payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrderResponse(order);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const { status, admin_notes } = updateStatusDto;

    // Validate status transitions
    if (status && !this.isValidStatusTransition(order.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}`,
      );
    }

    // Update order
    const updateData: any = {};
    if (status) updateData.status = status;
    if (admin_notes) updateData.admin_notes = admin_notes;

    // Set timestamps based on status
    if (status === OrderStatus.CONFIRMED) {
      updateData.confirmed_at = new Date();
    } else if (status === OrderStatus.SHIPPED) {
      updateData.shipped_at = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      updateData.delivered_at = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelled_at = new Date();
      // Restore product stock
      await this.restoreProductStock(order.items);
    }

    await this.orderRepository.update(id, updateData);

    return this.findOne(id);
  }

  async cancelOrder(
    id: number,
    userId: number,
    cancelDto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id, user_id: userId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.can_cancel) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    await this.updateStatus(id, {
      status: OrderStatus.CANCELLED,
      admin_notes: cancelDto.reason,
    });

    return this.findOne(id, userId);
  }

  async getUserOrders(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAll({
      user_id: userId,
      page,
      limit,
    });
  }

  async getOrderStats(userId?: number) {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (userId) {
      queryBuilder.where('order.user_id = :userId', { userId });
    }

    const [totalOrders, totalRevenue] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .select('SUM(order.total_amount)', 'total')
        .getRawOne()
        .then(result => parseFloat(result.total) || 0),
    ]);

    const statusCounts = await queryBuilder
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      status_counts: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  private isValidStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const validTransitions = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async restoreProductStock(orderItems: OrderItem[]): Promise<void> {
    for (const item of orderItems) {
      const product = await this.productService.findOne(item.product_id);
      if (product.track_inventory) {
        await this.productService.updateStock(item.product_id, item.quantity);
      }
    }
  }

  private formatOrderResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      shipping_status: order.shipping_status,
      subtotal: order.total_amount,
      tax_amount: order.tax_amount,
      shipping_amount: order.shipping_amount,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
      currency: order.currency,
      notes: order.notes,
      coupon_code: order.coupon_code,
      items: order.items?.map(item => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image: item.product_image,
        product_options: item.product_options,
        notes: item.notes,
      })) || [],
      addresses: order.addresses?.map(addr => ({
        id: addr.id,
        type: addr.type,
        first_name: addr.first_name,
        last_name: addr.last_name,
        company: addr.company,
        address_line_1: addr.address_line_1,
        address_line_2: addr.address_line_2,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country,
        phone: addr.phone,
        email: addr.email,
      })) || [],
      user: {
        id: parseInt(order.user?.id || '0'),
        username: order.user?.username || '',
        email: order.user?.email || '',
      },
      payments: order.payments?.map(payment => ({
        id: payment.id,
        transaction_id: payment.transaction_id,
        payment_method: payment.payment_method,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        processed_at: payment.processed_at,
        failed_at: payment.failed_at,
        failure_reason: payment.failure_reason,
      })) || [],
      item_count: order.item_count,
      is_paid: order.is_paid,
      is_cancelled: order.is_cancelled,
      is_completed: order.is_completed,
      can_cancel: order.can_cancel,
      can_refund: order.can_refund,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      latest_payment: order.latest_payment,
      is_expired: order.is_expired,
      days_since_order: order.days_since_order,
      created_at: order.created_at,
      updated_at: order.updated_at,
      confirmed_at: order.confirmed_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
    };
  }
}