import { View, Text, Button, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { aiService, InterpretationResult } from '../../../services/ai';
import './index.scss';

const AiHistory = () => {
  const [interpretations, setInterpretations] = useState<InterpretationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'quality'>('time');

  const typeOptions = [
    { value: 'all', label: '全部' },
    { value: 'tarot', label: '塔罗牌' },
    { value: 'astrology', label: '星座' },
    { value: 'numerology', label: '数字学' },
  ];

  useEffect(() => {
    loadHistory();
  }, [selectedType, sortBy]);

  const loadHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      const currentPage = isRefresh ? 1 : page;
      const response = await aiService.getHistory({
        page: currentPage,
        limit: 10,
        type: selectedType === 'all' ? undefined : selectedType,
      });

      if (isRefresh) {
        setInterpretations(response.interpretations);
      } else {
        setInterpretations(prev =>
          currentPage === 1 ? response.interpretations : [...prev, ...response.interpretations]
        );
      }

      setHasMore(response.hasMore);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadHistory(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadHistory();
    }
  };

  const handleViewDetail = (interpretation: InterpretationResult) => {
    Taro.navigateTo({
      url: `/pages/ai/detail/index?id=${interpretation.id}`,
    });
  };

  const handleShare = (interpretation: InterpretationResult) => {
    Taro.setClipboardData({
      data: `AI个性化解读：\n${interpretation.summary}\n\n${interpretation.content}`,
      success: () => {
        Taro.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
        });
      },
    });
  };

  const handleRegenerate = async (interpretation: InterpretationResult) => {
    try {
      Taro.showLoading({ title: '重新生成中...' });

      const newInterpretation = await aiService.regenerateInterpretation(interpretation.id);

      // 更新列表中的记录
      setInterpretations(prev =>
        prev.map(item => (item.id === interpretation.id ? newInterpretation : item))
      );

      Taro.showToast({
        title: '重新生成成功',
        icon: 'success',
      });
    } catch (error) {
      console.error('重新生成失败:', error);
      Taro.showToast({
        title: '重新生成失败',
        icon: 'error',
      });
    } finally {
      Taro.hideLoading();
    }
  };

  const getTypeLabel = (type: string) => {
    const option = typeOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#faad14';
    if (score >= 70) return '#fa8c16';
    return '#f5222d';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && interpretations.length === 0) {
    return (
      <View className="ai-history loading">
        <View className="loading-container">
          <View className="spinner"></View>
          <Text className="loading-text">加载历史记录中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="ai-history">
      {/* 头部 */}
      <View className="header">
        <Text className="title">AI解读历史</Text>
        <Text className="subtitle">查看您的个性化解读记录</Text>
      </View>

      {/* 筛选器 */}
      <View className="filters">
        <View className="filter-section">
          <Text className="filter-label">类型</Text>
          <ScrollView className="filter-options" scrollX>
            {typeOptions.map(option => (
              <View
                key={option.value}
                className={`filter-option ${selectedType === option.value ? 'active' : ''}`}
                onClick={() => setSelectedType(option.value)}
              >
                <Text className="option-text">{option.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="filter-section">
          <Text className="filter-label">排序</Text>
          <View className="sort-options">
            <View
              className={`sort-option ${sortBy === 'time' ? 'active' : ''}`}
              onClick={() => setSortBy('time')}
            >
              <Text className="option-text">时间</Text>
            </View>
            <View
              className={`sort-option ${sortBy === 'quality' ? 'active' : ''}`}
              onClick={() => setSortBy('quality')}
            >
              <Text className="option-text">质量</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 解读列表 */}
      <ScrollView
        className="interpretation-list"
        scrollY
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        onScrollToLower={handleLoadMore}
      >
        {interpretations.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-text">暂无AI解读记录</Text>
            <Text className="empty-hint">开始您的第一次AI解读吧</Text>
            <Button
              className="start-btn"
              type="primary"
              onClick={() => Taro.switchTab({ url: '/pages/index/index' })}
            >
              开始占卜
            </Button>
          </View>
        ) : (
          interpretations.map(interpretation => (
            <View key={interpretation.id} className="interpretation-item">
              {/* 头部信息 */}
              <View className="item-header">
                <View className="type-badge">
                  <Text className="type-text">{getTypeLabel(interpretation.type)}</Text>
                </View>
                <View className="quality-info">
                  <Text
                    className="quality-score"
                    style={{ color: getQualityColor(interpretation.qualityScore) }}
                  >
                    {interpretation.qualityScore}分
                  </Text>
                </View>
              </View>

              {/* 内容预览 */}
              <View className="item-content">
                <Text className="summary">{interpretation.summary}</Text>
                <Text className="content-preview">
                  {interpretation.content.length > 100
                    ? `${interpretation.content.substring(0, 100)}...`
                    : interpretation.content}
                </Text>
              </View>

              {/* 元数据 */}
              <View className="item-meta">
                <Text className="date">{formatDate(interpretation.createdAt)}</Text>
                <Text className="model">模型: {interpretation.metadata.modelUsed}</Text>
                <Text className="tokens">
                  Token: {interpretation.metadata.tokenUsage.totalTokens}
                </Text>
              </View>

              {/* 操作按钮 */}
              <View className="item-actions">
                <Button
                  className="action-btn view-btn"
                  size="mini"
                  onClick={() => handleViewDetail(interpretation)}
                >
                  查看详情
                </Button>
                <Button
                  className="action-btn share-btn"
                  size="mini"
                  onClick={() => handleShare(interpretation)}
                >
                  分享
                </Button>
                <Button
                  className="action-btn regenerate-btn"
                  size="mini"
                  onClick={() => handleRegenerate(interpretation)}
                >
                  重新生成
                </Button>
              </View>
            </View>
          ))
        )}

        {/* 加载更多 */}
        {loading && interpretations.length > 0 && (
          <View className="loading-more">
            <View className="spinner small"></View>
            <Text className="loading-text">加载更多...</Text>
          </View>
        )}

        {!hasMore && interpretations.length > 0 && (
          <View className="no-more">
            <Text className="no-more-text">没有更多记录了</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AiHistory;
