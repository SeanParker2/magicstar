import { Injectable, Logger } from '@nestjs/common';
import { BirthChartRequest } from './astrology-api.service';

export interface PlanetData {
  name: string;
  sign: string;
  degree: number;
  house: number;
  retrograde: boolean;
  symbol?: string;
}

export interface HouseData {
  number: number;
  sign: string;
  degree: number;
  size?: number;
}

export interface AspectData {
  planet1: string;
  planet2: string;
  type: string;
  angle: number;
  orb: number;
  quality?: 'harmonious' | 'challenging' | 'neutral';
}

export interface ChartInterpretationData {
  type: string;
  title: string;
  content: string;
  keywords: string[];
  importance: number;
}

@Injectable()
export class AstrologyAlgorithmService {
  private readonly logger = new Logger(AstrologyAlgorithmService.name);

  // 星座名称映射
  private readonly signNames = {
    'Aries': '白羊座',
    'Taurus': '金牛座',
    'Gemini': '双子座',
    'Cancer': '巨蟹座',
    'Leo': '狮子座',
    'Virgo': '处女座',
    'Libra': '天秤座',
    'Scorpio': '天蝎座',
    'Sagittarius': '射手座',
    'Capricorn': '摩羯座',
    'Aquarius': '水瓶座',
    'Pisces': '双鱼座',
  };

  // 行星名称映射
  private readonly planetNames = {
    'Sun': '太阳',
    'Moon': '月亮',
    'Mercury': '水星',
    'Venus': '金星',
    'Mars': '火星',
    'Jupiter': '木星',
    'Saturn': '土星',
    'Uranus': '天王星',
    'Neptune': '海王星',
    'Pluto': '冥王星',
  };

  // 相位类型映射
  private readonly aspectTypes = {
    'conjunction': { name: '合相', angle: 0, orb: 8, quality: 'neutral' },
    'sextile': { name: '六分相', angle: 60, orb: 6, quality: 'harmonious' },
    'square': { name: '四分相', angle: 90, orb: 8, quality: 'challenging' },
    'trine': { name: '三分相', angle: 120, orb: 8, quality: 'harmonious' },
    'opposition': { name: '对分相', angle: 180, orb: 8, quality: 'challenging' },
  };

  /**
   * 处理行星数据
   */
  processPlanetData(rawPlanets: any[]): PlanetData[] {
    return rawPlanets.map(planet => ({
      name: this.planetNames[planet.name] || planet.name,
      sign: this.signNames[planet.sign] || planet.sign,
      degree: this.roundDegree(planet.degree),
      house: planet.house,
      retrograde: planet.retrograde || false,
      symbol: this.getPlanetSymbol(planet.name),
    }));
  }

  /**
   * 处理宫位数据
   */
  processHouseData(rawHouses: any[]): HouseData[] {
    return rawHouses.map(house => ({
      number: house.number,
      sign: this.signNames[house.sign] || house.sign,
      degree: this.roundDegree(house.degree),
      size: this.calculateHouseSize(house, rawHouses),
    }));
  }

  /**
   * 处理相位数据
   */
  processAspectData(rawAspects: any[]): AspectData[] {
    return rawAspects
      .map(aspect => {
        const aspectInfo = this.aspectTypes[aspect.type];
        if (!aspectInfo) return null;

        return {
          planet1: this.planetNames[aspect.planet1] || aspect.planet1,
          planet2: this.planetNames[aspect.planet2] || aspect.planet2,
          type: aspectInfo.name,
          angle: aspect.angle,
          orb: this.roundDegree(aspect.orb),
          quality: aspectInfo.quality as 'harmonious' | 'challenging' | 'neutral',
        } as AspectData;
      })
      .filter((aspect): aspect is AspectData => aspect !== null);
  }

