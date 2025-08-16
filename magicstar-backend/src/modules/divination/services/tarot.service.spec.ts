import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TarotService } from './tarot.service';
import { TarotEngineService } from './tarot-engine.service';
import { TarotCard } from '../entities/tarot-card.entity';
import { TarotSpread } from '../entities/tarot-spread.entity';
import { TarotReading } from '../entities/tarot-reading.entity';
import { CreateTarotReadingDto } from '../dto/create-tarot-reading.dto';
import { QueryTarotCardsDto, QueryTarotSpreadsDto, QueryTarotReadingsDto } from '../dto/query-tarot.dto';

describe('TarotService', () => {
  let service: TarotService;
  let tarotCardRepository: Repository<TarotCard>;
  let tarotSpreadRepository: Repository<TarotSpread>;
  let tarotReadingRepository: Repository<TarotReading>;
  let tarotEngineService: TarotEngineService;

  // Mock数据
  const mockTarotCard: TarotCard = {
    id: 1,
    name: 'The Fool',
    nameCn: '愚者',
    type: 'major',
    number: 0,
    suit: undefined,
    uprightMeaning: '新的开始，冒险精神',
    reversedMeaning: '鲁莽，缺乏计划',
    uprightKeywords: '新开始,冒险,自由',
    reversedKeywords: '鲁莽,冲动,缺乏方向',
    description: '愚者代表新的开始和无限的可能性',
    imageUrl: '/images/tarot/fool.jpg',
    element: undefined,
    astrology: undefined,
    numerologyMeaning: '数字0代表无限的潜能',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTarotSpread: TarotSpread = {
    id: 1,
    name: 'Three Card Spread',
    nameCn: '三张牌牌阵',
    description: '过去、现在、未来的简单牌阵',
    cardCount: 3,
    difficulty: 'beginner',
    scenarios: ['general'],
    layoutImage: '/images/spreads/three-card.jpg',
    positionsConfig: [
      { position: 1, name: '过去', meaning: '影响当前情况的过去因素', x: 0, y: 0 },
      { position: 2, name: '现在', meaning: '当前的状况', x: 1, y: 0 },
      { position: 3, name: '未来', meaning: '可能的发展方向', x: 2, y: 0 }
    ],

    usageCount: 50,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTarotReading: TarotReading = {
    id: 1,
    userId: 1,
    spreadId: 1,
    question: '我的爱情运势如何？',
    drawnCards: [
      { position: 1, cardId: 1, isReversed: false, cardName: 'The Fool', cardNameCn: '愚者', meaning: '新的开始' },
      { position: 2, cardId: 2, isReversed: true, cardName: 'The Magician', cardNameCn: '魔术师', meaning: '创造力' },
      { position: 3, cardId: 3, isReversed: false, cardName: 'The High Priestess', cardNameCn: '女祭司', meaning: '直觉' }
    ],
    overallInterpretation: '整体解读内容',
    detailedInterpretation: [
      { position: 1, positionName: '过去', cardInterpretation: '过去的解读', advice: '过去的建议' },
      { position: 2, positionName: '现在', cardInterpretation: '现在的解读', advice: '现在的建议' },
      { position: 3, positionName: '未来', cardInterpretation: '未来的解读', advice: '未来的建议' }
    ],
    summary: '总结内容',
    advice: '整体建议',
    isPublic: false,
    shareCount: 0,
    rating: undefined,
    feedback: undefined,
    readingTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as any,
    spread: {} as any,
  };

  // Mock Repository
  const mockTarotCardRepository = {
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([mockTarotCard]),
    })),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockTarotSpreadRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([mockTarotSpread]),
    })),
    findOne: jest.fn(),
    find: jest.fn(),
    increment: jest.fn(),
  };

  const mockTarotReadingRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([mockTarotReading]),
      getOne: jest.fn().mockResolvedValue(mockTarotReading),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg: 4.5 }),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  // Mock TarotEngineService
  const mockTarotEngineService = {
    validateSpread: jest.fn(),
    drawCardsForSpread: jest.fn(),
    generateInterpretation: jest.fn(),
    getRecommendedSpreads: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TarotService,
        {
          provide: getRepositoryToken(TarotCard),
          useValue: mockTarotCardRepository,
        },
        {
          provide: getRepositoryToken(TarotSpread),
          useValue: mockTarotSpreadRepository,
        },
        {
          provide: getRepositoryToken(TarotReading),
          useValue: mockTarotReadingRepository,
        },
        {
          provide: TarotEngineService,
          useValue: mockTarotEngineService,
        },
      ],
    }).compile();

    service = module.get<TarotService>(TarotService);
    tarotCardRepository = module.get<Repository<TarotCard>>(getRepositoryToken(TarotCard));
    tarotSpreadRepository = module.get<Repository<TarotSpread>>(getRepositoryToken(TarotSpread));
    tarotReadingRepository = module.get<Repository<TarotReading>>(getRepositoryToken(TarotReading));
    tarotEngineService = module.get<TarotEngineService>(TarotEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllCards', () => {
    it('should return paginated tarot cards', async () => {
      const queryDto: QueryTarotCardsDto = {
        page: 1,
        limit: 20,
      };

      const result = await service.getAllCards(queryDto);

      expect(result).toEqual({
        cards: [mockTarotCard],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockTarotCardRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter cards by type', async () => {
      const queryDto: QueryTarotCardsDto = {
        type: 'major',
        page: 1,
        limit: 20,
      };

      await service.getAllCards(queryDto);

      const queryBuilder = mockTarotCardRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('card.type = :type', { type: 'major' });
    });

    it('should filter cards by keyword', async () => {
      const queryDto: QueryTarotCardsDto = {
        keyword: '愚者',
        page: 1,
        limit: 20,
      };

      await service.getAllCards(queryDto);

      const queryBuilder = mockTarotCardRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(card.nameCn LIKE :keyword OR card.name LIKE :keyword OR card.description LIKE :keyword)',
        { keyword: '%愚者%' }
      );
    });
  });

  describe('getCardById', () => {
    it('should return a tarot card by id', async () => {
      mockTarotCardRepository.findOne.mockResolvedValue(mockTarotCard);

      const result = await service.getCardById(1);

      expect(result).toEqual(mockTarotCard);
      expect(mockTarotCardRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when card not found', async () => {
      mockTarotCardRepository.findOne.mockResolvedValue(null);

      await expect(service.getCardById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllSpreads', () => {
    it('should return paginated tarot spreads', async () => {
      const queryDto: QueryTarotSpreadsDto = {
        page: 1,
        limit: 10,
      };

      const result = await service.getAllSpreads(queryDto);

      expect(result).toEqual({
        spreads: [mockTarotSpread],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockTarotSpreadRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter spreads by difficulty', async () => {
      const queryDto: QueryTarotSpreadsDto = {
        difficulty: 'beginner',
        page: 1,
        limit: 10,
      };

      await service.getAllSpreads(queryDto);

      const queryBuilder = mockTarotSpreadRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('spread.difficulty = :difficulty', { difficulty: 'beginner' });
    });
  });

  describe('getSpreadById', () => {
    it('should return a tarot spread by id', async () => {
      mockTarotSpreadRepository.findOne.mockResolvedValue(mockTarotSpread);

      const result = await service.getSpreadById(1);

      expect(result).toEqual(mockTarotSpread);
      expect(mockTarotSpreadRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when spread not found', async () => {
      mockTarotSpreadRepository.findOne.mockResolvedValue(null);

      await expect(service.getSpreadById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('performReading', () => {
    const createDto: CreateTarotReadingDto = {
      spreadId: 1,
      question: '我的爱情运势如何？',
    };

    const mockDrawnCards = [
      {
        position: 1,
        cardId: 1,
        isReversed: false,
        card: mockTarotCard,
      },
    ];

    const mockInterpretation = {
      overallInterpretation: '整体解读',
      detailedInterpretation: [
        {
          position: 1,
          positionName: '过去',
          cardInterpretation: '卡牌解读',
          advice: '建议',
        },
      ],
      summary: '总结',
      advice: '建议',
    };

    beforeEach(() => {
      mockTarotEngineService.validateSpread.mockResolvedValue(true);
      mockTarotEngineService.drawCardsForSpread.mockResolvedValue({
        spread: mockTarotSpread,
        drawnCards: mockDrawnCards,
      });
      mockTarotEngineService.generateInterpretation.mockReturnValue(mockInterpretation);
      mockTarotReadingRepository.create.mockReturnValue(mockTarotReading);
      mockTarotReadingRepository.save.mockResolvedValue(mockTarotReading);
    });

    it('should perform a tarot reading successfully', async () => {
      const result = await service.performReading(1, createDto);

      expect(mockTarotEngineService.validateSpread).toHaveBeenCalledWith(1);
      expect(mockTarotEngineService.drawCardsForSpread).toHaveBeenCalledWith(1);
      expect(mockTarotEngineService.generateInterpretation).toHaveBeenCalledWith(
        mockDrawnCards,
        mockTarotSpread,
        createDto.question
      );
      expect(mockTarotReadingRepository.save).toHaveBeenCalled();
      expect(mockTarotSpreadRepository.increment).toHaveBeenCalledWith(
        { id: 1 },
        'usageCount',
        1
      );
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('spread');
      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('drawnCards');
    });

    it('should throw BadRequestException for invalid spread', async () => {
      mockTarotEngineService.validateSpread.mockResolvedValue(false);

      await expect(service.performReading(1, createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserReadings', () => {
    it('should return user readings with pagination', async () => {
      const queryDto: QueryTarotReadingsDto = {
        page: 1,
        limit: 10,
      };

      const result = await service.getUserReadings(1, queryDto);

      expect(result).toEqual({
        readings: [mockTarotReading],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockTarotReadingRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter readings by spread id', async () => {
      const queryDto: QueryTarotReadingsDto = {
        spreadId: 1,
        page: 1,
        limit: 10,
      };

      await service.getUserReadings(1, queryDto);

      const queryBuilder = mockTarotReadingRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('reading.spreadId = :spreadId', { spreadId: 1 });
    });
  });

  describe('getReadingById', () => {
    it('should return a reading by id', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockTarotReading]),
        getOne: jest.fn().mockResolvedValue(mockTarotReading),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: 4.5 }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockTarotReadingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getReadingById(1, 1);

      expect(result).toEqual(mockTarotReading);
    });

    it('should throw NotFoundException when reading not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockTarotReading]),
        getOne: jest.fn().mockResolvedValue(null),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: 4.5 }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockTarotReadingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.getReadingById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('shareReading', () => {
    it('should share a reading successfully', async () => {
      mockTarotReadingRepository.findOne.mockResolvedValue(mockTarotReading);
      mockTarotReadingRepository.update.mockResolvedValue({ affected: 1 });

      await service.shareReading(1, 1);

      expect(mockTarotReadingRepository.update).toHaveBeenCalledWith(
        1,
        {
          isPublic: true,
          shareCount: expect.any(Function),
        }
      );
    });

    it('should throw NotFoundException when reading not found', async () => {
      mockTarotReadingRepository.findOne.mockResolvedValue(null);

      await expect(service.shareReading(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rateReading', () => {
    it('should rate a reading successfully', async () => {
      mockTarotReadingRepository.findOne.mockResolvedValue(mockTarotReading);
      mockTarotReadingRepository.update.mockResolvedValue({ affected: 1 });

      await service.rateReading(1, 1, 5, '很准确');

      expect(mockTarotReadingRepository.update).toHaveBeenCalledWith(
        1,
        {
          rating: 5,
          feedback: '很准确',
        }
      );
    });

    it('should throw NotFoundException when reading not found', async () => {
      mockTarotReadingRepository.findOne.mockResolvedValue(null);

      await expect(service.rateReading(999, 1, 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRecommendedSpreads', () => {
    it('should return recommended spreads', async () => {
      mockTarotEngineService.getRecommendedSpreads.mockResolvedValue([mockTarotSpread]);

      const result = await service.getRecommendedSpreads();

      expect(result).toEqual([mockTarotSpread]);
      expect(mockTarotEngineService.getRecommendedSpreads).toHaveBeenCalledWith(undefined);
    });

    it('should filter by difficulty when provided', async () => {
      mockTarotEngineService.getRecommendedSpreads.mockResolvedValue([mockTarotSpread]);

      await service.getRecommendedSpreads('beginner');

      expect(mockTarotEngineService.getRecommendedSpreads).toHaveBeenCalledWith('beginner');
    });
  });

  describe('getReadingStats', () => {
    it('should return reading statistics', async () => {
      // Mock count method
      mockTarotReadingRepository.count.mockResolvedValue(10);
      
      // Mock the complex query builder for stats
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
        getMany: jest.fn().mockResolvedValue([mockTarotReading]),
        getOne: jest.fn().mockResolvedValue(mockTarotReading),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ spreadId: 1, count: 5 }),
        getRawMany: jest.fn().mockResolvedValue([{ avg: 4.5 }]),
      };

      mockTarotReadingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTarotSpreadRepository.findOne.mockResolvedValue(mockTarotSpread);

      const result = await service.getReadingStats(1);

      expect(result).toHaveProperty('totalReadings');
      expect(result).toHaveProperty('thisMonthReadings');
      expect(result).toHaveProperty('favoriteSpread');
      expect(result).toHaveProperty('averageRating');
    });
  });
});