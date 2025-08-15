import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FortuneTemplate, FortuneType, ZodiacSign, ChineseZodiac } from './entities/fortune-template.entity';

@Injectable()
export class FortuneSeedService {
  constructor(
    @InjectRepository(FortuneTemplate)
    private fortuneTemplateRepository: Repository<FortuneTemplate>,
  ) {}

  /**
   * 初始化运势模板数据
   */
  async seedFortuneTemplates(): Promise<void> {
    const existingCount = await this.fortuneTemplateRepository.count();
    if (existingCount > 0) {
      console.log('Fortune templates already exist, skipping seed.');
      return;
    }

    const templates: Partial<FortuneTemplate>[] = [
      // 每日运势模板 - 星座
      {
        type: FortuneType.DAILY,
        zodiacSign: ZodiacSign.ARIES,
        content: '今天的你充满活力和冒险精神，适合开始新的项目或挑战。',
        scores: { love: 4, career: 5, wealth: 3, health: 4, overall: 4 },
        keywords: '活力,冒险,新开始',
        advice: '把握机会，勇敢迈出第一步。',
        luckyColor: '#FF6B6B',
        luckyNumber: 3,
        luckyDirection: '东方',
        weight: 80,
      },
      {
        type: FortuneType.DAILY,
        zodiacSign: ZodiacSign.TAURUS,
        content: '稳重的你今天适合处理财务相关事务，投资理财会有不错的收获。',
        scores: { love: 3, career: 4, wealth: 5, health: 4, overall: 4 },
        keywords: '稳重,财务,收获',
        advice: '保持耐心，稳扎稳打地前进。',
        luckyColor: '#4ECDC4',
        luckyNumber: 6,
        luckyDirection: '南方',
        weight: 80,
      },
      {
        type: FortuneType.DAILY,
        zodiacSign: ZodiacSign.GEMINI,
        content: '沟通能力出众的你今天特别适合社交和学习新知识。',
        scores: { love: 4, career: 4, wealth: 3, health: 3, overall: 4 },
        keywords: '沟通,社交,学习',
        advice: '多与他人交流，会有意想不到的收获。',
        luckyColor: '#FFE66D',
        luckyNumber: 5,
        luckyDirection: '西方',
        weight: 80,
      },
      
      // 每周运势模板 - 生肖
      {
        type: FortuneType.WEEKLY,
        chineseZodiac: ChineseZodiac.RAT,
        content: '本周机智的你能够敏锐地发现商机，适合进行投资或创业规划。',
        scores: { love: 3, career: 5, wealth: 4, health: 3, overall: 4 },
        keywords: '机智,商机,规划',
        advice: '相信自己的直觉，但也要做好风险评估。',
        luckyColor: '#A8E6CF',
        luckyNumber: 1,
        luckyDirection: '北方',
        weight: 70,
      },
      {
        type: FortuneType.WEEKLY,
        chineseZodiac: ChineseZodiac.OX,
        content: '勤劳踏实的你本周在工作上会有重大突破，坚持就是胜利。',
        scores: { love: 3, career: 5, wealth: 4, health: 4, overall: 4 },
        keywords: '勤劳,突破,坚持',
        advice: '保持专注，不要被外界干扰影响节奏。',
        luckyColor: '#FFB3BA',
        luckyNumber: 2,
        luckyDirection: '东北方',
        weight: 70,
      },
      
      // 每月运势模板 - 通用
      {
        type: FortuneType.MONTHLY,
        content: '本月是个人成长的重要时期，适合制定长远计划并付诸实践。',
        scores: { love: 4, career: 4, wealth: 4, health: 4, overall: 4 },
        keywords: '成长,计划,实践',
        advice: '保持平衡的心态，稳步向前发展。',
        luckyColor: '#BFEFFF',
        luckyNumber: 8,
        luckyDirection: '中央',
        weight: 60,
      },
      {
        type: FortuneType.MONTHLY,
        content: '人际关系是本月的重点，多参与社交活动会带来意外惊喜。',
        scores: { love: 5, career: 3, wealth: 3, health: 4, overall: 4 },
        keywords: '人际,社交,惊喜',
        advice: '主动出击，扩大社交圈子。',
        luckyColor: '#DDA0DD',
        luckyNumber: 9,
        luckyDirection: '西南方',
        weight: 60,
      },
      
      // 更多星座每日运势模板
      {
        type: FortuneType.DAILY,
        zodiacSign: ZodiacSign.CANCER,
        content: '情感丰富的你今天特别适合处理家庭事务和情感关系。',
        scores: { love: 5, career: 3, wealth: 3, health: 4, overall: 4 },
        keywords: '情感,家庭,关系',
        advice: '倾听内心的声音，关爱身边的人。',
        luckyColor: '#87CEEB',
        luckyNumber: 4,
        luckyDirection: '西北方',
        weight: 80,
      },
      {
        type: FortuneType.DAILY,
        zodiacSign: ZodiacSign.LEO,
        content: '自信的你今天是众人瞩目的焦点，适合展示才华和领导能力。',
        scores: { love: 4, career: 5, wealth: 4, health: 4, overall: 4 },
        keywords: '自信,焦点,领导',
        advice: '发挥你的魅力，但也要保持谦逊。',
        luckyColor: '#FFD700',
        luckyNumber: 7,
        luckyDirection: '南方',
        weight: 80,
      },
    ];

    for (const template of templates) {
      const fortuneTemplate = this.fortuneTemplateRepository.create(template);
      await this.fortuneTemplateRepository.save(fortuneTemplate);
    }

    console.log(`Successfully seeded ${templates.length} fortune templates.`);
  }

  /**
   * 清空并重新初始化运势模板数据
   */
  async resetFortuneTemplates(): Promise<void> {
    await this.fortuneTemplateRepository.clear();
    await this.seedFortuneTemplates();
  }
}