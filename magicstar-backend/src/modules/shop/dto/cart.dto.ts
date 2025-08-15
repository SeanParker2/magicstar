import {
  IsNumber,
  IsOptional,
  IsObject,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AddToCartDto {
  @IsNumber()
  @Type(() => Number)
  product_id: number;

  @IsNumber()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsObject()
  product_options?: Record<string, any>;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

export class UpdateCartItemDto {
  @IsNumber()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsObject()
  product_options?: Record<string, any>;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

export class CartItemResponseDto {
  id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_options?: Record<string, any>;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  product: {
    id: number;
    name: string;
    sku: string;
    price: number;
    stock_quantity: number;
    is_available: boolean;
    images?: {
      id: number;
      url: string;
      thumbnail_url?: string;
      alt_text?: string;
      is_primary: boolean;
    }[];
  };
  is_available: boolean;
  is_in_stock: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  max_quantity: number;
}

export class CartSummaryDto {
  items: CartItemResponseDto[];
  total_items: number;
  total_quantity: number;
  subtotal: number;
  total_amount: number;
  has_unavailable_items: boolean;
  has_out_of_stock_items: boolean;
}