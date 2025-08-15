import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum SharePlatform {
  WECHAT = 'wechat',
  WEIBO = 'weibo',
  QQ = 'qq',
  LINK = 'link',
  IMAGE = 'image'
}

export class ShareResultDto {
  @ApiProperty({
    description: '占卜记录ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty({ message: '占卜记录ID不能为空' })
  @IsUUID('4', { message: '占卜记录ID格式无效' })
  divinationId: string

  @ApiProperty({
    description: '分享平台',
    enum: SharePlatform,
    example: SharePlatform.WECHAT
  })
  @IsEnum(SharePlatform, { message: '分享平台无效' })
  platform: SharePlatform

  @ApiProperty({
    description: '自定义分享文案',
    example: '我刚刚进行了一次塔罗牌占卜，结果很准确！',
    required: false
  })
  @IsOptional()
  @IsString()
  customMessage?: string

  @ApiProperty({
    description: '是否包含卡牌图片',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  includeCardImages?: boolean = true

  @ApiProperty({
    description: '是否包含解读内容',
    example: true,
    required: false,
    default: false
  })
  @IsOptional()
  includeInterpretation?: boolean = false
}