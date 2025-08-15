import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { AtButton, AtCard, AtTag, AtLoadMore } from 'taro-ui'
import { tarotService, HistoryRecord } from '../../../services/tarot'
import './index.scss'



const TarotHistory: React.FC = () => {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)



  const loadRecords = async (pageNum: number = 1) => {
    try {
      setLoading(true)
      
      const response = await tarotService.getHistory({
        page: pageNum,
        limit: 10
      })
      
      if (pageNum === 1) {
        setRecords(response.records)
      } else {
        setRecords(prev => [...prev, ...response.records])
      }
      
      setHasMore(response.hasMore)
      
    } catch (error) {
      console.error('加载历史记录失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadRecords(nextPage)
    }
  }

  const viewDetail = (recordId: number) => {
    Taro.navigateTo({
      url: `/pages/tarot/result/index?resultId=${recordId}`
    })
  }

  const deleteRecord = async (recordId: number) => {
    try {
      const result = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这条占卜记录吗？'
      })
      
      if (result.confirm) {
        await tarotService.deleteRecord(recordId)
        setRecords(prev => prev.filter(record => record.id !== recordId))
        
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('删除记录失败:', error)
      Taro.showToast({
        title: '删除失败',
        icon: 'error'
      })
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const getSpreadColor = (spreadName: string) => {
    if (spreadName.includes('单牌')) {
      return '#52c41a'
    } else if (spreadName.includes('三牌')) {
      return '#1890ff'
    } else if (spreadName.includes('凯尔特') || spreadName.includes('十字')) {
      return '#722ed1'
    } else {
      return '#666'
    }
  }

  useEffect(() => {
    loadRecords(1)
  }, [])

  if (loading && records.length === 0) {
    return (
      <View className='tarot-history loading'>
        <View className='loading-container'>
          <View className='spinner'></View>
          <Text className='loading-text'>加载历史记录中...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='tarot-history'>
      <View className='header'>
        <Text className='title'>占卜历史</Text>
        <Text className='subtitle'>回顾你的占卜记录</Text>
      </View>

      {records.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-icon'>🔮</Text>
          <Text className='empty-text'>还没有占卜记录</Text>
          <Text className='empty-desc'>去体验一次塔罗牌占卜吧</Text>
          <AtButton
            type='primary'
            size='normal'
            onClick={() => Taro.navigateTo({ url: '/pages/tarot/index' })}
          >
            开始占卜
          </AtButton>
        </View>
      ) : (
        <ScrollView
          className='records-list'
          scrollY
          onScrollToLower={loadMore}
        >
          {records.map((record) => (
            <AtCard
              key={record.id}
              className='record-card'
              title=''
              onClick={() => viewDetail(record.id)}
            >
              <View className='record-content'>
                <View className='record-header'>
                  <View className='record-info'>
                    <Text className='question'>{record.question}</Text>
                    <View className='meta'>
                      <AtTag
                        size='small'
                        type='primary'
                        customStyle={{ backgroundColor: getSpreadColor(record.spread.nameCn || record.spread.name) }}
                      >
                        {record.spread.nameCn || record.spread.name}
                      </AtTag>
                      <Text className='date'>{formatDate(record.divinationTime)}</Text>
                    </View>
                  </View>
                  <View className='record-actions'>
                    <Text 
                      className='delete-btn'
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteRecord(record.id)
                      }}
                    >
                      删除
                    </Text>
                  </View>
                </View>
                
                <View className='cards-preview'>
                  {record.cardResults.slice(0, 3).map((cardResult, index) => (
                    <View key={index} className='card-preview'>
                      <Text className='card-name'>
                        {cardResult.card.nameCn || cardResult.card.name}{cardResult.isReversed ? ' (逆位)' : ''}
                      </Text>
                      <Text className='card-position'>{cardResult.position}</Text>
                    </View>
                  ))}
                </View>
                
                <Text className='summary-preview'>
                  {record.interpretation.summary.length > 50 
                    ? `${record.interpretation.summary.substring(0, 50)}...` 
                    : record.interpretation.summary
                  }
                </Text>
              </View>
            </AtCard>
          ))}
          
          <AtLoadMore
            status={loading ? 'loading' : hasMore ? 'more' : 'noMore'}
            loadingText='加载中...'
            moreText='加载更多'
            noMoreText='没有更多记录了'
          />
        </ScrollView>
      )}
    </View>
  )
}

export default TarotHistory