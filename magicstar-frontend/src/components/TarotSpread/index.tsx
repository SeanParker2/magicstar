import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import {
  TarotSpread as TarotSpreadType,
  TarotCard as TarotCardType,
} from '../../services/divination';
import TarotCard from '../TarotCard';
import './index.css';

interface DrawnCard {
  position: number;
  card: TarotCardType;
  isReversed: boolean;
  isFlipped?: boolean;
}

interface TarotSpreadProps {
  spread: TarotSpreadType;
  drawnCards?: DrawnCard[];
  onPositionClick?: (position: number) => void;
  showPositionNames?: boolean;
  showCardMeanings?: boolean;
  interactive?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface TarotSpreadState {
  selectedPosition: number | null;
}

export default class TarotSpread extends Component<TarotSpreadProps, TarotSpreadState> {
  static defaultProps = {
    showPositionNames: true,
    showCardMeanings: false,
    interactive: true,
    size: 'medium',
  };

  constructor(props: TarotSpreadProps) {
    super(props);
    this.state = {
      selectedPosition: null,
    };
  }

  handlePositionClick = (position: number) => {
    const { onPositionClick, interactive } = this.props;
    if (!interactive) return;

    this.setState({ selectedPosition: position });
    if (onPositionClick) {
      onPositionClick(position);
    }
  };

  getCardAtPosition = (position: number): DrawnCard | null => {
    const { drawnCards } = this.props;
    return drawnCards?.find(card => card.position === position) || null;
  };

  getPositionConfig = (position: number) => {
    const { spread } = this.props;
    return spread.positionsConfig.find(config => config.position === position);
  };

  renderPosition = (position: number, _index: number) => {
    const { showPositionNames, showCardMeanings, size, interactive } = this.props;
    const { selectedPosition } = this.state;
    const drawnCard = this.getCardAtPosition(position);
    const positionConfig = this.getPositionConfig(position);
    const isSelected = selectedPosition === position;

    const positionClasses = [
      'tarot-spread__position',
      `tarot-spread__position--${position}`,
      isSelected ? 'tarot-spread__position--selected' : '',
      drawnCard ? 'tarot-spread__position--filled' : 'tarot-spread__position--empty',
      interactive ? 'tarot-spread__position--interactive' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <View
        key={position}
        className={positionClasses}
        onClick={() => this.handlePositionClick(position)}
      >
        {drawnCard ? (
          <TarotCard
            card={drawnCard.card}
            isReversed={drawnCard.isReversed}
            isFlipped={drawnCard.isFlipped}
            showMeaning={showCardMeanings}
            size={size}
          />
        ) : (
          <View className="tarot-spread__placeholder">
            <Text className="tarot-spread__position-number">{position}</Text>
          </View>
        )}

        {showPositionNames && positionConfig && (
          <View className="tarot-spread__position-info">
            <Text className="tarot-spread__position-name">{positionConfig.name}</Text>
            <Text className="tarot-spread__position-meaning">{positionConfig.meaning}</Text>
          </View>
        )}
      </View>
    );
  };

  getSpreadLayoutClass = () => {
    const { spread } = this.props;
    const cardCount = spread.cardCount;

    // 根据卡牌数量返回不同的布局类名
    if (cardCount === 1) return 'tarot-spread__layout--single';
    if (cardCount === 3) return 'tarot-spread__layout--three-card';
    if (cardCount === 5) return 'tarot-spread__layout--five-card';
    if (cardCount === 7) return 'tarot-spread__layout--seven-card';
    if (cardCount === 10) return 'tarot-spread__layout--celtic-cross';

    return 'tarot-spread__layout--default';
  };

  render() {
    const { spread, className, size } = this.props;

    const spreadClasses = [
      'tarot-spread',
      `tarot-spread--${size}`,
      this.getSpreadLayoutClass(),
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <View className={spreadClasses}>
        <View className="tarot-spread__header">
          <Text className="tarot-spread__name">{spread.nameCn}</Text>
          <Text className="tarot-spread__name-en">{spread.name}</Text>
          <Text className="tarot-spread__description">{spread.description}</Text>

          <View className="tarot-spread__meta">
            <View className="tarot-spread__difficulty">
              <Text className="tarot-spread__difficulty-text">
                难度:{' '}
                {spread.difficulty === 'beginner'
                  ? '初级'
                  : spread.difficulty === 'intermediate'
                    ? '中级'
                    : '高级'}
              </Text>
            </View>
            <View className="tarot-spread__card-count">
              <Text className="tarot-spread__card-count-text">{spread.cardCount} 张牌</Text>
            </View>
          </View>
        </View>

        <View className="tarot-spread__layout">
          {spread.positionsConfig
            .sort((a, b) => a.position - b.position)
            .map((config, index) => this.renderPosition(config.position, index))}
        </View>

        {spread.instructions && (
          <View className="tarot-spread__instructions">
            <Text className="tarot-spread__instructions-title">使用说明</Text>
            <Text className="tarot-spread__instructions-text">{spread.instructions}</Text>
          </View>
        )}
      </View>
    );
  }
}
