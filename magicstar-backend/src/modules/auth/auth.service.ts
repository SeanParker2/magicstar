import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import {
  LoginDto,
  LoginResponseDto,
  PhoneLoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ResetPasswordDto,
  ForgotPasswordDto,
} from './dto/login.dto';
import {
  RegisterDto,
  PhoneRegisterDto,
  SendSmsCodeDto,
  VerifyEmailDto,
} from './dto/register.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User, UserStatus, LoginType } from '../user/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';
import { SmsService } from '../../common/services/sms.service';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userService: UserService,
    private jwtService: JwtService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  /**
   * 邮箱注册
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username: registerDto.username }, { email: registerDto.email }],
    });

    if (existingUser) {
      if (existingUser.username === registerDto.username) {
        throw new ConflictException('用户名已存在');
      }
      if (existingUser.email === registerDto.email) {
        throw new ConflictException('邮箱已被注册');
      }
    }

    // 验证密码确认
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('密码确认不匹配');
    }

    // 创建用户
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const emailVerificationToken = this.emailService.generateEmailToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    const user = this.userRepository.create({
      username: registerDto.username,
      email: registerDto.email,
      password: hashedPassword,
      phone: registerDto.phone,
      nickname: registerDto.nickname,
      gender: registerDto.gender,
      birthday: registerDto.birthday,
      birthPlace: registerDto.birthPlace,
      birthTime: registerDto.birthTime,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerificationToken,
      emailVerificationExpires,
    });

    const savedUser = await this.userRepository.save(user);

    // 发送验证邮件
    await this.emailService.sendEmailVerification(
      savedUser.email,
      savedUser.username,
      emailVerificationToken,
    );

    return {
      message: '注册成功，请查收邮箱验证邮件',
      userId: savedUser.id,
    };
  }

  /**
   * 手机号注册
   */
  async phoneRegister(
    phoneRegisterDto: PhoneRegisterDto,
  ): Promise<LoginResponseDto> {
    // 验证短信验证码
    const isValidCode = await this.smsService.validateSmsCode(
      phoneRegisterDto.phone,
      phoneRegisterDto.smsCode,
    );

    if (!isValidCode) {
      throw new BadRequestException('短信验证码错误或已过期');
    }

    // 检查手机号是否已注册
    const existingUser = await this.userRepository.findOne({
      where: { phone: phoneRegisterDto.phone },
    });

    if (existingUser) {
      throw new ConflictException('手机号已被注册');
    }

    // 验证密码确认
    if (phoneRegisterDto.password !== phoneRegisterDto.confirmPassword) {
      throw new BadRequestException('密码确认不匹配');
    }

    // 创建用户
    const hashedPassword = await bcrypt.hash(phoneRegisterDto.password, 10);

    const user = this.userRepository.create({
      username: `user_${phoneRegisterDto.phone}`, // 自动生成用户名
      phone: phoneRegisterDto.phone,
      password: hashedPassword,
      nickname: phoneRegisterDto.nickname,
      status: UserStatus.ACTIVE, // 手机验证后直接激活
      phoneVerified: true,
    });

    const savedUser = await this.userRepository.save(user);
    return this.generateTokenResponse(savedUser);
  }

  /**
   * 用户名/邮箱/手机号 + 密码登录
   */
  async login(loginDto: LoginDto, ip: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    // 检查账号是否被锁定
    if (user.isLocked) {
      throw new UnauthorizedException('账号已被锁定，请稍后再试');
    }

    // 重置登录失败次数
    if (user.loginFailCount > 0) {
      await this.userRepository.update(user.id, {
        loginFailCount: 0,
        lockedUntil: undefined,
      });
    }

    // 更新最后登录信息
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });

    return this.generateTokenResponse(user);
  }

  /**
   * 手机号 + 短信验证码登录
   */
  async phoneLogin(
    phoneLoginDto: PhoneLoginDto,
    ip: string,
  ): Promise<LoginResponseDto> {
    // 验证短信验证码
    const isValidCode = await this.smsService.validateSmsCode(
      phoneLoginDto.phone,
      phoneLoginDto.smsCode,
    );

    if (!isValidCode) {
      throw new BadRequestException('短信验证码错误或已过期');
    }

    // 查找用户
    const user = await this.userRepository.findOne({
      where: { phone: phoneLoginDto.phone },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('手机号未注册');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 更新最后登录信息
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });

    return this.generateTokenResponse(user);
  }

  async validateUser(
    usernameOrEmailOrPhone: string,
    password: string,
  ): Promise<User> {
    // 查找用户（支持用户名、邮箱、手机号）
    const user = await this.userRepository.findOne({
      where: [
        { username: usernameOrEmailOrPhone },
        { email: usernameOrEmailOrPhone },
        { phone: usernameOrEmailOrPhone },
      ],
      relations: ['roles'],
    });

    if (!user) {
      // 增加登录失败次数
      await this.handleLoginFailure(usernameOrEmailOrPhone);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // 增加登录失败次数
      await this.handleLoginFailure(user.id, true);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用或未激活');
    }

    return user;
  }

  /**
   * 处理登录失败
   */
  private async handleLoginFailure(
    userIdOrIdentifier: string,
    isExistingUser = false,
  ): Promise<void> {
    if (!isExistingUser) {
      // 如果用户不存在，只记录日志
      this.logger.warn(`登录失败：用户不存在 - ${userIdOrIdentifier}`);
      return;
    }

    // 增加登录失败次数
    const user = await this.userRepository.findOne({
      where: { id: userIdOrIdentifier },
    });
    if (user) {
      const failCount = user.loginFailCount + 1;
      const updateData: any = { loginFailCount: failCount };

      // 如果失败次数达到5次，锁定账号30分钟
      if (failCount >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await this.userRepository.update(userIdOrIdentifier, updateData);
    }
  }

  private generateTokenResponse(user: User): LoginResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7天，单位秒
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        roles: user.roles?.map((role) => role.name) || [],
        permissions: user.permissions || [],
        isVip: user.isVip,
        vipExpiredAt: user.vipExpiredAt,
      },
    };
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: verifyEmailDto.token },
    });

    if (!user) {
      throw new BadRequestException('验证令牌无效');
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('验证令牌已过期');
    }

    // 激活用户账号
    await this.userRepository.update(user.id, {
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    return { message: '邮箱验证成功，账号已激活' };
  }

  /**
   * 发送短信验证码
   */
  async sendSmsCode(
    sendSmsCodeDto: SendSmsCodeDto,
  ): Promise<{ message: string }> {
    // 验证手机号格式
    if (!this.smsService.validatePhoneNumber(sendSmsCodeDto.phone)) {
      throw new BadRequestException('手机号格式不正确');
    }

    // 生成验证码
    const smsCode = this.smsService.generateSmsCode();
    const smsCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 发送短信
    const success = await this.smsService.sendSmsCode(
      sendSmsCodeDto.phone,
      smsCode,
      sendSmsCodeDto.type,
    );

    if (!success) {
      throw new BadRequestException('短信发送失败，请稍后重试');
    }

    // 保存验证码到数据库（如果用户已存在）
    const existingUser = await this.userRepository.findOne({
      where: { phone: sendSmsCodeDto.phone },
    });

    if (existingUser) {
      await this.userRepository.update(existingUser.id, {
        smsCode,
        smsCodeExpires,
      });
    }

    return { message: '短信验证码发送成功' };
  }

  /**
   * 忘记密码
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    let user: User | null = null;

    // 根据标识符查找用户
    if (forgotPasswordDto.method === 'email') {
      user = await this.userRepository.findOne({
        where: { email: forgotPasswordDto.identifier },
      });
    } else {
      user = await this.userRepository.findOne({
        where: { phone: forgotPasswordDto.identifier },
      });
    }

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (forgotPasswordDto.method === 'email') {
      // 发送邮件重置
      const resetToken = this.emailService.generateResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

      await this.userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      await this.emailService.sendPasswordReset(
        user.email,
        user.username,
        resetToken,
      );

      return { message: '密码重置邮件已发送，请查收邮箱' };
    } else {
      // 发送短信验证码
      const smsCode = this.smsService.generateSmsCode();
      const smsCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

      await this.userRepository.update(user.id, {
        smsCode,
        smsCodeExpires,
      });

      const success = await this.smsService.sendSmsCode(
        user.phone!,
        smsCode,
        'reset_password',
      );

      if (!success) {
        throw new BadRequestException('短信发送失败，请稍后重试');
      }

      return { message: '短信验证码已发送' };
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    // 验证密码确认
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('密码确认不匹配');
    }

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: resetPasswordDto.token },
    });

    if (!user) {
      throw new BadRequestException('重置令牌无效');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException('重置令牌已过期');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      loginFailCount: 0, // 重置登录失败次数
      lockedUntil: undefined,
    });

    return { message: '密码重置成功' };
  }

  /**
   * 修改密码
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // 验证密码确认
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('密码确认不匹配');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('原密码错误');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    return { message: '密码修改成功' };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<LoginResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['roles'],
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      return this.generateTokenResponse(user);
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }
}
