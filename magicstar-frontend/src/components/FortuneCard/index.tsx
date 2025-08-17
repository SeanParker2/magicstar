import { Component } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { AtTag, AtProgress, AtIcon } from 'taro-ui';
import './index.css';

export interface FortuneData {
  /** 运势类型 */
  type: 'love' | 'career' | 'wealth' | 'health' | 'study' | 'overall';
  /** 运势标题 */
  title: string;
  /** 运势描述 */
  description: string;
  /** 运势评分 (0-100) */
  score: number;
  /** 运势等级 */
  level: 'excellent' | 'good' | 'normal' | 'poor' | 'bad';
  /** 幸运色彩 */
  luckyColor?: string;
  /** 幸运数字 */
  luckyNumber?: number[];
  /** 建议 */
  advice?: string;
  /** 关键词 */
  keywords?: string[];
  /** 图标 */
  icon?: string;
  /** 日期 */
  date?: string;
}

export interface FortuneCardProps {
  /** 运势数据 */
  fortune: FortuneData;
  /** 卡片尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 显示模式 */
  mode?: 'simple' | 'detailed' | 'compact';
  /** 是否显示评分 */
  showScore?: boolean;
  /** 是否显示建议 */
  showAdvice?: boolean;
  /** 是否显示幸运元素 */
  showLucky?: boolean;
  /** 是否显示关键词 */
  showKeywords?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 点击回调 */
  onClick?: (fortune: FortuneData) => void;
  /** 自定义样式类名 */
  className?: string;
}

export interface FortuneCardState {
  /** 是否展开详情 */
  expanded: boolean;
  /** 动画状态 */
  animating: boolean;
}

export default class FortuneCard extends Component<FortuneCardProps, FortuneCardState> {
  static defaultProps: Partial<FortuneCardProps> = {
    size: 'medium',
    mode: 'detailed',
    showScore: true,
    showAdvice: true,
    showLucky: true,
    showKeywords: true,
    clickable: false,
  };

  constructor(props: FortuneCardProps) {
    super(props);
    this.state = {
      expanded: false,
      animating: false,
    };
  }

  // 获取运势类型配置
  getFortuneTypeConfig = (type: FortuneData['type']) => {
    const configs = {
      love: {
        name: '爱情运势',
        icon: 'heart',
        color: '#ff6b9d',
        gradient: 'linear-gradient(135deg, #ff6b9d, #c44569)',
      },
      career: {
        name: '事业运势',
        icon: 'briefcase',
        color: '#4834d4',
        gradient: 'linear-gradient(135deg, #4834d4, #686de0)',
      },
      wealth: {
        name: '财富运势',
        icon: 'credit-card',
        color: '#f39c12',
        gradient: 'linear-gradient(135deg, #f39c12, #e67e22)',
      },
      health: {
        name: '健康运势',
        icon: 'heart-2',
        color: '#27ae60',
        gradient: 'linear-gradient(135deg, #27ae60, #2ecc71)',
      },
      study: {
        name: '学业运势',
        icon: 'bookmark',
        color: '#3498db',
        gradient: 'linear-gradient(135deg, #3498db, #74b9ff)',
      },
      overall: {
        name: '综合运势',
        icon: 'star',
        color: '#9b59b6',
        gradient: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
      },
    };
    return configs[type];
  };

  // 获取运势等级配置
  getLevelConfig = (level: FortuneData['level']) => {
    const configs = {
      excellent: {
        name: '极佳',
        color: '#27ae60',
        bgColor: '#d5f4e6',
      },
      good: {
        name: '良好',
        color: '#3498db',
        bgColor: '#d6eaf8',
      },
      normal: {
        name: '一般',
        color: '#f39c12',
        bgColor: '#fdeaa7',
      },
      poor: {
        name: '较差',
        color: '#e67e22',
        bgColor: '#ffeaa7',
      },
      bad: {
        name: '很差',
        color: '#e74c3c',
        bgColor: '#fab1a0',
      },
    };
    return configs[level];
  };

