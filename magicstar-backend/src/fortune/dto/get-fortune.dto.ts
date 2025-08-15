import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { FortuneType } from '../entities/fortune-template.entity';

export class GetFortuneDto {
  @IsEnum(FortuneType)
  type: FortuneType;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value).toISOString().split('T')[0] : undefined)
  date?: string;
}