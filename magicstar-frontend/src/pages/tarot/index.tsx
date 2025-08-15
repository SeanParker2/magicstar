import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { tarotService, TarotSpread } from '../../services/tarot'
import './index.scss'

const TarotIndex = () => {
  const [spreads, setSpreads] = useState<TarotSpread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSpreads()
  }, [])

  const loadSpreads = async () => {
    try {
      setLoading(true)
      const spreadsData = await tarotService.getSpreads()
      setSpreads(spreadsData)
    } catch (error) {
      console.error('加载牌阵失败:', error)
      Taro.showToast({
        title: '加载牌阵失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSpreadSelect = (spread: TarotSpread) => {
    Taro.navigateTo({
      url: `/pages/tarot/draw/index?spreadId=${spread.id}&cardCount=${spread.cardCount}&spreadName=${encodeURIComponent(spread.nameCn)}`
    })
  }

  const navigateToHistory = () => {
    Taro.navigateTo({
      url: '/pages/tarot/history/index'
    })
  }

  return (
    <View className='tarot-index'>
      <View className='header'>
        <Text className='title'>塔罗牌占卜</Text>
        <Text className='subtitle'>选择你的牌阵，开始神秘的占卜之旅</Text>
      </View>

      <View className='spread-list'>
        {loading ? (
          <View className='loading'>
            <Text>加载中...</Text>
          </View>
        ) : (
          spreads.map(spread => (
            <View 
              key={spread.id}
              className='spread-card'
              onClick={() => handleSpreadSelect(spread)}
            >
              <View className='spread-header'>
                <Text className='spread-name'>{spread.nameCn}</Text>
                <View className={`difficulty ${spread.difficultyLevel}`}>
                  <Text className='difficulty-text'>{spread.difficultyLevel}</Text>
                </View>
              </View>
              <Text className='spread-description'>{spread.description}</Text>
              <View className='spread-info'>
                <Text className='card-count'>{spread.cardCount}张牌</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View className='bottom-actions'>
        <View className='action-button' onClick={navigateToHistory}>
          <Text className='action-text'>占卜历史</Text>
        </View>
      </View>
    </View>
  )
}

export default TarotIndex