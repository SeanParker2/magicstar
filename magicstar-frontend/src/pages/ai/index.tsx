import { View, Text, Button, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { aiService } from '../../services/ai'
import './index.scss'

interface AiRecord {
  id: string
  type: string
  content: string
  interpretation: string
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
}

export default function AiIndex() {
  const [records, setRecords] = useState<AiRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history')

  useLoad(() => {
    console.log('AI页面加载')
    loadHistory()
  })

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await aiService.getHistory()
      // 转换InterpretationResult[]到AiRecord[]
      const aiRecords: AiRecord[] = (response.interpretations || []).map(item => ({
        id: item.id,
        type: item.type,
        content: item.content,
        interpretation: item.summary || item.advice || '',
        createdAt: item.createdAt,
        status: 'completed' as const
      }))
      setRecords(aiRecords)
    } catch (error) {
      console.error('加载AI解读历史失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewInterpretation = () => {
    Taro.navigateTo({
      url: '/pages/divination/index'
    })
  }

  const handleViewDetail = (record: AiRecord) => {
    Taro.navigateTo({
      url: `/pages/ai/detail/index?id=${record.id}`
    })
  }

  const handleViewHistory = () => {
    Taro.navigateTo({
      url: '/pages/ai/history/index'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getTypeText = (type: string) => {
    const typeMap = {
      'tarot': '塔罗占卜',
      'astrology': '星盘解读',
      'fortune': '运势分析',
      'numerology': '数字命理'
    }
    return typeMap[type] || type
  }

  return (
    <View className='ai-page'>
      {/* 页面头部 */}
      <View className='ai-header'>
        <Text className='ai-title'>AI智能解读</Text>
        <Text className='ai-subtitle'>专业的占卜解读，个性化的人生指导</Text>
      </View>

      {/* 标签页切换 */}
      <View className='ai-tabs'>
        <View 
          className={`ai-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Text>解读历史</Text>
        </View>
        <View 
          className={`ai-tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <Text>新建解读</Text>
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView className='ai-content' scrollY>
        {activeTab === 'history' ? (
          <View className='ai-history'>
            {loading ? (
              <View className='ai-loading'>
                <Text>加载中...</Text>
              </View>
            ) : records.length > 0 ? (
              <View className='ai-records'>
                {records.slice(0, 5).map((record) => (
                  <View 
                    key={record.id} 
                    className='ai-record-item'
                    onClick={() => handleViewDetail(record)}
                  >
                    <View className='record-header'>
                      <Text className='record-type'>{getTypeText(record.type)}</Text>
                      <Text className='record-date'>{formatDate(record.createdAt)}</Text>
                    </View>
                    <Text className='record-content'>{record.content}</Text>
                    <View className='record-status'>
                      <Text className={`status-text ${record.status}`}>
                        {record.status === 'completed' ? '已完成' : 
                         record.status === 'pending' ? '解读中' : '解读失败'}
                      </Text>
                    </View>
                  </View>
                ))}
                
                {records.length > 5 && (
                  <View className='ai-more' onClick={handleViewHistory}>
                    <Text>查看更多历史记录</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className='ai-empty'>
                <Text className='empty-text'>暂无AI解读记录</Text>
                <Text className='empty-tip'>开始你的第一次AI解读吧</Text>
                <Button 
                  className='empty-button'
                  onClick={handleNewInterpretation}
                >
                  立即开始
                </Button>
              </View>
            )}
          </View>
        ) : (
          <View className='ai-new'>
            <View className='ai-features'>
              <View className='feature-item' onClick={handleNewInterpretation}>
                <View className='feature-icon tarot'></View>
                <Text className='feature-title'>塔罗占卜</Text>
                <Text className='feature-desc'>AI深度解读塔罗牌意义</Text>
              </View>
              
              <View className='feature-item' onClick={() => {
                Taro.navigateTo({ url: '/pages/fortune/index' })
              }}>
                <View className='feature-icon astrology'></View>
                <Text className='feature-title'>星盘分析</Text>
                <Text className='feature-desc'>专业的星盘解读服务</Text>
              </View>
              
              <View className='feature-item' onClick={() => {
                Taro.navigateTo({ url: '/pages/fortune/index' })
              }}>
                <View className='feature-icon fortune'></View>
                <Text className='feature-title'>运势预测</Text>
                <Text className='feature-desc'>个性化运势分析报告</Text>
              </View>
            </View>
            
            <View className='ai-tips'>
              <Text className='tips-title'>AI解读特色</Text>
              <View className='tips-list'>
                <Text className='tip-item'>• 基于专业占卜理论</Text>
                <Text className='tip-item'>• 个性化解读内容</Text>
                <Text className='tip-item'>• 24小时智能服务</Text>
                <Text className='tip-item'>• 持续学习优化</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}