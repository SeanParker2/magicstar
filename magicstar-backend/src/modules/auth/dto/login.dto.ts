import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { LoginType } from '../../user/entities/user.entity';

export class LoginDto {
  @ApiProperty({ description: '用户名、邮箱或手机号', example: 'john_doe' })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  @ApiPropertyOptional({ description: '记住登录状态', default: false })
  @IsOptional()
  rememberMe?: boolean;
}

export class PhoneLoginDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '短信验证码', example: '123456' })
  @IsString({ message: '验证码必须是字符串' })
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  smsCode: string;

  @ApiPropertyOptional({ description: '记住登录状态', default: false })
  @IsOptional()
  rememberMe?: boolean;
}

export class WechatLoginDto {
  @ApiProperty({ description: '微信授权码' })
  @IsString({ message: '授权码必须是字符串' })
  @IsNotEmpty({ message: '授权码不能为空' })
  code: string;

  @ApiPropertyOptional({ description: '用户信息' })
  @IsOptional()
  userInfo?: {
    nickname?: string;
    avatar?: string;
    gender?: number;
  };
}

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  refreshToken: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;

  @ApiProperty({ description: '令牌过期时间（秒）' })
  expiresIn: number;

  @ApiProperty({ description: '令牌类型' })
  tokenType: string;

  @ApiProperty({ description: '用户信息' })
  user: {
    id: string;
    username: string;
    email: string;
    phone?: string;
    nickname?: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    isVip: boolean;
    vipExpiredAt?: Date;
  };
}

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString({ message: '当前密码必须是字符串' })
  @IsNotEmpty({ message: '当前密码不能为空' })
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(6, { message: '新密码至少6个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: '新密码必须包含至少一个大写字母、一个小写字母和一个数字',
  })
  newPassword: string;

  @ApiProperty({ description: '确认新密码' })
  @IsString({ message: '确认密码必须是字符串' })
  @IsNotEmpty({ message: '确认密码不能为空' })
  confirmPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '重置令牌' })
  @IsString({ message: '重置令牌必须是字符串' })
  @IsNotEmpty({ message: '重置令牌不能为空' })
  token: string;

  @ApiProperty({ description: '新密码' })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(6, { message: '新密码至少6个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: '新密码必须包含至少一个大写字母、一个小写字母和一个数字',
  })
  newPassword: string;

  @ApiProperty({ description: '确认新密码' })
  @IsString({ message: '确认密码必须是字符串' })
  @IsNotEmpty({ message: '确认密码不能为空' })
  confirmPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: '邮箱或手机号', example: 'john@example.com' })
  @IsString({ message: '邮箱或手机号必须是字符串' })
  @IsNotEmpty({ message: '邮箱或手机号不能为空' })
  identifier: string;

  @ApiProperty({
    description: '重置方式',
    enum: ['email', 'sms'],
    example: 'email',
  })
  @IsEnum(['email', 'sms'], { message: '重置方式必须是email或sms' })
  method: 'email' | 'sms';
}
