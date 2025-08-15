import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  Length,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  OrderStatus,
  PaymentStatus,
  ShippingStatus,
} from '../entities/order.entity';
import { PaymentMethod } from '../entities/payment.entity';
import { AddressType } from '../entities/order-address.entity';

export class CreateOrderItemDto {
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

export class CreateOrderAddressDto {
  @IsEnum(AddressType)
  type: AddressType;

  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  first_name: string;

  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  last_name: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  company?: string;

  @IsString()
  @Length(1, 200)
  @Transform(({ value }) => value?.trim())
  address_line_1: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  @Transform(({ value }) => value?.trim())
  address_line_2?: string;

  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  city: string;

  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  state: string;

  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => value?.trim())
  postal_code: string;

  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  country: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim())
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderAddressDto)
  addresses: CreateOrderAddressDto[];

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  coupon_code?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  admin_notes?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  tracking_number?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  shipping_carrier?: string;
}

export class OrderQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsEnum(ShippingStatus)
  shipping_status?: ShippingStatus;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  user_id?: number;
}

export class CancelOrderDto {
  @IsString()
  @Length(1, 500)
  @Transform(({ value }) => value?.trim())
  reason: string;
}

export class OrderResponseDto {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  admin_notes?: string;
  coupon_code?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  confirmed_at?: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
  
  user: {
    id: number;
    username: string;
    email: string;
  };
  
  items: {
    id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_name: string;
    product_sku?: string;
    product_image?: string;
    product_options?: Record<string, any>;
    notes?: string;
    product?: {
      id: number;
      name: string;
      sku: string;
      status: string;
    };
  }[];
  
  addresses: {
    id: number;
    type: AddressType;
    first_name: string;
    last_name: string;
    company?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
    email?: string;
    notes?: string;
  }[];
  
  payments: {
    id: number;
    transaction_id: string;
    payment_method: PaymentMethod;
    status: string;
    amount: number;
    currency: string;
    processed_at?: Date;
    failed_at?: Date;
    failure_reason?: string;
  }[];
  
  // Virtual fields
  item_count: number;
  is_paid: boolean;
  is_cancelled: boolean;
  is_completed: boolean;
  can_cancel: boolean;
  can_refund: boolean;
  shipping_address?: any;
  billing_address?: any;
  latest_payment?: any;
  is_expired: boolean;
  days_since_order: number;
}