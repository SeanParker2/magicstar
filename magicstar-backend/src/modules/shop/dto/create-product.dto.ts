import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsDateString,
  Min,
  Max,
  Length,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProductStatus, ProductType } from '../entities/product.entity';

export class CreateProductImageDto {
  @IsString()
  @Length(1, 500)
  url: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  alt_text?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sort_order?: number;
}

export class CreateProductDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsString()
  @Length(1, 100)
  sku: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  original_price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  cost_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseInt(value) : 0)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  min_stock_level?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  weight?: number;

  @IsOptional()
  @IsObject()
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  category_id?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  seo_title?: string;

  @IsOptional()
  @IsString()
  seo_description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seo_keywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseInt(value) : 0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsBoolean()
  is_digital_delivery?: boolean;

  @IsOptional()
  @IsBoolean()
  track_inventory?: boolean;

  @IsOptional()
  @IsDateString()
  available_from?: string;

  @IsOptional()
  @IsDateString()
  available_until?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}