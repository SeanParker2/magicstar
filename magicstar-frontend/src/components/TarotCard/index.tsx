import { Component } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { TarotCard as TarotCardType } from '../../services/divination';
import './index.scss';

interface TarotCardProps {
  card: TarotCardType;
  isReversed?: boolean;
  isFlipped?: boolean;
  showMeaning?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: (card: TarotCardType) => void;
  className?: string;
}

interface TarotCardState {
  imageLoaded: boolean;
  imageError: boolean;
}

export default class TarotCard extends Component<TarotCardProps, TarotCardState> {
  static defaultProps = {
    isReversed: false,
    isFlipped: false,
    showMeaning: false,
    size: 'medium',
  };

  constructor(props: TarotCardProps) {
    super(props);
    this.state = {
      imageLoaded: false,
      imageError: false,
    };
  }

  handleImageLoad = () => {
    this.setState({ imageLoaded: true });
  };

  handleImageError = () => {
    this.setState({ imageError: true });
  };

  handleCardClick = () => {
    const { onClick, card } = this.props;
    if (onClick) {
      onClick(card);
    }
  };

  render() {
    const { card, isReversed, isFlipped, showMeaning, size, className } = this.props;
    const { imageLoaded, imageError } = this.state;

    const cardClasses = [
      'tarot-card',
      `tarot-card--${size}`,
      isReversed ? 'tarot-card--reversed' : '',
      isFlipped ? 'tarot-card--flipped' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <View className={cardClasses} onClick={this.handleCardClick}>
        <View className="tarot-card__inner">
          {/* 卡牌背面 */}
          <View className="tarot-card__back">
            <Image
              className="tarot-card__back-image"
              src="/assets/images/tarot-back.jpg"
              mode="aspectFit"
            />
          </View>

          {/* 卡牌正面 */}
          <View className="tarot-card__front">
            <View className="tarot-card__image-container">
              {!imageLoaded && !imageError && (
                <View className="tarot-card__loading">
                  <Text className="tarot-card__loading-text">加载中...</Text>
                </View>
              )}

              {imageError ? (
                <View className="tarot-card__error">
                  <Text className="tarot-card__error-text">图片加载失败</Text>
                </View>
              ) : (
                <Image
                  className="tarot-card__image"
                  src={card.imageUrl}
                  mode="aspectFit"
                  onLoad={this.handleImageLoad}
                  onError={this.handleImageError}
                />
              )}
            </View>

            <View className="tarot-card__info">
              <Text className="tarot-card__name">{card.nameCn}</Text>
              <Text className="tarot-card__name-en">{card.name}</Text>

              {showMeaning && (
                <View className="tarot-card__meaning">
                  <Text className="tarot-card__meaning-text">
                    {isReversed ? card.reversedMeaning : card.uprightMeaning}
                  </Text>
                  <View className="tarot-card__keywords">
                    {(isReversed ? card.reversedKeywords : card.uprightKeywords).map(
                      (keyword, index) => (
                        <Text key={index} className="tarot-card__keyword">
                          {keyword}
                        </Text>
                      )
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 逆位指示器 */}
        {isReversed && (
          <View className="tarot-card__reversed-indicator">
            <Text className="tarot-card__reversed-text">逆位</Text>
          </View>
        )}
      </View>
    );
  }
}
