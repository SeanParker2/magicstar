import { IsEnum, IsOptional, IsArray, IsBoolean, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FortuneType } from '../entities/fortune-template.entity';

export class CreateFortuneSubscriptionDto {
  @IsEnum(FortuneType)
  type: FortuneType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pushTypes?: string[] = ['overall']; // ['overall', 'love', 'career', 'wealth', 'health']

  @IsOptional()
  @IsString()
  reminderTime?: string = '08:00'; // HH:mm format

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  weeklyDay?: number = 1; // 0-6, 0为周日

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  monthlyDay?: number = 1; // 1-28

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean = true;
}

export class UpdateFortuneSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pushTypes?: string[];

  @IsOptional()
  @IsString()
  reminderTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  weeklyDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  monthlyDay?: number;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;
}

export class GetFortuneSubscriptionsDto {
  @IsOptional()
  @IsEnum(FortuneType)
  type?: FortuneType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;
}