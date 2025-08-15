import { TarotSpread } from '../entities/tarot-spread.entity';

/**
 * 塔罗牌阵基础数据
 */
export const tarotSpreadsData: Partial<TarotSpread>[] = [
  {
    nameCn: '单张牌占卜',
    name: 'Single Card Reading',
    description: '最简单的占卜方式，适合日常指导和快速洞察。抽取一张牌来获得当下最需要的建议。',
    cardCount: 1,
    difficulty: 'beginner',
    scenarios: ['日常指导', '快速决策', '当下状态'],
    positionsConfig: [
      {
        position: 1,
        name: '指导牌',
        meaning: '当前最需要关注的方面或建议',
        x: 50,
        y: 50,
      },
    ],
    layoutImage: '/images/spreads/single-card.jpg',
    usageCount: 0,
    isActive: true,
    sortOrder: 1,
  },
  {
    nameCn: '过去现在未来',
    name: 'Past Present Future',
    description: '经典的三张牌占卜，揭示事情的发展脉络。了解过去的影响、现在的状况和未来的趋势。',
    cardCount: 3,
    difficulty: 'beginner',
    scenarios: ['人生规划', '关系发展', '事业发展'],
    positionsConfig: [
      {
        position: 1,
        name: '过去',
        meaning: '过去的经历和影响',
        x: 20,
        y: 50,
      },
      {
        position: 2,
        name: '现在',
        meaning: '当前的状况和挑战',
        x: 50,
        y: 50,
      },
      {
        position: 3,
        name: '未来',
        meaning: '未来的趋势和可能性',
        x: 80,
        y: 50,
      },
    ],
    layoutImage: '/images/spreads/past-present-future.jpg',
    usageCount: 0,
    isActive: true,
    sortOrder: 2,
  },
  {
    nameCn: '爱情十字',
    name: 'Love Cross',
    description: '专门用于爱情和关系问题的四张牌占卜。深入了解你和伴侣的内心世界以及关系的发展方向。',
    cardCount: 4,
    difficulty: 'intermediate',
    scenarios: ['爱情关系', '婚姻问题', '情感困惑'],
    positionsConfig: [
      {
        position: 1,
        name: '你的内心',
        meaning: '你对这段关系的真实感受',
        x: 50,
        y: 20,
      },
      {
        position: 2,
        name: '对方的内心',
        meaning: '对方对这段关系的感受',
        x: 50,
        y: 80,
      },
      {
        position: 3,
        name: '关系现状',
        meaning: '当前关系的状态和问题',
        x: 20,
        y: 50,
      },
      {
        position: 4,
        name: '关系前景',
        meaning: '关系的发展方向和建议',
        x: 80,
        y: 50,
      },
    ],
    layoutImage: '/images/spreads/love-cross.jpg',
    usageCount: 0,
    isActive: true,
    sortOrder: 3,
  },
];