  /**
   * 生成星盘解读
   */
  generateChartInterpretations(planets: PlanetData[], houses: HouseData[], aspects: AspectData[]): ChartInterpretationData[] {
    const interpretations: ChartInterpretationData[] = [];

    // 太阳星座解读
    const sun = planets.find(p => p.name === '太阳');
    if (sun) {
      interpretations.push({
        type: '性格',
        title: `太阳在${sun.sign}`,
        content: this.getSunSignInterpretation(sun.sign),
        keywords: this.getSunSignKeywords(sun.sign),
        importance: 10,
      });
    }

    // 月亮星座解读
    const moon = planets.find(p => p.name === '月亮');
    if (moon) {
      interpretations.push({
        type: '情感',
        title: `月亮在${moon.sign}`,
        content: this.getMoonSignInterpretation(moon.sign),
        keywords: this.getMoonSignKeywords(moon.sign),
        importance: 9,
      });
    }

    // 上升星座解读（第一宫宫头）
    const firstHouse = houses.find(h => h.number === 1);
    if (firstHouse) {
      interpretations.push({
        type: '外在表现',
        title: `上升星座在${firstHouse.sign}`,
        content: this.getAscendantInterpretation(firstHouse.sign),
        keywords: this.getAscendantKeywords(firstHouse.sign),
        importance: 8,
      });
    }

    // 主要相位解读
    const majorAspects = aspects.filter(a => ['合相', '对分相', '三分相', '四分相'].includes(a.type));
    majorAspects.forEach(aspect => {
      interpretations.push({
        type: '相位',
        title: `${aspect.planet1}${aspect.type}${aspect.planet2}`,
        content: this.getAspectInterpretation(aspect),
        keywords: this.getAspectKeywords(aspect),
        importance: this.calculateAspectImportance(aspect),
      });
    });

    return interpretations.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 计算星盘兼容性
   */
  calculateCompatibility(chart1Planets: PlanetData[], chart2Planets: PlanetData[]): number {
    let totalScore = 0;
    let aspectCount = 0;

    // 比较主要行星之间的相位
    const majorPlanets = ['太阳', '月亮', '水星', '金星', '火星'];
    
    for (const planet1 of chart1Planets.filter(p => majorPlanets.includes(p.name))) {
      for (const planet2 of chart2Planets.filter(p => majorPlanets.includes(p.name))) {
        const aspect = this.calculateAspectBetweenPlanets(planet1, planet2);
        if (aspect) {
          const score = this.getCompatibilityScore(aspect, planet1.name, planet2.name);
          totalScore += score;
          aspectCount++;
        }
      }
    }

    return aspectCount > 0 ? Math.round((totalScore / aspectCount) * 100) / 100 : 0;
  }

  /**
   * 获取行星符号
   */
  private getPlanetSymbol(planetName: string): string {
    const symbols = {
      'Sun': '☉',
      'Moon': '☽',
      'Mercury': '☿',
      'Venus': '♀',
      'Mars': '♂',
      'Jupiter': '♃',
      'Saturn': '♄',
      'Uranus': '♅',
      'Neptune': '♆',
      'Pluto': '♇',
    };
    return symbols[planetName] || '';
  }

  /**
   * 四舍五入度数
   */
  private roundDegree(degree: number): number {
    return Math.round(degree * 100) / 100;
  }

  /**
   * 计算宫位大小
   */
  private calculateHouseSize(house: any, allHouses: any[]): number {
    const currentIndex = allHouses.findIndex(h => h.number === house.number);
    const nextIndex = (currentIndex + 1) % allHouses.length;
    const nextHouse = allHouses[nextIndex];
    
    let size = nextHouse.degree - house.degree;
    if (size <= 0) size += 360;
    
    return this.roundDegree(size);
  }

  /**
   * 获取太阳星座解读
   */
  private getSunSignInterpretation(sign: string): string {
    const interpretations = {
      '白羊座': '你是一个充满活力和冒险精神的人，喜欢开创新事物，具有强烈的领导欲望。',
      '金牛座': '你是一个稳重踏实的人，重视安全感和物质享受，具有坚韧不拔的毅力。',
      '双子座': '你是一个聪明机智的人，好奇心强，善于沟通，喜欢学习新知识。',
      '巨蟹座': '你是一个感情丰富的人，重视家庭和情感安全，具有强烈的保护欲。',
      '狮子座': '你是一个自信大方的人，喜欢成为焦点，具有强烈的创造力和表现欲。',
      '处女座': '你是一个细致认真的人，追求完美，善于分析和解决问题。',
      '天秤座': '你是一个优雅和谐的人，重视平衡和美感，善于协调人际关系。',
      '天蝎座': '你是一个深沉神秘的人，感情强烈，具有强大的洞察力和意志力。',
      '射手座': '你是一个乐观开朗的人，热爱自由和冒险，具有哲学思维。',
      '摩羯座': '你是一个务实进取的人，有强烈的责任感和事业心，追求成就。',
      '水瓶座': '你是一个独立创新的人，思想前卫，重视友谊和人道主义。',
      '双鱼座': '你是一个敏感浪漫的人，富有想象力和同情心，具有艺术天赋。',
    };
    return interpretations[sign] || '暂无解读';
  }

  /**
   * 获取太阳星座关键词
   */
  private getSunSignKeywords(sign: string): string[] {
    const keywords = {
      '白羊座': ['勇敢', '冲动', '领导力', '开创性'],
      '金牛座': ['稳定', '固执', '实用', '享受'],
      '双子座': ['聪明', '多变', '沟通', '好奇'],
      '巨蟹座': ['敏感', '保护', '家庭', '情感'],
      '狮子座': ['自信', '创造', '表演', '慷慨'],
      '处女座': ['完美', '分析', '服务', '细致'],
      '天秤座': ['平衡', '和谐', '美感', '合作'],
      '天蝎座': ['深刻', '神秘', '转化', '强烈'],
      '射手座': ['自由', '哲学', '冒险', '乐观'],
      '摩羯座': ['责任', '成就', '实际', '耐心'],
      '水瓶座': ['独立', '创新', '友谊', '人道'],
      '双鱼座': ['想象', '同情', '艺术', '直觉'],
    };
    return keywords[sign] || [];
  }

  /**
   * 获取月亮星座解读
   */
  private getMoonSignInterpretation(sign: string): string {
    const interpretations = {
      '白羊座': '你的情感表达直接而强烈，需要刺激和挑战来满足内心需求。',
      '金牛座': '你需要稳定和安全感，通过物质享受和感官体验来获得情感满足。',
      '双子座': '你的情感多变，需要智力刺激和多样化的体验来保持内心平衡。',
      '巨蟹座': '你的情感深刻而敏感，家庭和亲密关系是你情感安全的来源。',
      '狮子座': '你需要被欣赏和认可，通过创造和表现来表达内心情感。',
      '处女座': '你通过服务他人和追求完美来获得情感满足，注重细节和实用性。',
      '天秤座': '你需要和谐的环境和关系，通过美感和平衡来维持情感稳定。',
      '天蝎座': '你的情感强烈而深刻，需要深度的情感连接和转化体验。',
      '射手座': '你需要自由和探索，通过学习和冒险来满足内心的情感需求。',
      '摩羯座': '你通过成就和责任来获得情感安全，重视传统和结构。',
      '水瓶座': '你需要独立和创新，通过友谊和理想来表达情感。',
      '双鱼座': '你的情感敏感而富有同情心，需要精神连接和艺术表达。',
    };
    return interpretations[sign] || '暂无解读';
  }

  /**
   * 获取月亮星座关键词
   */
  private getMoonSignKeywords(sign: string): string[] {
    const keywords = {
      '白羊座': ['冲动情感', '直接表达', '需要刺激', '情感勇气'],
      '金牛座': ['情感稳定', '安全需求', '感官享受', '固执情感'],
      '双子座': ['情感多变', '智力需求', '沟通表达', '好奇心理'],
      '巨蟹座': ['深度情感', '家庭依恋', '保护本能', '情感记忆'],
      '狮子座': ['情感表演', '需要赞美', '创造表达', '慷慨情感'],
      '处女座': ['情感分析', '服务他人', '完美追求', '实用情感'],
      '天秤座': ['情感平衡', '和谐需求', '美感追求', '关系导向'],
      '天蝎座': ['情感强度', '深度连接', '转化需求', '神秘情感'],
      '射手座': ['情感自由', '探索需求', '哲学情感', '乐观心态'],
      '摩羯座': ['情感责任', '成就需求', '传统情感', '结构化'],
      '水瓶座': ['情感独立', '友谊重视', '创新情感', '人道关怀'],
      '双鱼座': ['情感敏感', '同情心理', '艺术情感', '直觉感受'],
    };
    return keywords[sign] || [];
  }

  /**
   * 获取上升星座解读
   */
  private getAscendantInterpretation(sign: string): string {
    const interpretations = {
      '白羊座': '你给人的第一印象是充满活力和自信，行动迅速，具有领导气质。',
      '金牛座': '你给人的印象是稳重可靠，温和友善，具有自然的魅力。',
      '双子座': '你给人的印象是聪明机智，善于交流，充满好奇心和活力。',
      '巨蟹座': '你给人的印象是温柔体贴，具有保护性，情感丰富。',
      '狮子座': '你给人的印象是自信大方，具有王者风范，充满魅力和创造力。',
      '处女座': '你给人的印象是细致认真，有条理，注重细节和实用性。',
      '天秤座': '你给人的印象是优雅迷人，具有良好的审美和社交能力。',
      '天蝎座': '你给人的印象是神秘深刻，具有强烈的磁性和洞察力。',
      '射手座': '你给人的印象是乐观开朗，热爱自由，具有冒险精神。',
      '摩羯座': '你给人的印象是成熟稳重，有责任感，具有权威性。',
      '水瓶座': '你给人的印象是独特创新，思想前卫，具有人道主义精神。',
      '双鱼座': '你给人的印象是温柔梦幻，富有同情心，具有艺术气质。',
    };
    return interpretations[sign] || '暂无解读';
  }

  /**
   * 获取上升星座关键词
   */
  private getAscendantKeywords(sign: string): string[] {
    const keywords = {
      '白羊座': ['活力外表', '自信形象', '领导气质', '行动力'],
      '金牛座': ['稳重外表', '可靠形象', '自然魅力', '温和气质'],
      '双子座': ['机智外表', '沟通能力', '好奇形象', '灵活气质'],
      '巨蟹座': ['温柔外表', '保护形象', '情感气质', '亲和力'],
      '狮子座': ['自信外表', '王者形象', '魅力气质', '表演力'],
      '处女座': ['细致外表', '有序形象', '实用气质', '分析力'],
      '天秤座': ['优雅外表', '和谐形象', '美感气质', '社交力'],
      '天蝎座': ['神秘外表', '深刻形象', '磁性气质', '洞察力'],
      '射手座': ['乐观外表', '自由形象', '冒险气质', '哲学性'],
      '摩羯座': ['成熟外表', '权威形象', '责任气质', '实际性'],
      '水瓶座': ['独特外表', '创新形象', '前卫气质', '人道性'],
      '双鱼座': ['梦幻外表', '艺术形象', '同情气质', '直觉性'],
    };
    return keywords[sign] || [];
  }

  /**
   * 获取相位解读
   */
  private getAspectInterpretation(aspect: AspectData): string {
    const key = `${aspect.planet1}-${aspect.planet2}-${aspect.type}`;
    // 这里可以根据具体的行星相位组合提供更详细的解读
    return `${aspect.planet1}与${aspect.planet2}形成${aspect.type}，这个相位带来了特殊的能量互动。`;
  }

  /**
   * 获取相位关键词
   */
  private getAspectKeywords(aspect: AspectData): string[] {
    const baseKeywords = {
      '合相': ['融合', '强化', '统一'],
      '对分相': ['对立', '平衡', '张力'],
      '三分相': ['和谐', '流动', '天赋'],
      '四分相': ['挑战', '动力', '成长'],
      '六分相': ['机会', '合作', '发展'],
    };
    return baseKeywords[aspect.type] || [];
  }

  /**
   * 计算相位重要程度
   */
  private calculateAspectImportance(aspect: AspectData): number {
    const planetWeights = {
      '太阳': 10, '月亮': 9, '水星': 7, '金星': 7, '火星': 7,
      '木星': 6, '土星': 6, '天王星': 4, '海王星': 4, '冥王星': 4,
    };
    
    const aspectWeights = {
      '合相': 10, '对分相': 9, '三分相': 8, '四分相': 8, '六分相': 6,
    };
    
    const planet1Weight = planetWeights[aspect.planet1] || 1;
    const planet2Weight = planetWeights[aspect.planet2] || 1;
    const aspectWeight = aspectWeights[aspect.type] || 1;
    
    return Math.round(((planet1Weight + planet2Weight) / 2) * (aspectWeight / 10));
  }

  /**
   * 计算两个行星之间的相位
   */
  private calculateAspectBetweenPlanets(planet1: PlanetData, planet2: PlanetData): AspectData | null {
    const angle = Math.abs(planet1.degree - planet2.degree);
    const normalizedAngle = angle > 180 ? 360 - angle : angle;
    
    for (const aspectType of Object.keys(this.aspectTypes)) {
      const aspectInfo = this.aspectTypes[aspectType];
      if (!aspectInfo) continue;
      
      const orb = Math.abs(normalizedAngle - aspectInfo.angle);
      if (orb <= aspectInfo.orb) {
        return {
          planet1: planet1.name,
          planet2: planet2.name,
          type: aspectInfo.name,
          angle: normalizedAngle,
          orb: this.roundDegree(orb),
          quality: aspectInfo.quality as 'harmonious' | 'challenging' | 'neutral',
        };
      }
    }
    
    return null;
  }

  /**
   * 获取兼容性分数
   */
  private getCompatibilityScore(aspect: AspectData, planet1: string, planet2: string): number {
    const baseScores = {
      'harmonious': 2,
      'neutral': 1,
      'challenging': -1,
    };
    
    const planetImportance = {
      '太阳': 1.5, '月亮': 1.4, '金星': 1.3, '火星': 1.2, '水星': 1.1,
    };
    
    const baseScore = baseScores[aspect.quality || 'neutral'] || 0;
    const importance1 = planetImportance[planet1] || 1;
    const importance2 = planetImportance[planet2] || 1;
    
    return baseScore * ((importance1 + importance2) / 2);
  }
}