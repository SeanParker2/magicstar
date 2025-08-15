import { DataSource } from 'typeorm';
import { TarotCard } from '../entities/tarot-card.entity';
import { TarotSpread } from '../entities/tarot-spread.entity';
import { tarotCardsData } from './tarot-cards.seed';
import { tarotSpreadsData } from './tarot-spreads.seed';

/**
 * 初始化塔罗牌基础数据
 */
export class DivinationSeeder {
  constructor(private dataSource: DataSource) {}

  /**
   * 执行数据种子
   */
  async run(): Promise<void> {
    await this.seedTarotCards();
    await this.seedTarotSpreads();
    console.log('塔罗牌基础数据初始化完成');
  }

  /**
   * 初始化塔罗牌数据
   */
  private async seedTarotCards(): Promise<void> {
    const tarotCardRepository = this.dataSource.getRepository(TarotCard);
    
    // 检查是否已有数据
    const existingCount = await tarotCardRepository.count();
    if (existingCount > 0) {
      console.log('塔罗牌数据已存在，跳过初始化');
      return;
    }

    // 批量插入塔罗牌数据
    const tarotCards = tarotCardRepository.create(tarotCardsData);
    await tarotCardRepository.save(tarotCards);
    console.log(`成功初始化 ${tarotCards.length} 张塔罗牌数据`);
  }

  /**
   * 初始化塔罗牌阵数据
   */
  private async seedTarotSpreads(): Promise<void> {
    const tarotSpreadRepository = this.dataSource.getRepository(TarotSpread);
    
    // 检查是否已有数据
    const existingCount = await tarotSpreadRepository.count();
    if (existingCount > 0) {
      console.log('塔罗牌阵数据已存在，跳过初始化');
      return;
    }

    // 批量插入牌阵数据
    const tarotSpreads = tarotSpreadRepository.create(tarotSpreadsData);
    await tarotSpreadRepository.save(tarotSpreads);
    console.log(`成功初始化 ${tarotSpreads.length} 个塔罗牌阵数据`);
  }
}

/**
 * 导出种子数据执行函数
 */
export async function runDivinationSeeds(dataSource: DataSource): Promise<void> {
  const seeder = new DivinationSeeder(dataSource);
  await seeder.run();
}