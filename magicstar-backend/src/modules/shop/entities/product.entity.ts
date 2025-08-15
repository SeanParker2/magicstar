import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { ProductImage } from './product-image.entity';
import { CartItem } from './cart-item.entity';
import { OrderItem } from './order-item.entity';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

export enum ProductType {
  PHYSICAL = 'physical',
  DIGITAL = 'digital',
  SERVICE = 'service',
}

@Entity('products')
@Index(['status', 'category_id'])
@Index(['created_at'])
@Index(['price'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100, unique: true })
  sku: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  short_description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  original_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_price: number;

  @Column({ type: 'int', default: 0 })
  stock_quantity: number;

  @Column({ type: 'int', nullable: true })
  min_stock_level: number;

  @Column({ type: 'int', default: 0 })
  sold_count: number;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  review_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'json', nullable: true })
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  };

  @Column({
    type: 'varchar', length: 50,
    default: ProductType.PHYSICAL,
  })
  type: ProductType;

  @Column({
    type: 'varchar', length: 50,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  seo_title: string;

  @Column({ type: 'text', nullable: true })
  seo_description: string;

  @Column({ type: 'json', nullable: true })
  seo_keywords: string[];

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_featured: boolean;

  @Column({ type: 'boolean', default: true })
  is_digital_delivery: boolean;

  @Column({ type: 'boolean', default: true })
  track_inventory: boolean;

  @Column({ type: 'datetime', nullable: true })
  available_from: Date;

  @Column({ type: 'datetime', nullable: true })
  available_until: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column({ nullable: true })
  category_id: number;

  @ManyToOne(() => ProductCategory, (category) => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
  })
  images: ProductImage[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.product)
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];

  // Virtual fields
  get is_in_stock(): boolean {
    return this.track_inventory ? this.stock_quantity > 0 : true;
  }

  get is_low_stock(): boolean {
    if (!this.track_inventory || !this.min_stock_level) return false;
    return this.stock_quantity <= this.min_stock_level;
  }

  get discount_percentage(): number {
    if (!this.original_price || this.original_price <= this.price) return 0;
    return Math.round(((this.original_price - this.price) / this.original_price) * 100);
  }

  get is_on_sale(): boolean {
    return this.discount_percentage > 0;
  }

  get is_available(): boolean {
    const now = new Date();
    const availableFrom = this.available_from ? new Date(this.available_from) : null;
    const availableUntil = this.available_until ? new Date(this.available_until) : null;
    
    if (availableFrom && now < availableFrom) return false;
    if (availableUntil && now > availableUntil) return false;
    
    return this.status === ProductStatus.ACTIVE && this.is_in_stock;
  }
}