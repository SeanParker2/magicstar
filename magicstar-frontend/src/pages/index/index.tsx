import { Component, PropsWithChildren } from 'react'
import { View, Text, Swiper, SwiperItem } from '@tarojs/components'
import { AtGrid, AtCard, AtButton } from 'taro-ui'
import Taro from '@tarojs/taro'

import "taro-ui/dist/style/components/grid.scss"
import "taro-ui/dist/style/components/card.scss"
import "taro-ui/dist/style/components/button.scss"
import './index.scss'

interface IndexState {
  banners: Array<{
    id: number
    image: string
    title: string
  }>
  quickActions: Array<{
    image: string
    value: string
    text: string
  }>
}

export default class Index extends Component<PropsWithChildren, IndexState> {
  constructor(props) {
    super(props)
    this.state = {
      banners: [
        {
          id: 1,
          image: '',
          title: '探索神秘的占卜世界'
        },
        {
          id: 2,
          image: '',
          title: '每日运势为你指引方向'
        },
        {
          id: 3,
          image: '',
          title: '专业塔罗师在线服务'
        }
      ],
      quickActions: [
        {
          image: '🔮',
          value: 'tarot',
          text: '塔罗占卜'
        },
        {
          image: '⭐',
          value: 'astrology',
          text: '星盘分析'
        },
        {
          image: '🎯',
          value: 'fortune',
          text: '运势预测'
        },
        {
          image: '💝',
          value: 'love',
          text: '爱情占卜'
        }
      ]
    }
  }

  componentDidMount() {
    // TODO: 获取首页数据
  }

  componentWillUnmount() {}

  componentDidShow() {
    // 每次显示页面时刷新数据
  }

  componentDidHide() {}

  handleBannerClick = (banner) => {
    console.log('点击轮播图:', banner)
    // TODO: 处理轮播图点击事件
  }

  handleQuickAction = (item, _index) => {
    console.log('快捷操作:', item)
    
    // 跳转到占卜页面
    Taro.switchTab({
      url: '/pages/divination/index'
    })
  }

  handleDailyFortune = () => {
    Taro.showToast({
      title: '每日运势功能开发中',
      icon: 'none'
    })
  }

  handleShop = () => {
    Taro.showToast({
      title: '商城功能开发中',
      icon: 'none'
    })
  }

  render() {
    const { banners, quickActions } = this.state
    
    return (
      <View className='index-page'>
        {/* 轮播图 */}
        <View className='banner-section'>
          <Swiper
            className='banner-swiper'
            indicatorColor='rgba(255, 255, 255, 0.3)'
            indicatorActiveColor='#fff'
            circular
            indicatorDots
            autoplay
            interval={3000}
            duration={500}
          >
            {banners.map(banner => (
              <SwiperItem key={banner.id} onClick={() => this.handleBannerClick(banner)}>
                <View className='banner-item'>
                  <Text className='banner-title'>{banner.title}</Text>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
        
        {/* 快捷操作 */}
        <View className='quick-actions'>
          <Text className='section-title'>快速占卜</Text>
          <AtGrid
            data={quickActions}
            columnNum={4}
            hasBorder={false}
            onClick={this.handleQuickAction}
          />
        </View>
        
        {/* 今日运势 */}
        <View className='daily-section'>
          <AtCard
            title='今日运势'
            extra='查看详情'
            onClick={this.handleDailyFortune}
          >
            <View className='daily-content'>
              <Text className='daily-text'>今天是充满机遇的一天，保持积极的心态，好运将会降临。</Text>
              <View className='daily-stats'>
                <View className='stat-item'>
                  <Text className='stat-label'>综合运势</Text>
                  <Text className='stat-value'>⭐⭐⭐⭐☆</Text>
                </View>
                <View className='stat-item'>
                  <Text className='stat-label'>幸运色彩</Text>
                  <Text className='stat-value'>紫色</Text>
                </View>
              </View>
            </View>
          </AtCard>
        </View>
        
        {/* 推荐服务 */}
        <View className='services-section'>
          <Text className='section-title'>推荐服务</Text>
          <View className='service-cards'>
            <AtCard className='service-card'>
              <View className='service-content'>
                <Text className='service-icon'>🛍️</Text>
                <Text className='service-title'>神秘商城</Text>
                <Text className='service-desc'>精选占卜用品</Text>
                <AtButton
                  type='primary'
                  size='small'
                  onClick={this.handleShop}
                  className='service-btn'
                >
                  立即查看
                </AtButton>
              </View>
            </AtCard>
          </View>
        </View>
      </View>
    )
  }
}
