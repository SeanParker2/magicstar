import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/user.decorator';
import { User } from '../user/entities/user.entity';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ChangePasswordDto {
  @ApiProperty({ description: '原密码' })
  @IsString({ message: '原密码必须是字符串' })
  @MinLength(6, { message: '原密码至少6个字符' })
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(6, { message: '新密码至少6个字符' })
  newPassword: string;
}

@ApiTags('认证')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: ResponseDto<LoginResponseDto>,
  })
  async register(@Body() createUserDto: CreateUserDto) {
    const result = await this.authService.register(createUserDto);
    return ResponseDto.success(result, '注册成功');
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: ResponseDto<LoginResponseDto>,
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const result = await this.authService.login(loginDto, ip);
    return ResponseDto.success(result, '登录成功');
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新令牌' })
  @ApiResponse({
    status: 200,
    description: '令牌刷新成功',
    type: ResponseDto<LoginResponseDto>,
  })
  async refresh(@CurrentUser() user: User) {
    const result = await this.authService.refreshToken(user);
    return ResponseDto.success(result, '令牌刷新成功');
  }

  @Patch('password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({
    status: 200,
    description: '密码修改成功',
    type: ResponseDto,
  })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return ResponseDto.success(null, '密码修改成功');
  }
}