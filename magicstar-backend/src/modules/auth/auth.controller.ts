import { Controller, Post, Body, UseGuards, Req, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, RefreshTokenDto, ChangePasswordDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/user.decorator';
import { User } from '../user/entities/user.entity';


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
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
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
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto);
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
    const result = await this.authService.changePassword(
      user.id,
      changePasswordDto
    );
    return ResponseDto.success(null, '密码修改成功');
  }
}
