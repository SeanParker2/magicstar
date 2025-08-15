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
import { Product } from './product.entity';

export enum ImageType {
  MAIN = 'main',
  GALLERY = 'gallery',
  THUMBNAIL = 'thumbnail',
  DETAIL = 'detail',
}

@Entity('product_images')
@Index(['product_id', 'sort_order'])
@Index(['is_primary'])
export class ProductImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  alt_text: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string;

  @Column({
    type: 'varchar', length: 50,
    default: ImageType.GALLERY,
  })
  type: ImageType;

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ type: 'bigint', nullable: true })
  file_size: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mime_type: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  original_filename: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column()
  product_id: number;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Virtual fields
  get is_main_image(): boolean {
    return this.type === ImageType.MAIN || this.is_primary;
  }

  get display_url(): string {
    return this.thumbnail_url || this.url;
  }

  get file_size_formatted(): string {
    if (!this.file_size) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this.file_size) / Math.log(1024));
    return Math.round(this.file_size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  get dimensions(): string {
    if (!this.width || !this.height) return 'Unknown';
    return `${this.width}x${this.height}`;
  }
}