import { Component } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import { AtIcon, AtButton } from 'taro-ui';
import Taro from '@tarojs/taro';
import { FortuneData } from '../FortuneCard';
import './index.css';

export interface ChartData {
  /** 日期 */
  date: string;
  /** 运势数据 */
  fortunes: FortuneData[];
  /** 综合评分 */
  overallScore: number;
}

export interface FortuneChartProps {
  /** 图表数据 */
  data: ChartData[];
  /** 图表类型 */
  type?: 'line' | 'radar' | 'bar' | 'trend';
  /** 时间范围 */
  timeRange?: 'week' | 'month' | 'year';
  /** 显示的运势类型 */
  fortuneTypes?: FortuneData['type'][];
  /** 是否显示预测 */
  showPrediction?: boolean;
  /** 是否显示趋势线 */
  showTrend?: boolean;
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 是否可交互 */
  interactive?: boolean;
  /** 图表高度 */
  height?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 点击数据点回调 */
  onDataPointClick?: (data: ChartData, fortuneType: FortuneData['type']) => void;
  /** 时间范围改变回调 */
  onTimeRangeChange?: (range: 'week' | 'month' | 'year') => void;
}

export interface FortuneChartState {
  /** 当前选中的Tab */
  currentTab: number;
  /** 画布上下文 */
  canvasContext: any;
  /** 画布尺寸 */
  canvasSize: {
    width: number;
    height: number;
  };
  /** 选中的数据点 */
  selectedDataPoint: {
    data: ChartData;
    fortuneType: FortuneData['type'];
    position: { x: number; y: number };
  } | null;
  /** 是否正在加载 */
  loading: boolean;
}

export default class FortuneChart extends Component<FortuneChartProps, FortuneChartState> {
  private canvasId = `fortune-chart-${Date.now()}`;
  private animationFrame: number | null = null;

  static defaultProps: Partial<FortuneChartProps> = {
    type: 'line',
    timeRange: 'week',
    fortuneTypes: ['overall', 'love', 'career', 'wealth', 'health'],
    showPrediction: false,
    showTrend: true,
    showGrid: true,
    interactive: true,
    height: 300,
  };

  constructor(props: FortuneChartProps) {
    super(props);
    this.state = {
      currentTab: 0,
      canvasContext: null,
      canvasSize: {
        width: 0,
        height: props.height || 300,
      },
      selectedDataPoint: null,
      loading: true,
    };
  }

  componentDidMount() {
    this.initCanvas();
  }

  componentDidUpdate(prevProps: FortuneChartProps) {
    if (prevProps.data !== this.props.data || prevProps.type !== this.props.type) {
      this.drawChart();
    }
  }

  componentWillUnmount() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  // 初始化画布
  initCanvas = () => {
    const query = Taro.createSelectorQuery();
    query
      .select(`#${this.canvasId}`)
      .boundingClientRect()
      .exec(res => {
        if (res[0]) {
          const { width, height } = res[0];
          const context = Taro.createCanvasContext(this.canvasId);

          this.setState(
            {
              canvasContext: context,
              canvasSize: { width, height },
              loading: false,
            },
            () => {
              this.drawChart();
            }
          );
        }
      });
  };

  // 获取运势类型配置
  getFortuneTypeConfig = (type: FortuneData['type']) => {
    const configs = {
      love: { name: '爱情', color: '#ff6b9d' },
      career: { name: '事业', color: '#4834d4' },
      wealth: { name: '财富', color: '#f39c12' },
      health: { name: '健康', color: '#27ae60' },
      study: { name: '学业', color: '#3498db' },
      overall: { name: '综合', color: '#9b59b6' },
    };
    return configs[type];
  };

