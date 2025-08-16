import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtCard, AtButton, AtIcon, AtProgress, AtTag } from 'taro-ui';
import './index.scss';

interface FortuneData {
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
}

const Fortune: React.FC = () => {
  // const _router = useRouter();
  const [dailyFortune, setDailyFortune] = useState<FortuneData | null>(null);
  const [weeklyFortune, setWeeklyFortune] = useState<FortuneData | null>(null);
  const [monthlyFortune, setMonthlyFortune] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    loadFortuneData();
  }, []);

  const loadFortuneData = async () => {
    try {
      setLoading(true);

      // 获取今日运势
      const dailyResponse = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/daily`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${Taro.getStorageSync('token')}`,
        },
      });

      // 获取本周运势
      const weeklyResponse = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/weekly`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${Taro.getStorageSync('token')}`,
        },
      });

      // 获取本月运势
      const monthlyResponse = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/monthly`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${Taro.getStorageSync('token')}`,
        },
      });

      if (dailyResponse.data.success) {
        setDailyFortune(dailyResponse.data.data);
      }

      if (weeklyResponse.data.success) {
        setWeeklyFortune(weeklyResponse.data.data);
      }

      if (monthlyResponse.data.success) {
        setMonthlyFortune(monthlyResponse.data.data);
      }
    } catch (error) {
      console.error('获取运势数据失败:', error);
      Taro.showToast({
        title: '获取运势数据失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    if (score >= 40) return '#fa8c16';
    return '#f5222d';
  };

  const getScoreText = (score: number): string => {
    if (score >= 80) return '极佳';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '需注意';
  };

  const getCurrentFortune = (): FortuneData | null => {
    switch (activeTab) {
      case 'daily':
        return dailyFortune;
      case 'weekly':
        return weeklyFortune;
      case 'monthly':
        return monthlyFortune;
      default:
        return dailyFortune;
    }
  };

  const getTabTitle = (): string => {
    switch (activeTab) {
      case 'daily':
        return '今日运势';
      case 'weekly':
        return '本周运势';
      case 'monthly':
        return '本月运势';
      default:
        return '今日运势';
    }
  };

  const handleViewHistory = () => {
    Taro.navigateTo({
      url: '/pages/fortune/history/index',
    });
  };

  const handleViewTrend = () => {
    Taro.navigateTo({
      url: '/pages/fortune/trend/index',
    });
  };

  const handleRefresh = () => {
    loadFortuneData();
  };

  const currentFortune = getCurrentFortune();

  if (loading) {
    return (
      <View className="fortune-loading">
        <AtIcon value="loading-3" size="30" color="#6190E8"></AtIcon>
        <Text className="loading-text">正在获取运势数据...</Text>
      </View>
    );
  }

  return (
    <View className="fortune-container">
      {/* 标签页切换 */}
      <View className="fortune-tabs">
        <View
          className={`tab-item ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <Text>今日</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          <Text>本周</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          <Text>本月</Text>
        </View>
      </View>

      {currentFortune ? (
        <View className="fortune-content">
          {/* 运势概览卡片 */}
          <AtCard className="fortune-overview-card">
            <View className="card-header">
              <Text className="card-title">{getTabTitle()}</Text>
              <View className="overall-score">
                <Text className="score-label">综合运势</Text>
                <Text
                  className="score-value"
                  style={{ color: getScoreColor(currentFortune.overallScore) }}
                >
                  {currentFortune.overallScore}
                </Text>
                <Text className="score-text">{getScoreText(currentFortune.overallScore)}</Text>
              </View>
            </View>

            <View className="fortune-details">
              {/* 各项运势评分 */}
              <View className="score-grid">
                <View className="score-item">
                  <Text className="score-label">爱情</Text>
                  <AtProgress
                    percent={currentFortune.loveScore}
                    strokeWidth={8}
                    color={getScoreColor(currentFortune.loveScore)}
                  />
                  <Text className="score-number">{currentFortune.loveScore}</Text>
                </View>

                <View className="score-item">
                  <Text className="score-label">事业</Text>
                  <AtProgress
                    percent={currentFortune.careerScore}
                    strokeWidth={8}
                    color={getScoreColor(currentFortune.careerScore)}
                  />
                  <Text className="score-number">{currentFortune.careerScore}</Text>
                </View>

                <View className="score-item">
                  <Text className="score-label">财富</Text>
                  <AtProgress
                    percent={currentFortune.wealthScore}
                    strokeWidth={8}
                    color={getScoreColor(currentFortune.wealthScore)}
                  />
                  <Text className="score-number">{currentFortune.wealthScore}</Text>
                </View>

                <View className="score-item">
                  <Text className="score-label">健康</Text>
                  <AtProgress
                    percent={currentFortune.healthScore}
                    strokeWidth={8}
                    color={getScoreColor(currentFortune.healthScore)}
                  />
                  <Text className="score-number">{currentFortune.healthScore}</Text>
                </View>
              </View>

              {/* 幸运元素 */}
              <View className="lucky-elements">
                <View className="lucky-item">
                  <AtIcon value="heart" size="16" color="#f5222d"></AtIcon>
                  <Text className="lucky-label">幸运色彩</Text>
                  <View
                    className="lucky-color"
                    style={{ backgroundColor: currentFortune.luckyColor }}
                  ></View>
                </View>

                <View className="lucky-item">
                  <AtIcon value="star" size="16" color="#faad14"></AtIcon>
                  <Text className="lucky-label">幸运数字</Text>
                  <Text className="lucky-number">{currentFortune.luckyNumber}</Text>
                </View>
              </View>

              {/* 关键词标签 */}
              <View className="keywords">
                <Text className="keywords-title">运势关键词</Text>
                <View className="keywords-list">
                  {currentFortune.keywords.map((keyword, index) => (
                    <AtTag key={index} size="small" type="primary" circle>
                      {keyword}
                    </AtTag>
                  ))}
                </View>
              </View>

              {/* 运势建议 */}
              <View className="advice-section">
                <Text className="advice-title">运势建议</Text>
                <Text className="advice-content">{currentFortune.advice}</Text>
              </View>
            </View>
          </AtCard>

          {/* 操作按钮 */}
          <View className="action-buttons">
            <AtButton type="primary" size="normal" onClick={handleViewTrend}>
              <AtIcon value="analytics" size="16"></AtIcon>
              查看趋势
            </AtButton>

            <AtButton type="secondary" size="normal" onClick={handleViewHistory}>
              <AtIcon value="clock" size="16"></AtIcon>
              历史记录
            </AtButton>

            <AtButton type="secondary" size="normal" onClick={handleRefresh}>
              <AtIcon value="reload" size="16"></AtIcon>
              刷新
            </AtButton>
          </View>
        </View>
      ) : (
        <View className="fortune-empty">
          <AtIcon value="file-generic" size="60" color="#ccc"></AtIcon>
          <Text className="empty-text">暂无运势数据</Text>
          <AtButton type="primary" size="small" onClick={handleRefresh}>
            重新获取
          </AtButton>
        </View>
      )}
    </View>
  );
};

export default Fortune;
