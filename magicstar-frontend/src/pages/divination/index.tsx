import { Component, PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import { AtGrid, AtCard } from 'taro-ui'
import Taro from '@tarojs/taro'

import "taro-ui/dist/style/components/grid.scss"
import "taro-ui/dist/style/components/card.scss"
import './index.scss'

interface DivinationState {
  divinationTypes: Array<{
    image: string
    value: string
    text: string
    description: string
  }>
}

export default class Divination extends Component<PropsWithChildren, DivinationState> {
  constructor(props) {
    super(props)
    this.state = {
      divinationTypes: [
        {
          image: '🔮',
          value: 'tarot',
          text: '塔罗占卜',
          description: '通过塔罗牌探索内心世界'
        },
        {
          image: '⭐',
          value: 'astrology',
          text: '星盘占卜',
          description: '根据星座运势指引人生'
        },
        {
          image: '🎯',
          value: 'fortune',
          text: '运势预测',
          description: '预测未来运势走向'
        },
        {
          image: '💝',
          value: 'love',
          text: '爱情占卜',
          description: '探索爱情的奥秘'
        },
        {
          image: '💼',
          value: 'career',
          text: '事业占卜',
          description: '指引事业发展方向'
        },
        {
          image: '💰',
          value: 'wealth',
          text: '财运占卜',
          description: '洞察财富运势'
        }
      ]
    }
  }

  componentDidMount() {}

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  handleDivinationClick = (item: any, _index: number) => {
    console.log('选择占卜类型:', item)
    
    Taro.showToast({
      title: `${item.text}功能开发中`,
      icon: 'none'
    })
    
    // TODO: 根据占卜类型跳转到对应页面
    // switch (item.value) {
    //   case 'tarot':
    //     Taro.navigateTo({ url: '/pages/tarot/index' })
    //     break
    //   case 'astrology':
    //     Taro.navigateTo({ url: '/pages/astrology/index' })
    //     break
    //   default:
    //     break
    // }
  }

  render() {
    const { divinationTypes } = this.state
    
    return (
      <View className='divination-page'>
        <View className='divination-header'>
          <Text className='header-title'>神秘占卜</Text>
          <Text className='header-subtitle'>探索未知，指引人生</Text>
        </View>
        
        <View className='divination-content'>
          <AtCard
            title='今日运势'
            className='daily-fortune-card'
          >
            <View className='daily-fortune'>
              <View className='fortune-item'>
                <Text className='fortune-label'>综合运势</Text>
                <Text className='fortune-value'>⭐⭐⭐⭐☆</Text>
              </View>
              <View className='fortune-item'>
                <Text className='fortune-label'>幸运颜色</Text>
                <Text className='fortune-value'>紫色</Text>
              </View>
              <View className='fortune-item'>
                <Text className='fortune-label'>幸运数字</Text>
                <Text className='fortune-value'>7</Text>
              </View>
            </View>
          </AtCard>
          
          <View className='divination-types'>
            <Text className='section-title'>选择占卜类型</Text>
            <AtGrid
              data={divinationTypes}
              columnNum={2}
              hasBorder={false}
              onClick={this.handleDivinationClick}
            />
          </View>
          
          <AtCard
            title='占卜小贴士'
            className='tips-card'
          >
            <View className='tips-content'>
              <Text className='tip-text'>• 保持内心平静，专注于你想要了解的问题</Text>
              <Text className='tip-text'>• 占卜结果仅供参考，人生掌握在自己手中</Text>
              <Text className='tip-text'>• 建议每天最多进行3次占卜</Text>
            </View>
          </AtCard>
        </View>
      </View>
    )
  }
}