  // 获取时间范围标签
  getTimeRangeLabels = (): string[] => {
    const { timeRange, data } = this.props;

    if (!data || data.length === 0) return [];

    return data.map(item => {
      const date = new Date(item.date);

      switch (timeRange) {
        case 'week':
          return `${date.getMonth() + 1}/${date.getDate()}`;
        case 'month':
          return `${date.getMonth() + 1}/${date.getDate()}`;
        case 'year':
          return `${date.getMonth() + 1}月`;
        default:
          return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    });
  };

  // 绘制网格
  drawGrid = (ctx: any, width: number, height: number, padding: any) => {
    if (!this.props.showGrid) return;

    const { data } = this.props;
    if (!data || data.length === 0) return;

    ctx.setStrokeStyle('#f0f0f0');
    ctx.setLineWidth(1);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 绘制水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // 绘制垂直网格线
    const stepX = chartWidth / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + stepX * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }
  };

  // 绘制坐标轴
  drawAxes = (ctx: any, width: number, height: number, padding: any) => {
    ctx.setStrokeStyle('#333');
    ctx.setLineWidth(2);

    // X轴
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // 绘制Y轴标签
    ctx.setFillStyle('#666');
    ctx.setFontSize(12);
    for (let i = 0; i <= 5; i++) {
      const value = (100 / 5) * i;
      const y = height - padding.bottom - ((height - padding.top - padding.bottom) / 5) * i;
      ctx.fillText(value.toString(), padding.left - 30, y + 4);
    }

    // 绘制X轴标签
    const labels = this.getTimeRangeLabels();
    const stepX = (width - padding.left - padding.right) / (labels.length - 1);
    labels.forEach((label, index) => {
      const x = padding.left + stepX * index;
      ctx.fillText(label, x - 15, height - padding.bottom + 20);
    });
  };

