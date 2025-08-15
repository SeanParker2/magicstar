import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Tree,
  TreeParent,
  TreeChildren,
  Index,
} from 'typeorm';
import { Product } from './product.entity';

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('product_categories')
@Tree('nested-set')
@Index(['status'])
@Index(['sort_order'])
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon_url: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'text', nullable: true })
  seo_title: string;

  @Column({ type: 'text', nullable: true })
  seo_description: string;

  @Column({ type: 'json', nullable: true })
  seo_keywords: string[];

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Tree relations
  @TreeParent()
  parent: ProductCategory;

  @TreeChildren()
  children: ProductCategory[];

  @Column({ nullable: true })
  parent_id: number;

  // Product relations
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  // Virtual fields
  get product_count(): number {
    return this.products ? this.products.length : 0;
  }

  get is_parent(): boolean {
    return this.children && this.children.length > 0;
  }

  get is_child(): boolean {
    return !!this.parent_id;
  }

  get level(): number {
    // This would be calculated based on the tree structure
    // For now, return 0 for root categories, 1 for children, etc.
    return this.parent_id ? 1 : 0;
  }

  get full_path(): string {
    // This would build the full category path like "Electronics > Phones > Smartphones"
    if (this.parent) {
      return `${this.parent.full_path} > ${this.name}`;
    }
    return this.name;
  }
}