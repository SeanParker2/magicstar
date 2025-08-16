import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserStatus } from '../user/entities/user.entity';
import { Role, RoleType, Permission } from '../user/entities/role.entity';
import { SmsService } from '../../common/services/sms.service';
import { EmailService } from '../../common/services/email.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let emailService: any;

  const mockUser: Partial<User> = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    phone: '13800138000',
    password: 'hashedPassword123',
    nickname: '测试用户',
    status: UserStatus.ACTIVE,
    isVip: false,
    points: 0,
    emailVerified: true,
    phoneVerified: true,
    loginFailCount: 0,
    isLocked: false,
    permissions: [],
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRole: Partial<Role> = {
    id: '1',
    name: 'user',
    description: '普通用户',
    type: RoleType.USER,
    permissions: [Permission.DIVINATION_TAROT],
    isActive: true,
    priority: 0,
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockUserService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn(),
    };

    const mockSmsService = {
      validateSmsCode: jest.fn(),
      generateSmsCode: jest.fn(),
      sendSmsCode: jest.fn(),
      validatePhoneNumber: jest.fn(),
    };

    const mockEmailService = {
      generateEmailToken: jest.fn(),
      sendEmailVerification: jest.fn(),
      generateResetToken: jest.fn(),
      sendPasswordReset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SmsService, useValue: mockSmsService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);

    // Setup default mocks
    mockConfig.get.mockImplementation((key: string) => {
      const config = {
        'jwt.secret': 'test-secret',
        'jwt.expiresIn': '1d',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const identifier = 'test@example.com';
      const password = 'password123';
      
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser(identifier, password);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
        relations: ['roles'],
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const identifier = 'nonexistent@example.com';
      const password = 'password123';
      
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser(identifier, password)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const identifier = 'test@example.com';
      const password = 'wrongpassword';
      
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.validateUser(identifier, password)).rejects.toThrow(UnauthorizedException);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'test@example.com',
      password: 'password123',
    };
    const ip = '127.0.0.1';

    it('should return login response when credentials are valid', async () => {
      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';
      
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValueOnce(mockToken).mockReturnValueOnce(mockRefreshToken);

      const result = await service.login(loginDto, ip);

      expect(result).toEqual({
        accessToken: mockToken,
        refreshToken: mockRefreshToken,
        expiresIn: 7 * 24 * 60 * 60,
        tokenType: 'Bearer',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          phone: mockUser.phone,
          nickname: mockUser.nickname,
          avatar: mockUser.avatar,
          roles: [],
          permissions: [],
          isVip: mockUser.isVip,
          vipExpiredAt: mockUser.vipExpiredAt,
        },
      });
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        lastLoginAt: expect.any(Date),
        lastLoginIp: ip,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, ip)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      nickname: '新用户',
      phone: '13800138001',
    };

    it('should create new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const emailToken = 'email-verification-token';
      const newUser = { ...mockUser, ...registerDto, password: hashedPassword };
      
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      emailService.generateEmailToken.mockReturnValue(emailToken);
      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);
      emailService.sendEmailVerification.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: '注册成功，请查收邮箱验证邮件',
        userId: newUser.id,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: registerDto.username }, { email: registerDto.email }],
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow('邮箱已被注册');
    });

    it('should throw ConflictException when username already exists', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, username: registerDto.username });

      await expect(service.register(registerDto)).rejects.toThrow('用户名已存在');
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const invalidDto = { ...registerDto, confirmPassword: 'different' };
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.register(invalidDto)).rejects.toThrow('密码确认不匹配');
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should return new tokens when refresh token is valid', async () => {
      const mockToken = 'new-access-token';
      const mockNewRefreshToken = 'new-refresh-token';
      const payload = { sub: mockUser.id, username: mockUser.username, email: mockUser.email };
      
      jwtService.verify.mockReturnValue(payload);
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce(mockToken).mockReturnValueOnce(mockNewRefreshToken);

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toEqual({
        accessToken: mockToken,
        refreshToken: mockNewRefreshToken,
        expiresIn: 7 * 24 * 60 * 60,
        tokenType: 'Bearer',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          phone: mockUser.phone,
          nickname: mockUser.nickname,
          avatar: mockUser.avatar,
          roles: [],
          permissions: [],
          isVip: mockUser.isVip,
          vipExpiredAt: mockUser.vipExpiredAt,
        },
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = { sub: 'nonexistent-user-id', username: 'test', email: 'test@example.com' };
      
      jwtService.verify.mockReturnValue(payload);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});