  // 绘制折线图
  drawLineChart = (ctx: any, width: number, height: number, padding: any) => {
    const { data, fortuneTypes } = this.props;
    if (!data || data.length === 0 || !fortuneTypes) return;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const stepX = chartWidth / (data.length - 1);

    fortuneTypes.forEach(fortuneType => {
      const config = this.getFortuneTypeConfig(fortuneType);
      ctx.setStrokeStyle(config.color);
      ctx.setLineWidth(3);

      ctx.beginPath();

      data.forEach((item, index) => {
        const fortune = item.fortunes.find(f => f.type === fortuneType);
        const score = fortune ? fortune.score : fortuneType === 'overall' ? item.overallScore : 0;

        const x = padding.left + stepX * index;
        const y = height - padding.bottom - (score / 100) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // 绘制数据点
      ctx.setFillStyle(config.color);
      data.forEach((item, index) => {
        const fortune = item.fortunes.find(f => f.type === fortuneType);
        const score = fortune ? fortune.score : fortuneType === 'overall' ? item.overallScore : 0;

        const x = padding.left + stepX * index;
        const y = height - padding.bottom - (score / 100) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  // 绘制雷达图
  drawRadarChart = (ctx: any, width: number, height: number) => {
    const { data, fortuneTypes } = this.props;
    if (!data || data.length === 0 || !fortuneTypes) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;
    const angleStep = (2 * Math.PI) / fortuneTypes.length;

    // 绘制雷达网格
    ctx.setStrokeStyle('#f0f0f0');
    ctx.setLineWidth(1);

    for (let i = 1; i <= 5; i++) {
      const r = (radius / 5) * i;
      ctx.beginPath();

      fortuneTypes.forEach((_, index) => {
        const angle = angleStep * index - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.stroke();
    }

    // 绘制轴线
    fortuneTypes.forEach((fortuneType, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // 绘制标签
      const config = this.getFortuneTypeConfig(fortuneType);
      const labelX = centerX + Math.cos(angle) * (radius + 20);
      const labelY = centerY + Math.sin(angle) * (radius + 20);

      ctx.setFillStyle('#333');
      ctx.setFontSize(12);
      ctx.fillText(config.name, labelX - 10, labelY + 4);
    });

    // 绘制数据（取最新一天的数据）
    if (data.length > 0) {
      const latestData = data[data.length - 1];

      ctx.setStrokeStyle('#9b59b6');
      ctx.setFillStyle('rgba(155, 89, 182, 0.2)');
      ctx.setLineWidth(2);

      ctx.beginPath();

      fortuneTypes.forEach((fortuneType, index) => {
        const fortune = latestData.fortunes.find(f => f.type === fortuneType);
        const score = fortune
          ? fortune.score
          : fortuneType === 'overall'
            ? latestData.overallScore
            : 0;

        const angle = angleStep * index - Math.PI / 2;
        const r = (score / 100) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 绘制数据点
      fortuneTypes.forEach((fortuneType, index) => {
        const fortune = latestData.fortunes.find(f => f.type === fortuneType);
        const score = fortune
          ? fortune.score
          : fortuneType === 'overall'
            ? latestData.overallScore
            : 0;

        const angle = angleStep * index - Math.PI / 2;
        const r = (score / 100) * radius;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        ctx.setFillStyle('#9b59b6');
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  };

  // 绘制柱状图
  drawBarChart = (ctx: any, width: number, height: number, padding: any) => {
    const { data, fortuneTypes } = this.props;
    if (!data || data.length === 0 || !fortuneTypes) return;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barGroupWidth = chartWidth / data.length;
    const barWidth = (barGroupWidth / fortuneTypes.length) * 0.8;
    const barSpacing = (barGroupWidth / fortuneTypes.length) * 0.2;

    data.forEach((item, dataIndex) => {
      fortuneTypes.forEach((fortuneType, typeIndex) => {
        const fortune = item.fortunes.find(f => f.type === fortuneType);
        const score = fortune ? fortune.score : fortuneType === 'overall' ? item.overallScore : 0;

        const config = this.getFortuneTypeConfig(fortuneType);
        const x = padding.left + dataIndex * barGroupWidth + typeIndex * (barWidth + barSpacing);
        const barHeight = (score / 100) * chartHeight;
        const y = height - padding.bottom - barHeight;

        ctx.setFillStyle(config.color);
        ctx.fillRect(x, y, barWidth, barHeight);
      });
    });
  };

  // 绘制趋势线
  drawTrendLine = (ctx: any, width: number, height: number, padding: any) => {
    if (!this.props.showTrend) return;

    const { data } = this.props;
    if (!data || data.length < 2) return;

    // 计算综合评分的趋势线
    const scores = data.map(item => item.overallScore);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const stepX = chartWidth / (data.length - 1);

    // 简单线性回归
    const n = scores.length;
    const sumX = scores.reduce((sum, _, index) => sum + index, 0);
    const sumY = scores.reduce((sum, score) => sum + score, 0);
    const sumXY = scores.reduce((sum, score, index) => sum + index * score, 0);
    const sumXX = scores.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    ctx.setStrokeStyle('rgba(155, 89, 182, 0.6)');
    ctx.setLineWidth(2);
    ctx.setLineDash([5, 5]);

    ctx.beginPath();

    data.forEach((_, index) => {
      const trendScore = slope * index + intercept;
      const x = padding.left + stepX * index;
      const y = height - padding.bottom - (trendScore / 100) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);
  };

  // 绘制图表
  drawChart = () => {
    const { canvasContext, canvasSize } = this.state;
    const { type } = this.props;

    if (!canvasContext) return;

    const { width, height } = canvasSize;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };

    // 清空画布
    canvasContext.clearRect(0, 0, width, height);

    // 绘制背景
    canvasContext.setFillStyle('#ffffff');
    canvasContext.fillRect(0, 0, width, height);

    // 绘制网格
    this.drawGrid(canvasContext, width, height, padding);

    // 根据类型绘制图表
    switch (type) {
      case 'line':
        this.drawAxes(canvasContext, width, height, padding);
        this.drawLineChart(canvasContext, width, height, padding);
        this.drawTrendLine(canvasContext, width, height, padding);
        break;
      case 'radar':
        this.drawRadarChart(canvasContext, width, height);
        break;
      case 'bar':
        this.drawAxes(canvasContext, width, height, padding);
        this.drawBarChart(canvasContext, width, height, padding);
        break;
      case 'trend':
        this.drawAxes(canvasContext, width, height, padding);
        this.drawLineChart(canvasContext, width, height, padding);
        this.drawTrendLine(canvasContext, width, height, padding);
        break;
    }

    canvasContext.draw();
  };

  // 处理画布点击
  handleCanvasClick = (e: any) => {
    if (!this.props.interactive) return;

    const { canvasSize } = this.state;
    const { data, fortuneTypes, onDataPointClick } = this.props;

    if (!data || !fortuneTypes || !onDataPointClick) return;

    const { x, y } = e.detail;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = canvasSize.width - padding.left - padding.right;
    const chartHeight = canvasSize.height - padding.top - padding.bottom;
    const stepX = chartWidth / (data.length - 1);

    // 查找最近的数据点
    let minDistance = Infinity;
    let selectedPoint: any = null;

    data.forEach((item, dataIndex) => {
      fortuneTypes.forEach(fortuneType => {
        const fortune = item.fortunes.find(f => f.type === fortuneType);
        const score = fortune ? fortune.score : fortuneType === 'overall' ? item.overallScore : 0;

        const pointX = padding.left + stepX * dataIndex;
        const pointY = canvasSize.height - padding.bottom - (score / 100) * chartHeight;

        const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));

        if (distance < minDistance && distance < 20) {
          minDistance = distance;
          selectedPoint = {
            data: item,
            fortuneType,
            position: { x: pointX, y: pointY },
          };
        }
      });
    });

    if (selectedPoint) {
      this.setState({ selectedDataPoint: selectedPoint });
      onDataPointClick(selectedPoint.data, selectedPoint.fortuneType);
    }
  };

  // 处理时间范围切换
  handleTimeRangeChange = (range: 'week' | 'month' | 'year') => {
    const { onTimeRangeChange } = this.props;
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
  };

  // 渲染图例
  renderLegend = () => {
    const { fortuneTypes } = this.props;
    if (!fortuneTypes) return null;

    return (
      <View className="fortune-chart__legend">
        {fortuneTypes.map(fortuneType => {
          const config = this.getFortuneTypeConfig(fortuneType);
          return (
            <View key={fortuneType} className="fortune-chart__legend-item">
              <View
                className="fortune-chart__legend-color"
                style={{ backgroundColor: config.color }}
              />
              <Text className="fortune-chart__legend-text">{config.name}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // 渲染工具栏
  renderToolbar = () => {
    const { timeRange, type } = this.props;

    const timeRangeOptions = [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' },
    ];

    const chartTypeOptions = [
      { value: 'line', icon: 'analytics' },
      { value: 'radar', icon: 'radio-button-on' },
      { value: 'bar', icon: 'equalizer' },
      { value: 'trend', icon: 'trending-up' },
    ];

    return (
      <View className="fortune-chart__toolbar">
        <View className="fortune-chart__time-range">
          {timeRangeOptions.map(option => (
            <AtButton
              key={option.value}
              size="small"
              type={timeRange === option.value ? 'primary' : 'secondary'}
              onClick={() => this.handleTimeRangeChange(option.value as any)}
            >
              {option.label}
            </AtButton>
          ))}
        </View>

        <View className="fortune-chart__chart-types">
          {chartTypeOptions.map(option => (
            <View
              key={option.value}
              className={`fortune-chart__chart-type ${
                type === option.value ? 'fortune-chart__chart-type--active' : ''
              }`}
            >
              <AtIcon value={option.icon} size="20" />
            </View>
          ))}
        </View>
      </View>
    );
  };

  render() {
    const { className, height } = this.props;
    const { loading } = this.state;

    const chartClasses = ['fortune-chart', className || ''].filter(Boolean).join(' ');

    if (loading) {
      return (
        <View className={chartClasses}>
          <View className="fortune-chart__loading">
            <AtIcon value="loading-3" size="32" />
            <Text className="fortune-chart__loading-text">加载中...</Text>
          </View>
        </View>
      );
    }

    return (
      <View className={chartClasses}>
        {this.renderToolbar()}

        <View className="fortune-chart__container">
          <Canvas
            id={this.canvasId}
            canvasId={this.canvasId}
            className="fortune-chart__canvas"
            style={{ height: `${height}px` }}
            onClick={this.handleCanvasClick}
          />

          {this.renderLegend()}
        </View>
      </View>
    );
  }
}
