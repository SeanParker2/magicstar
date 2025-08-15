import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_items')
@Index(['order_id'])
@Index(['product_id'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: number;

  @Column({ type: 'varchar', length: 200 })
  product_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  product_sku: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_image: string;

  @Column({ type: 'json', nullable: true })
  product_options: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  product_snapshot: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column()
  order_id: number;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ nullable: true })
  product_id: number;

  @ManyToOne(() => Product, (product) => product.orderItems, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Virtual fields
  get line_total(): number {
    return this.total_price;
  }

  get unit_price_formatted(): string {
    return `¥${this.unit_price.toFixed(2)}`;
  }

  get total_price_formatted(): string {
    return `¥${this.total_price.toFixed(2)}`;
  }

  get has_product_options(): boolean {
    return this.product_options && Object.keys(this.product_options).length > 0;
  }

  get product_display_name(): string {
    let name = this.product_name;
    
    if (this.has_product_options) {
      const options = Object.entries(this.product_options)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      name += ` (${options})`;
    }
    
    return name;
  }

  get is_product_available(): boolean {
    return !!this.product_id && !!this.product;
  }

  get product_url(): string | null {
    if (!this.product_id) return null;
    return `/products/${this.product_id}`;
  }
}