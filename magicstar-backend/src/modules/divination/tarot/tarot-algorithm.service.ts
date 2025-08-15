import { Injectable } from '@nestjs/common'
import { TarotCard } from './entities/tarot-card.entity'
import { SpreadType } from './dto/create-divination.dto'

interface CardResult {
  id: number
  name: string
  nameEn: string
  suit: string
  number: number
  type: string
  keywords: string[]
  keywordsReversed: string[]
  imageUrl: string
  description: string
  position: string
  reversed: boolean
  meaning: string
}

interface InterpretationResult {
  summary: string
  overview: string
  detailed: string
  advice: string
  cardMeanings: Array<{
    cardName: string
    position: string
    meaning: string
    description: string
  }>
}

@Injectable()
export class TarotAlgorithmService {
  /**
   * 随机选择指定数量的卡片
   */
  selectRandomCards(allCards: TarotCard[], count: number): TarotCard[] {
    const shuffled = [...allCards].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  /**
   * 生成卡片结果（包含位置和正逆位）
   */
  generateCardResults(selectedCards: TarotCard[], positions: string[]): CardResult[] {
    return selectedCards.map((card, index) => {
      const reversed = Math.random() < 0.3 // 30% 概率为逆位
      const position = positions[index] || `位置${index + 1}`
      
      return {
        id: card.id,
        name: card.name,
        nameEn: card.nameEn,
        suit: card.suit,
        number: card.number,
        type: card.type,
        keywords: card.keywords,
        keywordsReversed: card.keywordsReversed,
        imageUrl: card.imageUrl,
        description: card.description,
        position,
        reversed,
        meaning: this.getCardMeaning(card, reversed)
      }
    })
  }

  /**
   * 生成占卜解读
   */
  async generateInterpretation(
    question: string,
    spreadType: SpreadType,
    cardResults: CardResult[]
  ): Promise<InterpretationResult> {
    const cardMeanings = cardResults.map(card => ({
      cardName: card.name,
      position: card.position,
      meaning: card.meaning,
      description: this.generateCardDescription(card, question)
    }))

    const overview = this.generateOverview(question, spreadType, cardResults)
    const detailed = this.generateDetailedInterpretation(question, spreadType, cardResults)
    const advice = this.generateAdvice(question, spreadType, cardResults)
    const summary = this.generateSummary(overview, advice)

    return {
      summary,
      overview,
      detailed,
      advice,
      cardMeanings
    }
  }

  /**
   * 获取卡片含义
   */
  private getCardMeaning(card: TarotCard, reversed: boolean): string {
    const keywords = reversed ? card.keywordsReversed : card.keywords
    return keywords.length > 0 ? keywords[0] : (reversed ? '阻碍' : '顺利')
  }

  /**
   * 生成卡片描述
   */
  private generateCardDescription(card: CardResult, question: string): string {
    const baseDescription = card.description || '这张牌代表着重要的人生课题。'
    const positionContext = this.getPositionContext(card.position)
    const reversedContext = card.reversed ? '但需要注意可能存在的阻碍或内在冲突。' : '这是一个积极的信号。'
    
    return `${card.name}在${card.position}位置${positionContext}。${baseDescription}${reversedContext}`
  }

  /**
   * 获取位置上下文
   */
  private getPositionContext(position: string): string {
    const positionMeanings: { [key: string]: string } = {
      '过去': '反映了过去的经历和影响',
      '现在': '显示当前的状况和挑战',
      '未来': '预示着未来的发展趋势',
      '潜意识': '揭示了内心深处的想法',
      '外在影响': '表明外部环境的作用',
      '建议': '给出了行动的指导方向',
      '结果': '预示着最终的结果',
      '自己': '代表你当前的状态',
      '环境': '反映周围的情况',
      '希望与恐惧': '显示内心的期望和担忧'
    }
    
    return positionMeanings[position] || '具有特殊的意义'
  }

  /**
   * 生成总览
   */
  private generateOverview(question: string, spreadType: SpreadType, cardResults: CardResult[]): string {
    const spreadContext = this.getSpreadContext(spreadType)
    const dominantTheme = this.analyzeDominantTheme(cardResults)
    
    return `关于"${question}"的占卜显示，${spreadContext}。从整体来看，${dominantTheme}。这次占卜为你提供了重要的指引和洞察。`
  }

  /**
   * 生成详细解读
   */
  private generateDetailedInterpretation(question: string, spreadType: SpreadType, cardResults: CardResult[]): string {
    let interpretation = ''
    
    switch (spreadType) {
      case SpreadType.SINGLE:
        interpretation = this.interpretSingleCard(cardResults[0], question)
        break
      case SpreadType.THREE:
        interpretation = this.interpretThreeCards(cardResults, question)
        break
      case SpreadType.CELTIC:
        interpretation = this.interpretCelticCross(cardResults, question)
        break
    }
    
    return interpretation
  }

  /**
   * 单牌解读
   */
  private interpretSingleCard(card: CardResult, question: string): string {
    const energy = card.reversed ? '需要谨慎对待' : '充满正面能量'
    return `${card.name}为你的问题提供了核心指引。这张牌${energy}，建议你${card.meaning}。在面对"${question}"时，要特别关注${card.keywords.join('、')}等方面。`
  }

  /**
   * 三牌解读
   */
  private interpretThreeCards(cardResults: CardResult[], question: string): string {
    const [past, present, future] = cardResults
    
    return `过去的${past.name}显示了${past.meaning}的影响，这为当前的情况奠定了基础。现在的${present.name}表明你正处在${present.meaning}的状态中，这是解决问题的关键时期。未来的${future.name}预示着${future.meaning}的发展，建议你保持积极的态度并采取适当的行动。`
  }

  /**
   * 凯尔特十字解读
   */
  private interpretCelticCross(cardResults: CardResult[], question: string): string {
    if (cardResults.length < 10) {
      return '凯尔特十字牌阵需要10张牌才能进行完整解读。'
    }
    
    const [current, challenge, past, future, crown, foundation, recent, approach, external, outcome] = cardResults
    
    return `当前状况由${current.name}主导，显示${current.meaning}。主要挑战来自${challenge.name}，需要面对${challenge.meaning}。过去的${past.name}和未来的${future.name}形成了时间线的脉络。建议采取${approach.name}所代表的${approach.meaning}方式来处理，最终结果${outcome.name}预示着${outcome.meaning}。`
  }

  /**
   * 生成建议
   */
  private generateAdvice(question: string, spreadType: SpreadType, cardResults: CardResult[]): string {
    const positiveCards = cardResults.filter(card => !card.reversed)
    const reversedCards = cardResults.filter(card => card.reversed)
    
    let advice = ''
    
    if (positiveCards.length > reversedCards.length) {
      advice = '整体运势较为顺利，建议你保持积极的心态，抓住机遇。'
    } else if (reversedCards.length > positiveCards.length) {
      advice = '当前可能面临一些挑战，建议你保持耐心，仔细思考后再行动。'
    } else {
      advice = '情况比较平衡，建议你权衡利弊，做出明智的选择。'
    }
    
    const keyActions = this.extractKeyActions(cardResults)
    advice += `具体来说，你可以关注${keyActions.join('、')}等方面。`
    
    return advice
  }

  /**
   * 生成总结
   */
  private generateSummary(overview: string, advice: string): string {
    return `${overview.split('。')[0]}。${advice.split('。')[0]}。记住，塔罗牌只是提供指引，最终的选择权在你手中。`
  }

  /**
   * 获取牌阵上下文
   */
  private getSpreadContext(spreadType: SpreadType): string {
    switch (spreadType) {
      case SpreadType.SINGLE:
        return '单牌占卜为你提供了直接而明确的指引'
      case SpreadType.THREE:
        return '三牌占卜展现了过去、现在、未来的完整脉络'
      case SpreadType.CELTIC:
        return '凯尔特十字牌阵揭示了问题的多个层面'
      default:
        return '这次占卜为你带来了深刻的洞察'
    }
  }

  /**
   * 分析主导主题
   */
  private analyzeDominantTheme(cardResults: CardResult[]): string {
    const suits = cardResults.map(card => card.suit)
    const suitCounts = suits.reduce((acc, suit) => {
      acc[suit] = (acc[suit] || 0) + 1
      return acc
    }, {} as { [key: string]: number })
    
    const dominantSuit = Object.keys(suitCounts).reduce((a, b) => 
      suitCounts[a] > suitCounts[b] ? a : b
    )
    
    const suitThemes: { [key: string]: string } = {
      '权杖': '行动力和创造力是关键',
      '圣杯': '情感和直觉占主导地位',
      '宝剑': '理性思考和沟通很重要',
      '星币': '物质和实际考量需要重视',
      '大阿卡纳': '这是一个重要的人生转折点'
    }
    
    return suitThemes[dominantSuit] || '各个方面都需要平衡发展'
  }

  /**
   * 提取关键行动
   */
  private extractKeyActions(cardResults: CardResult[]): string[] {
    const actions: string[] = []
    
    cardResults.forEach(card => {
      if (card.keywords.length > 0) {
        actions.push(card.keywords[0])
      }
    })
    
    return [...new Set(actions)].slice(0, 3) // 去重并取前3个
  }
}