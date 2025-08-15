import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { ChangePasswordDto } from './dto/update-security.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginationDto } from '../../common/dto/response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUserByUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUserByUsername) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUserByEmail) {
      throw new ConflictException('邮箱已存在');
    }

    // 检查手机号是否已存在（如果提供）
    if (createUserDto.phone) {
      const existingUserByPhone = await this.userRepository.findOne({
        where: { phone: createUserDto.phone },
      });
      if (existingUserByPhone) {
        throw new ConflictException('手机号已存在');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 创建用户
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      birthday: createUserDto.birthday
        ? new Date(createUserDto.birthday)
        : undefined,
    });

    return this.userRepository.save(user);
  }

  async findAll(query: PaginationQueryDto): Promise<{
    users: User[];
    pagination: PaginationDto;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 搜索条件
    if (search) {
      queryBuilder.where(
        'user.username LIKE :search OR user.email LIKE :search OR user.nickname LIKE :search',
        { search: `%${search}%` },
      );
    }

    // 排序
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    // 分页
    queryBuilder.skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();
    const pagination = new PaginationDto(page, limit, total);

    return { users, pagination };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // 检查手机号是否已被其他用户使用
    if (updateUserDto.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateUserDto.phone },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('手机号已被其他用户使用');
      }
    }

    Object.assign(user, {
      ...updateUserDto,
      birthday: updateUserDto.birthday
        ? new Date(updateUserDto.birthday)
        : user.birthday,
    });

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softDelete(id);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(id, { password: hashedPassword });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findOne(id);
    user.status = status;
    return this.userRepository.save(user);
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async updatePoints(id: string, points: number): Promise<User> {
    const user = await this.findOne(id);
    user.points += points;
    return this.userRepository.save(user);
  }

  async updateVipStatus(
    id: string,
    isVip: boolean,
    expiredAt?: Date,
  ): Promise<User> {
    const user = await this.findOne(id);
    user.isVip = isVip;
    user.vipExpiredAt = expiredAt;
    return this.userRepository.save(user);
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    
    Object.assign(user, {
      ...updateProfileDto,
      birthday: updateProfileDto.birthday
        ? new Date(updateProfileDto.birthday)
        : user.birthday,
    });

    return this.userRepository.save(user);
  }

  async updateAvatar(id: string, updateAvatarDto: UpdateAvatarDto): Promise<User> {
    const user = await this.findOne(id);
    user.avatar = updateAvatarDto.avatar;
    return this.userRepository.save(user);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;
    
    // 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('新密码和确认密码不一致');
    }
    
    const user = await this.findOne(id);
    
    // 验证当前密码
    const isCurrentPasswordValid = await this.verifyPassword(user, currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('当前密码不正确');
    }
    
    // 更新密码
    await this.updatePassword(id, newPassword);
  }

  async updatePhoneNumber(id: string, phone: string): Promise<User> {
    // 检查手机号是否已被其他用户使用
    const existingUser = await this.userRepository.findOne({
      where: { phone },
    });
    if (existingUser && existingUser.id !== id) {
      throw new ConflictException('手机号已被其他用户使用');
    }

    const user = await this.findOne(id);
    user.phone = phone;
    user.phoneVerified = false; // 更换手机号后需要重新验证
    return this.userRepository.save(user);
  }

  async getSecuritySettings(id: string): Promise<{
    hasPassword: boolean;
    hasPhone: boolean;
    phoneVerified: boolean;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  }> {
    const user = await this.findOne(id);
    return {
      hasPassword: !!user.password,
      hasPhone: !!user.phone,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      twoFactorEnabled: false, // 暂时设为false，后续可扩展
    };
  }
}
