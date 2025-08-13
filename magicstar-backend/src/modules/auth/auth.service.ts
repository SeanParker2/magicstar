import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from '../user/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<LoginResponseDto> {
    const user = await this.userService.create(createUserDto);
    return this.generateTokenResponse(user);
  }

  async login(loginDto: LoginDto, ip: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    
    // 更新最后登录信息
    await this.userService.updateLastLogin(user.id, ip);
    
    return this.generateTokenResponse(user);
  }

  async validateUser(usernameOrEmail: string, password: string): Promise<User> {
    // 尝试通过用户名查找
    let user = await this.userService.findByUsername(usernameOrEmail);
    
    // 如果通过用户名没找到，尝试通过邮箱查找
    if (!user) {
      user = await this.userService.findByEmail(usernameOrEmail);
    }

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await this.userService.verifyPassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== 'active') {
      throw new UnauthorizedException('账户已被禁用');
    }

    return user;
  }

  private generateTokenResponse(user: User): LoginResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    // 移除敏感信息
    const { password, ...userInfo } = user;

    return {
      accessToken,
      user: userInfo,
    };
  }

  async refreshToken(user: User): Promise<LoginResponseDto> {
    return this.generateTokenResponse(user);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userService.findOne(userId);
    
    // 验证旧密码
    const isOldPasswordValid = await this.userService.verifyPassword(user, oldPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException('原密码错误');
    }

    // 更新密码
    await this.userService.updatePassword(userId, newPassword);
  }
}