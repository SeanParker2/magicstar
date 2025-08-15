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

export enum AddressType {
  SHIPPING = 'shipping',
  BILLING = 'billing',
}

@Entity('order_addresses')
@Index(['order_id', 'type'])
export class OrderAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar', length: 50,
  })
  type: AddressType;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 100, nullable: true })
  company: string;

  @Column({ length: 200 })
  address_line_1: string;

  @Column({ length: 200, nullable: true })
  address_line_2: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100 })
  state: string;

  @Column({ length: 20 })
  postal_code: string;

  @Column({ length: 100 })
  country: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 200, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column()
  order_id: number;

  @ManyToOne(() => Order, (order) => order.addresses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // Virtual fields
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  get full_address(): string {
    const parts = [
      this.address_line_1,
      this.address_line_2,
      this.city,
      this.state,
      this.postal_code,
      this.country,
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  get formatted_address(): string {
    const lines: string[] = [];
    
    if (this.company) {
      lines.push(this.company);
    }
    
    lines.push(this.full_name);
    lines.push(this.address_line_1);
    
    if (this.address_line_2) {
      lines.push(this.address_line_2);
    }
    
    lines.push(`${this.city}, ${this.state} ${this.postal_code}`);
    lines.push(this.country);
    
    if (this.phone) {
      lines.push(`Phone: ${this.phone}`);
    }
    
    return lines.join('\n');
  }

  get is_shipping_address(): boolean {
    return this.type === AddressType.SHIPPING;
  }

  get is_billing_address(): boolean {
    return this.type === AddressType.BILLING;
  }

  get country_code(): string {
    // Simple mapping for common countries
    const countryMap: Record<string, string> = {
      'China': 'CN',
      '中国': 'CN',
      'United States': 'US',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'Japan': 'JP',
      'South Korea': 'KR',
    };
    
    return countryMap[this.country] || 'CN';
  }
}