  // 获取评分颜色
  getScoreColor = (score: number): string => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#3498db';
    if (score >= 40) return '#f39c12';
    if (score >= 20) return '#e67e22';
    return '#e74c3c';
  };

  // 处理卡片点击
  handleCardClick = () => {
    const { clickable, onClick, fortune } = this.props;

    if (clickable && onClick) {
      onClick(fortune);
    } else if (this.props.mode === 'compact') {
      this.toggleExpanded();
    }
  };

  // 切换展开状态
  toggleExpanded = () => {
    this.setState(prevState => ({
      expanded: !prevState.expanded,
      animating: true,
    }));

    setTimeout(() => {
      this.setState({ animating: false });
    }, 300);
  };

  // 格式化日期
  formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '明日';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  render() {
    const {
      fortune,
      size,
      mode,
      showScore,
      showAdvice,
      showLucky,
      showKeywords,
      clickable,
      className,
    } = this.props;

    const { expanded, animating } = this.state;

    const typeConfig = this.getFortuneTypeConfig(fortune.type);
    const levelConfig = this.getLevelConfig(fortune.level);
    const scoreColor = this.getScoreColor(fortune.score);

    const cardClasses = [
      'fortune-card',
      `fortune-card--${size}`,
      `fortune-card--${mode}`,
      `fortune-card--${fortune.type}`,
      clickable ? 'fortune-card--clickable' : '',
      expanded ? 'fortune-card--expanded' : '',
      animating ? 'fortune-card--animating' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    // 简单模式
    if (mode === 'simple') {
      return (
        <View className={cardClasses} onClick={this.handleCardClick}>
          <View className="fortune-card__header fortune-card__header--simple">
            <View className="fortune-card__icon-container">
              <AtIcon value={typeConfig.icon} size="20" color={typeConfig.color} />
            </View>
            <View className="fortune-card__title-section">
              <Text className="fortune-card__type">{typeConfig.name}</Text>
              {fortune.date && (
                <Text className="fortune-card__date">{this.formatDate(fortune.date)}</Text>
              )}
            </View>
            <View className="fortune-card__level-tag">
              <AtTag
                type="primary"
                size="small"
                customStyle={{
                  background: levelConfig.bgColor,
                  color: levelConfig.color,
                  border: 'none',
                }}
              >
                {levelConfig.name}
              </AtTag>
            </View>
          </View>

          {showScore && (
            <View className="fortune-card__score-simple">
              <AtProgress
                percent={fortune.score}
                strokeWidth={6}
                color={scoreColor}
                isHidePercent={false}
              />
            </View>
          )}
        </View>
      );
    }

    // 紧凑模式
    if (mode === 'compact') {
      return (
        <View className={cardClasses} onClick={this.handleCardClick}>
          <View className="fortune-card__compact-header">
            <View className="fortune-card__icon-container">
              <AtIcon value={typeConfig.icon} size="24" color={typeConfig.color} />
            </View>
            <View className="fortune-card__compact-info">
              <Text className="fortune-card__type">{typeConfig.name}</Text>
              <Text className="fortune-card__title">{fortune.title}</Text>
            </View>
            <View className="fortune-card__compact-score">
              <Text className="fortune-card__score-number" style={{ color: scoreColor }}>
                {fortune.score}
              </Text>
              <AtIcon value={expanded ? 'chevron-up' : 'chevron-down'} size="16" color="#999" />
            </View>
          </View>

          {expanded && (
            <View className="fortune-card__expanded-content">
              <Text className="fortune-card__description">{fortune.description}</Text>

              {showAdvice && fortune.advice && (
                <View className="fortune-card__advice-section">
                  <Text className="fortune-card__advice-title">建议</Text>
                  <Text className="fortune-card__advice">{fortune.advice}</Text>
                </View>
              )}

              {showLucky && (fortune.luckyColor || fortune.luckyNumber) && (
                <View className="fortune-card__lucky-section">
                  {fortune.luckyColor && (
                    <View className="fortune-card__lucky-item">
                      <Text className="fortune-card__lucky-label">幸运色：</Text>
                      <View
                        className="fortune-card__lucky-color"
                        style={{ backgroundColor: fortune.luckyColor }}
                      />
                    </View>
                  )}

                  {fortune.luckyNumber && fortune.luckyNumber.length > 0 && (
                    <View className="fortune-card__lucky-item">
                      <Text className="fortune-card__lucky-label">幸运数字：</Text>
                      <Text className="fortune-card__lucky-numbers">
                        {fortune.luckyNumber.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      );
    }

    // 详细模式
    return (
      <View className={cardClasses} onClick={this.handleCardClick}>
        <View className="fortune-card__header" style={{ background: typeConfig.gradient }}>
          <View className="fortune-card__header-content">
            <View className="fortune-card__icon-container">
              {fortune.icon ? (
                <Image className="fortune-card__custom-icon" src={fortune.icon} mode="aspectFit" />
              ) : (
                <AtIcon value={typeConfig.icon} size="32" color="white" />
              )}
            </View>

            <View className="fortune-card__header-info">
              <Text className="fortune-card__type">{typeConfig.name}</Text>
              <Text className="fortune-card__title">{fortune.title}</Text>
              {fortune.date && (
                <Text className="fortune-card__date">{this.formatDate(fortune.date)}</Text>
              )}
            </View>

            <View className="fortune-card__level-container">
              <AtTag
                type="primary"
                size="small"
                customStyle={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {levelConfig.name}
              </AtTag>
            </View>
          </View>
        </View>

        <View className="fortune-card__body">
          {showScore && (
            <View className="fortune-card__score-section">
              <View className="fortune-card__score-info">
                <Text className="fortune-card__score-label">运势指数</Text>
                <Text
                  className="fortune-card__score-number fortune-card__score-number--large"
                  style={{ color: scoreColor }}
                >
                  {fortune.score}
                </Text>
              </View>
              <View className="fortune-card__score-progress">
                <AtProgress
                  percent={fortune.score}
                  strokeWidth={8}
                  color={scoreColor}
                  isHidePercent
                />
              </View>
            </View>
          )}

          <View className="fortune-card__description-section">
            <Text className="fortune-card__description">{fortune.description}</Text>
          </View>

          {showKeywords && fortune.keywords && fortune.keywords.length > 0 && (
            <View className="fortune-card__keywords-section">
              <Text className="fortune-card__keywords-title">关键词</Text>
              <View className="fortune-card__keywords">
                {fortune.keywords.map((keyword, index) => (
                  <AtTag
                    key={index}
                    type="primary"
                    size="small"
                    customStyle={{
                      background: typeConfig.color + '20',
                      color: typeConfig.color,
                      border: 'none',
                      margin: '2px',
                    }}
                  >
                    {keyword}
                  </AtTag>
                ))}
              </View>
            </View>
          )}

          {showLucky && (fortune.luckyColor || fortune.luckyNumber) && (
            <View className="fortune-card__lucky-section">
              <Text className="fortune-card__lucky-title">幸运元素</Text>
              <View className="fortune-card__lucky-content">
                {fortune.luckyColor && (
                  <View className="fortune-card__lucky-item">
                    <Text className="fortune-card__lucky-label">幸运色</Text>
                    <View className="fortune-card__lucky-color-container">
                      <View
                        className="fortune-card__lucky-color"
                        style={{ backgroundColor: fortune.luckyColor }}
                      />
                      <Text className="fortune-card__lucky-color-name">{fortune.luckyColor}</Text>
                    </View>
                  </View>
                )}

                {fortune.luckyNumber && fortune.luckyNumber.length > 0 && (
                  <View className="fortune-card__lucky-item">
                    <Text className="fortune-card__lucky-label">幸运数字</Text>
                    <View className="fortune-card__lucky-numbers-container">
                      {fortune.luckyNumber.map((number, index) => (
                        <View key={index} className="fortune-card__lucky-number">
                          <Text className="fortune-card__lucky-number-text">{number}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {showAdvice && fortune.advice && (
            <View className="fortune-card__advice-section">
              <Text className="fortune-card__advice-title">今日建议</Text>
              <Text className="fortune-card__advice">{fortune.advice}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }
}
