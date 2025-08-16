import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { ChangePasswordDto } from './dto/update-security.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;

  const mockUser: Partial<User> = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    phone: '13800138000',
    password: 'hashedPassword123',
    nickname: '测试用户',
    status: UserStatus.ACTIVE,
    isVip: false,
    points: 100,
    emailVerified: true,
    phoneVerified: true,
    loginFailCount: 0,
    isLocked: false,
    permissions: [],
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      nickname: '新用户',
      phone: '13800138001',
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const newUser = { ...mockUser, ...createUserDto, password: hashedPassword };
      
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(newUser);
      expect(userRepository.findOne).toHaveBeenCalledTimes(3); // username, email, phone checks
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.save).toHaveBeenCalledWith(newUser);
    });

    it('should throw ConflictException when username already exists', async () => {
      userRepository.findOne.mockResolvedValueOnce({ ...mockUser, username: createUserDto.username });

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('用户名已存在')
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ ...mockUser, email: createUserDto.email }); // email check

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('邮箱已存在')
      );
    });

    it('should throw ConflictException when phone already exists', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ ...mockUser, phone: createUserDto.phone }); // phone check

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('手机号已存在')
      );
    });
  });

  describe('findAll', () => {
    const query: PaginationQueryDto = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      search: 'test',
    };

    it('should return paginated users', async () => {
      const users = [mockUser];
      const total = 1;
      
      // Mock the query builder chain
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([users, total]),
      };
      
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(query);

      expect(result.users).toEqual(users);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.page).toBe(query.page);
      expect(result.pagination.limit).toBe(query.limit);
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        new NotFoundException('用户不存在')
      );
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      nickname: '更新的昵称',
      phone: '13800138002',
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateUserDto)).rejects.toThrow(
        new NotFoundException('用户不存在')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('1');

      expect(userRepository.softDelete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        new NotFoundException('用户不存在')
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const newPassword = 'newPassword123';
      const hashedPassword = 'hashedNewPassword123';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      userRepository.update.mockResolvedValue({ affected: 1 });

      await service.updatePassword('1', newPassword);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(userRepository.update).toHaveBeenCalledWith('1', { password: hashedPassword });
    });
  });

  describe('updateStatus', () => {
    it('should update user status successfully', async () => {
      const updatedUser = { ...mockUser, status: UserStatus.INACTIVE };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateStatus('1', UserStatus.INACTIVE);

      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login info successfully', async () => {
      const ip = '192.168.1.1';
      userRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateLastLogin('1', ip);

      expect(userRepository.update).toHaveBeenCalledWith('1', {
        lastLoginAt: expect.any(Date),
        lastLoginIp: ip,
      });
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password is correct', async () => {
      const password = 'password123';
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.verifyPassword(mockUser as User, password);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('should return false when password is incorrect', async () => {
      const password = 'wrongpassword';
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.verifyPassword(mockUser as User, password);

      expect(result).toBe(false);
    });
  });

  describe('updatePoints', () => {
    it('should update user points successfully', async () => {
      const pointsToAdd = 50;
      const currentPoints = mockUser.points || 0;
      const updatedUser = { ...mockUser, points: currentPoints + pointsToAdd };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updatePoints('1', pointsToAdd);

      expect(result.points).toBe(150); // 100 + 50
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto: UpdateProfileDto = {
      nickname: '新昵称',
      bio: '个人简介',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateProfileDto };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('1', updateProfileDto);

      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateAvatar', () => {
    const updateAvatarDto: UpdateAvatarDto = {
      avatar: 'https://example.com/avatar.jpg',
    };

    it('should update user avatar successfully', async () => {
      const updatedUser = { ...mockUser, avatar: updateAvatarDto.avatar };
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar('1', updateAvatarDto);

      expect(result.avatar).toBe(updateAvatarDto.avatar);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
      confirmPassword: 'newPassword123',
    };

    it('should change password successfully', async () => {
      const hashedNewPassword = 'hashedNewPassword123';
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue(hashedNewPassword as never);
      userRepository.update.mockResolvedValue({ affected: 1 });

      await service.changePassword('1', changePasswordDto);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.password
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 10);
      expect(userRepository.update).toHaveBeenCalledWith('1', { password: hashedNewPassword });
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const invalidDto = { ...changePasswordDto, confirmPassword: 'different' };
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.changePassword('1', invalidDto)).rejects.toThrow(
        new BadRequestException('新密码和确认密码不一致')
      );
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.changePassword('1', changePasswordDto)).rejects.toThrow(
        new BadRequestException('当前密码不正确')
      );
    });
  });
});