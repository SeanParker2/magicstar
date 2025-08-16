import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus, PaymentMethod, PaymentType } from '../entities/payment.entity';
import { PaymentRecord } from '../entities/payment-record.entity';
import { WechatPaymentService } from './wechat-payment.service';
import { AlipayService } from './alipay.service';
import { PaymentSecurityService } from './payment-security.service';
import { PaymentLoggerService } from './payment-logger.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let paymentRecordRepository: Repository<PaymentRecord>;
  let dataSource: DataSource;
  let wechatPaymentService: WechatPaymentService;
  let alipayService: AlipayService;
  let paymentSecurityService: PaymentSecurityService;
  let paymentLoggerService: PaymentLoggerService;

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockPaymentRecordRepository = {
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockWechatPaymentService = {
    createPayment: jest.fn(),
  };

  const mockAlipayService = {
    createPayment: jest.fn(),
  };

  const mockPaymentSecurityService = {
    validateSignature: jest.fn(),
    validatePaymentAmount: jest.fn(),
    validatePaymentTimeWindow: jest.fn(),
    logSecurityEvent: jest.fn(),
    checkDuplicatePayment: jest.fn().mockReturnValue(false),
  };

  const mockPaymentLoggerService = {
    logPaymentCreated: jest.fn(),
    logPaymentSuccess: jest.fn(),
    logPaymentFailed: jest.fn(),
    logSecurityException: jest.fn(),
    logPerformanceMetrics: jest.fn(),
    logPaymentCreation: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(PaymentRecord),
          useValue: mockPaymentRecordRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: WechatPaymentService,
          useValue: mockWechatPaymentService,
        },
        {
          provide: AlipayService,
          useValue: mockAlipayService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PaymentSecurityService,
          useValue: mockPaymentSecurityService,
        },
        {
          provide: PaymentLoggerService,
          useValue: mockPaymentLoggerService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    paymentRecordRepository = module.get<Repository<PaymentRecord>>(getRepositoryToken(PaymentRecord));
    dataSource = module.get<DataSource>(DataSource);
    wechatPaymentService = module.get<WechatPaymentService>(WechatPaymentService);
    alipayService = module.get<AlipayService>(AlipayService);
    paymentSecurityService = module.get<PaymentSecurityService>(PaymentSecurityService);
    paymentLoggerService = module.get<PaymentLoggerService>(PaymentLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create payment successfully with database persistence', async () => {
      const createPaymentDto: CreatePaymentDto & { userId: string } = {
        userId: 'user-123',
        orderId: 'order-123',
        amount: 100.00,
        currency: 'CNY',
        paymentMethod: PaymentMethod.WECHAT_PAY,
        paymentType: PaymentType.ORDER,
        description: 'Test payment',
      };

      const mockPayment = {
        id: 'payment-123',
        paymentNo: 'PAY202412251234567890',
        ...createPaymentDto,
        status: PaymentStatus.PENDING,
        fee: 0,
        actualAmount: 100.00,
        refundedAmount: 0,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      const mockPaymentResult = {
        success: true,
        paymentUrl: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
        qrCode: 'weixin://wxpay/bizpayurl?pr=test',
      };

      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockWechatPaymentService.createPayment.mockResolvedValue(mockPaymentResult);
      mockPaymentLoggerService.logPaymentCreated.mockResolvedValue(undefined);
      mockPaymentLoggerService.logPaymentSuccess.mockResolvedValue(undefined);

      const result = await service.createPayment(createPaymentDto);

      // 验证save方法被调用
      expect(mockPaymentRepository.save).toHaveBeenCalledTimes(1);
      
      // 获取实际调用的参数
      const saveCall = mockPaymentRepository.save.mock.calls[0][0];
      
      // 验证各个字段
      expect(saveCall.paymentNo).toMatch(/^PAY\d+$/);
      expect(saveCall.userId).toBe('user-123');
      expect(saveCall.orderId).toBe('order-123');
      expect(saveCall.amount).toBe(100.00);
      expect(saveCall.currency).toBe('CNY');
      expect(saveCall.paymentMethod).toBe(PaymentMethod.WECHAT_PAY);
      expect(saveCall.paymentType).toBe(PaymentType.ORDER);
      expect(saveCall.status).toBe(PaymentStatus.PENDING);
      expect(saveCall.description).toBe('Test payment');
      expect(saveCall.actualAmount).toBe(100.00);
      expect(saveCall.fee).toBe(0);
      expect(saveCall.refundedAmount).toBe(0);
      expect(saveCall.expiredAt).toBeInstanceOf(Date);

      expect(mockWechatPaymentService.createPayment).toHaveBeenCalled();
      expect(mockPaymentLoggerService.logPaymentCreation).toHaveBeenCalled();
      expect(mockPaymentLoggerService.logPerformanceMetrics).toHaveBeenCalled();

      expect(result).toEqual({
        paymentId: 'payment-123',
        paymentNo: 'PAY202412251234567890',
        ...mockPaymentResult,
      });
    });

    it('should handle payment creation failure and update database', async () => {
      const createPaymentDto: CreatePaymentDto & { userId: string } = {
        userId: 'user-123',
        orderId: 'order-123',
        amount: 100.00,
        currency: 'CNY',
        paymentMethod: PaymentMethod.WECHAT_PAY,
        paymentType: PaymentType.ORDER,
        description: 'Test payment',
      };

      const mockPayment = {
        id: 'payment-123',
        paymentNo: 'PAY202412251234567890',
        ...createPaymentDto,
        status: PaymentStatus.PENDING,
      };

      const mockError = new Error('Payment service unavailable');

      mockPaymentRepository.save.mockResolvedValueOnce(mockPayment);
      mockWechatPaymentService.createPayment.mockRejectedValue(mockError);
      mockPaymentRepository.save.mockResolvedValueOnce({ ...mockPayment, status: PaymentStatus.FAILED });
      mockPaymentLoggerService.logPaymentCreation.mockResolvedValue(undefined);
      mockPaymentLoggerService.logPerformanceMetrics.mockResolvedValue(undefined);

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow();

      expect(mockPaymentRepository.save).toHaveBeenCalledTimes(2);
      expect(mockPaymentLoggerService.logPaymentCreation).toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status from database', async () => {
      const paymentId = 'payment-123';
      const mockPayment = {
        id: paymentId,
        paymentNo: 'PAY202412251234567890',
        status: PaymentStatus.SUCCESS,
        amount: 100.00,
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentStatus(paymentId);

      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({ where: { id: paymentId } });
      expect(result).toEqual(expect.objectContaining({
        paymentId: mockPayment.id,
        paymentNo: mockPayment.paymentNo,
        status: mockPayment.status,
        amount: mockPayment.amount,
      }));
    });

    it('should throw NotFoundException when payment not found', async () => {
      const paymentId = 'non-existent-payment';
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentStatus(paymentId)).rejects.toThrow(NotFoundException);
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({ where: { id: paymentId } });
    });
  });

  describe('getPaymentList', () => {
    it('should get payment list with filters and pagination', async () => {
      const queryDto = {
        userId: 'user-123',
        status: PaymentStatus.SUCCESS,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockPaymentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getPaymentList(queryDto);

      expect(mockPaymentRepository.createQueryBuilder).toHaveBeenCalledWith('payment');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('payment.userId = :userId', { userId: 'user-123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('payment.status = :status', { status: PaymentStatus.SUCCESS });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('payment.createdAt', 'DESC');

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('getPaymentStatistics', () => {
    it('should get payment statistics from database', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      const mockTotalStats = { totalCount: '100', totalAmount: '10000.00' };
      const mockSuccessStats = { successCount: '95', successAmount: '9500.00' };
      const mockRefundStats = { refundCount: '5', refundAmount: '500.00' };

      mockPaymentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce(mockTotalStats)
        .mockResolvedValueOnce(mockSuccessStats)
        .mockResolvedValueOnce(mockRefundStats);

      const result = await service.getPaymentStatistics();

      expect(result).toEqual({
        totalAmount: 10000.00,
        totalCount: 100,
        successAmount: 9500.00,
        successCount: 95,
        refundAmount: 500.00,
        refundCount: 5,
        successRate: 0.95,
      });
    });
  });

  describe('queryPayment', () => {
    it('should query payment by payment number', async () => {
      const paymentNo = 'PAY202412251234567890';
      const mockPayment = {
        id: 'payment-123',
        paymentNo,
        status: PaymentStatus.SUCCESS,
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.queryPayment(paymentNo);

      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({ where: { paymentNo } });
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      const paymentNo = 'non-existent-payment';
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.queryPayment(paymentNo)).rejects.toThrow(NotFoundException);
    });
  });
});