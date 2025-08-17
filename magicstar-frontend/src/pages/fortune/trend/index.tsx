import React, { useState, useEffect } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtCard, AtButton, AtIcon, AtSegmentedControl, AtCalendar } from 'taro-ui';
import { FortuneService, FortuneTrendData, FortuneTrendStats } from '../../../services/fortune';
import './index.css';

// 使用服务层定义的接口
// type TrendData = FortuneTrendData;
// type TrendStats = FortuneTrendStats;

const FortuneTrend: React.FC = () => {
  const [trendData, setTrendData] = useState<FortuneTrendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const periods = ['最近7天', '最近30天', '最近90天'];
  const periodValues = [7, 30, 90];

  useEffect(() => {
    loadTrendData();
  }, [periodIndex]);

  const loadTrendData = async () => {
    try {
      setLoading(true);

      const response = await FortuneService.getFortuneTrend(periodValues[periodIndex]);

      if (response.success) {
        setTrendData(response.data);
        drawChart(response.data.data);
      }
    } catch (error) {
      console.error('获取趋势数据失败:', error);
      Taro.showToast({
        title: '获取趋势数据失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const drawChart = (data: FortuneTrendData[]) => {
    const query = Taro.createSelectorQuery();
    query
      .select('#trend-canvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          const dpr = Taro.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);

          drawTrendChart(ctx, data, res[0].width, res[0].height);
        }
      });
  };

  const drawTrendChart = (
    ctx: CanvasRenderingContext2D,
    data: FortuneTrendData[],
    width: number,
    height: number
  ) => {
    // 清空画布
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 绘制背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格线
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Y轴标签
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 20}`, padding - 10, y + 4);
    }

    // 垂直网格线
    const stepX = chartWidth / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const x = padding + stepX * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      // X轴标签
      if (i % Math.ceil(data.length / 5) === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const date = new Date(data[i].date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, height - padding + 20);
      }
    }

    // 绘制数据线
    const colors = {
      overall: '#6190E8',
      love: '#f5222d',
      career: '#52c41a',
      wealth: '#faad14',
      health: '#722ed1',
    };

    const metrics = ['overall', 'love', 'career', 'wealth', 'health'] as const;
    const labels = ['综合', '爱情', '事业', '财富', '健康'];

    metrics.forEach((metric, index) => {
      ctx.strokeStyle = Object.values(colors)[index];
      ctx.lineWidth = chartType === 'line' ? 3 : 1;
      ctx.beginPath();

      data.forEach((point, i) => {
        const x = padding + stepX * i;
        const scoreValue = point.scores[metric] * 20; // 转换为百分制
        const y = padding + chartHeight - (scoreValue / 100) * chartHeight;

        if (chartType === 'line') {
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          // 绘制柱状图
          const barWidth = stepX / 6;
          const barX = x - barWidth * 2.5 + barWidth * index;
          const barHeight = (scoreValue / 100) * chartHeight;

          ctx.fillStyle = Object.values(colors)[index];
          ctx.fillRect(barX, height - padding - barHeight, barWidth, barHeight);
        }
      });

      if (chartType === 'line') {
        ctx.stroke();

        // 绘制数据点
        data.forEach((point, i) => {
          const x = padding + stepX * i;
          const scoreValue = point.scores[metric] * 20; // 转换为百分制
          const y = padding + chartHeight - (scoreValue / 100) * chartHeight;

          ctx.fillStyle = Object.values(colors)[index];
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });

    // 绘制图例
    const legendY = height - 15;
    let legendX = padding;

    labels.forEach((label, index) => {
      ctx.fillStyle = Object.values(colors)[index];
      ctx.fillRect(legendX, legendY - 8, 12, 12);

      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 16, legendY);

      legendX += ctx.measureText(label).width + 30;
    });
  };

  const handlePeriodChange = (value: number) => {
    setPeriodIndex(value);
  };

  const handleChartTypeChange = () => {
    setChartType(prev => (prev === 'line' ? 'bar' : 'line'));
    if (trendData) {
      setTimeout(() => drawChart(trendData.data), 100);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return { icon: 'chevron-up', color: '#52c41a' };
      case 'down':
        return { icon: 'chevron-down', color: '#f5222d' };
      default:
        return { icon: 'minus', color: '#faad14' };
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'up':
        return '上升趋势';
      case 'down':
        return '下降趋势';
      default:
        return '平稳趋势';
    }
  };

  if (loading) {
    return (
      <View className="trend-loading">
        <AtIcon value="loading-3" size="30" color="#6190E8"></AtIcon>
        <Text className="loading-text">正在分析运势趋势...</Text>
      </View>
    );
  }

  return (
    <View className="fortune-trend-container">
      {/* 时间段选择 */}
      <View className="period-selector">
        <AtSegmentedControl values={periods} onClick={handlePeriodChange} current={periodIndex} />
      </View>

      {trendData ? (
        <View className="trend-content">
          {/* 统计概览 */}
          <AtCard className="stats-card">
            <View className="stats-header">
              <Text className="stats-title">运势统计</Text>
              <View className="trend-indicator">
                <AtIcon
                  value={getTrendIcon(trendData.trend).icon}
                  size="20"
                  color={getTrendIcon(trendData.trend).color}
                ></AtIcon>
                <Text className="trend-text" style={{ color: getTrendIcon(trendData.trend).color }}>
                  {getTrendText(trendData.trend)}
                </Text>
              </View>
            </View>

            <View className="stats-grid">
              <View className="stat-item">
                <Text className="stat-label">平均分</Text>
                <Text className="stat-value">{trendData.averageScore.toFixed(1)}</Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">最高分</Text>
                <Text className="stat-value high">{trendData.highestScore}</Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">最低分</Text>
                <Text className="stat-value low">{trendData.lowestScore}</Text>
              </View>
            </View>
          </AtCard>

          {/* 趋势图表 */}
          <AtCard className="chart-card">
            <View className="chart-header">
              <Text className="chart-title">运势趋势图</Text>
              <AtButton type="secondary" size="small" onClick={handleChartTypeChange}>
                <AtIcon value={chartType === 'line' ? 'analytics' : 'menu'} size="14"></AtIcon>
                {chartType === 'line' ? '柱状图' : '折线图'}
              </AtButton>
            </View>

            <View className="chart-container">
              <Canvas
                id="trend-canvas"
                canvasId="trend-canvas"
                className="trend-canvas"
                type="2d"
              />
            </View>
          </AtCard>

          {/* 操作按钮 */}
          <View className="action-buttons">
            <AtButton type="primary" size="normal" onClick={() => setShowCalendar(true)}>
              <AtIcon value="calendar" size="16"></AtIcon>
              选择日期
            </AtButton>

            <AtButton type="secondary" size="normal" onClick={loadTrendData}>
              <AtIcon value="reload" size="16"></AtIcon>
              刷新数据
            </AtButton>
          </View>
        </View>
      ) : (
        <View className="trend-empty">
          <AtIcon value="analytics" size="60" color="#ccc"></AtIcon>
          <Text className="empty-text">暂无趋势数据</Text>
          <Text className="empty-tip">需要更多运势记录才能分析趋势</Text>
        </View>
      )}

      {/* 日期选择器 */}
      {showCalendar && (
        <AtCalendar
          isSwiper={false}
          marks={[]}
          selectedDates={selectedDate ? [{ value: selectedDate }] : []}
          onDayClick={item => {
            setSelectedDate(item.value);
            setShowCalendar(false);
            // 可以根据选择的日期加载特定数据
          }}
          onSelectDate={e => {
            setSelectedDate(e.value);
            setShowCalendar(false);
          }}
        />
      )}
    </View>
  );
};

export default FortuneTrend;
