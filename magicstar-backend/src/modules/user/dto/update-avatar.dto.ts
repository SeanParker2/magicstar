import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({ description: '头像URL', example: 'https://example.com/avatar.jpg' })
  @IsString({ message: '头像URL必须是字符串' })
  @IsNotEmpty({ message: '头像URL不能为空' })
  @IsUrl({}, { message: '头像URL格式不正确' })
  avatar: string;
}