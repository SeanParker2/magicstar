import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtCard, AtButton, AtIcon, AtTag, AtLoadMore, AtSearchBar } from 'taro-ui';
import './index.scss';

interface FortuneHistoryItem {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  overallScore: number;
  loveScore: number;
  careerScore: number;
  wealthScore: number;
  healthScore: number;
  luckyColor: string;
  luckyNumber: number;
  advice: string;
  keywords: string[];
  createdAt: string;
}

const FortuneHistory: React.FC = () => {
  const [historyList, setHistoryList] = useState<FortuneHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');

  useEffect(() => {
    loadHistoryData(true);
  }, [filterType]);

  const loadHistoryData = async (reset: boolean = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/history`,
        method: 'GET',
        data: {
          page: currentPage,
          limit: 10,
          type: filterType === 'all' ? undefined : filterType,
          search: searchValue || undefined
        },
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('token')}`
        }
      });
      
      if (response.data.success) {
        const newData = response.data.data.items;
        
        if (reset) {
          setHistoryList(newData);
          setPage(2);
        } else {
          setHistoryList(prev => [...prev, ...newData]);
          setPage(prev => prev + 1);
        }
        
        setHasMore(newData.length === 10);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      Taro.showToast({
        title: '获取历史记录失败',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setPage(1);
    loadHistoryData(true);
  };

  const handleFilterChange = (type: 'all' | 'daily' | 'weekly' | 'monthly') => {
    setFilterType(type);
    setPage(1);
  };

  const handleViewDetail = (item: FortuneHistoryItem) => {
    Taro.navigateTo({
      url: `/pages/fortune/detail/index?id=${item.id}`
    });
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const result = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这条运势记录吗？'
      });
      
      if (result.confirm) {
        await Taro.request({
          url: `${process.env.TARO_APP_API_URL}/fortune/history/${id}`,
          method: 'DELETE',
          header: {
            'Authorization': `Bearer ${Taro.getStorageSync('token')}`
          }
        });
        
        setHistoryList(prev => prev.filter(item => item.id !== id));
        
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      Taro.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  };

  const getTypeText = (type: string): string => {
    switch (type) {
      case 'daily':
        return '今日';
      case 'weekly':
        return '本周';
      case 'monthly':
        return '本月';
      default:
        return '未知';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    if (score >= 40) return '#fa8c16';
    return '#f5222d';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const onPullDownRefresh = () => {
    loadHistoryData(true);
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 1000);
  };

  const onReachBottom = () => {
    if (hasMore && !loading) {
      loadHistoryData();
    }
  };

  // 注册页面事件
  Taro.usePullDownRefresh(onPullDownRefresh);
  Taro.useReachBottom(onReachBottom);

  return (
    <View className='fortune-history-container'>
      {/* 搜索栏 */}
      <View className='search-section'>
        <AtSearchBar
          value={searchValue}
          onChange={(value) => setSearchValue(value)}
          onActionClick={() => handleSearch(searchValue)}
          placeholder='搜索运势记录...'
        />
      </View>

      {/* 筛选标签 */}
      <View className='filter-section'>
        <ScrollView scrollX className='filter-scroll'>
          <View className='filter-tags'>
            <View 
              className={`filter-tag ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              <Text>全部</Text>
            </View>
            <View 
              className={`filter-tag ${filterType === 'daily' ? 'active' : ''}`}
              onClick={() => handleFilterChange('daily')}
            >
              <Text>今日运势</Text>
            </View>
            <View 
              className={`filter-tag ${filterType === 'weekly' ? 'active' : ''}`}
              onClick={() => handleFilterChange('weekly')}
            >
              <Text>本周运势</Text>
            </View>
            <View 
              className={`filter-tag ${filterType === 'monthly' ? 'active' : ''}`}
              onClick={() => handleFilterChange('monthly')}
            >
              <Text>本月运势</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 历史记录列表 */}
      <View className='history-list'>
        {historyList.length > 0 ? (
          historyList.map((item) => (
            <AtCard key={item.id} className='history-item'>
              <View className='item-header'>
                <View className='item-info'>
                  <AtTag 
                    size='small'
                    type='primary'
                    circle
                  >
                    {getTypeText(item.type)}
                  </AtTag>
                  <Text className='item-date'>{formatDate(item.date)}</Text>
                </View>
                
                <View className='item-score'>
                  <Text 
                    className='score-value'
                    style={{ color: getScoreColor(item.overallScore) }}
                  >
                    {item.overallScore}
                  </Text>
                  <Text className='score-label'>综合</Text>
                </View>
              </View>
              
              <View className='item-content'>
                <View className='score-details'>
                  <View className='score-item'>
                    <Text className='label'>爱情</Text>
                    <Text 
                      className='value'
                      style={{ color: getScoreColor(item.loveScore) }}
                    >
                      {item.loveScore}
                    </Text>
                  </View>
                  <View className='score-item'>
                    <Text className='label'>事业</Text>
                    <Text 
                      className='value'
                      style={{ color: getScoreColor(item.careerScore) }}
                    >
                      {item.careerScore}
                    </Text>
                  </View>
                  <View className='score-item'>
                    <Text className='label'>财富</Text>
                    <Text 
                      className='value'
                      style={{ color: getScoreColor(item.wealthScore) }}
                    >
                      {item.wealthScore}
                    </Text>
                  </View>
                  <View className='score-item'>
                    <Text className='label'>健康</Text>
                    <Text 
                      className='value'
                      style={{ color: getScoreColor(item.healthScore) }}
                    >
                      {item.healthScore}
                    </Text>
                  </View>
                </View>
                
                <View className='keywords-preview'>
                  {item.keywords.slice(0, 3).map((keyword, index) => (
                    <AtTag 
                      key={index}
                      size='small'
                      type='primary'
                      circle
                    >
                      {keyword}
                    </AtTag>
                  ))}
                  {item.keywords.length > 3 && (
                    <Text className='more-keywords'>+{item.keywords.length - 3}</Text>
                  )}
                </View>
                
                <Text className='advice-preview'>
                  {item.advice.length > 50 ? `${item.advice.substring(0, 50)}...` : item.advice}
                </Text>
              </View>
              
              <View className='item-actions'>
                <AtButton 
                  type='primary'
                  size='small'
                  onClick={() => handleViewDetail(item)}
                >
                  查看详情
                </AtButton>
                <AtButton 
                  type='secondary'
                  size='small'
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <AtIcon value='trash' size='14'></AtIcon>
                  删除
                </AtButton>
              </View>
            </AtCard>
          ))
        ) : (
          <View className='empty-state'>
            <AtIcon value='file-generic' size='60' color='#ccc'></AtIcon>
            <Text className='empty-text'>暂无运势记录</Text>
            <Text className='empty-tip'>快去获取你的专属运势吧！</Text>
          </View>
        )}
        
        {/* 加载更多 */}
        {historyList.length > 0 && (
          <AtLoadMore
            status={loading ? 'loading' : hasMore ? 'more' : 'noMore'}
            loadingText='加载中...'
            moreText='加载更多'
            noMoreText='没有更多了'
          />
        )}
      </View>
    </View>
  );
};

export default FortuneHistory;