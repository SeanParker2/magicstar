import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../user/entities/user.entity';

@Entity('cart_items')
@Unique(['user_id', 'product_id'])
@Index(['user_id'])
@Index(['created_at'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'json', nullable: true })
  product_options: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  product_id: number;

  @ManyToOne(() => Product, (product) => product.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Virtual fields
  get total_price(): number {
    return this.unit_price * this.quantity;
  }

  get is_available(): boolean {
    return this.product && this.product.is_available;
  }

  get is_in_stock(): boolean {
    if (!this.product || !this.product.track_inventory) return true;
    return this.product.stock_quantity >= this.quantity;
  }

  get stock_status(): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (!this.product || !this.product.track_inventory) return 'in_stock';
    
    if (this.product.stock_quantity === 0) return 'out_of_stock';
    if (this.product.stock_quantity < this.quantity) return 'low_stock';
    return 'in_stock';
  }

  get max_quantity(): number {
    if (!this.product || !this.product.track_inventory) return 999;
    return this.product.stock_quantity;
  }
}