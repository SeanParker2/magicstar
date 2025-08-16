import { View, Text, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { tarotService, TarotCard } from '../../../services/tarot';
import './index.scss';

interface Card extends TarotCard {
  isReversed: boolean;
  isFlipped: boolean;
  position: number;
}

const TarotDraw = () => {
  const router = useRouter();
  const { spreadId, cardCount, spreadName } = router.params;
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: 准备, 1: 抽牌, 2: 完成
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const cardsData = await tarotService.getCards();
      const shuffledCards = cardsData
        .filter(card => card.active)
        .map(card => ({
          ...card,
          isReversed: Math.random() > 0.5,
          isFlipped: false,
          position: 0,
        }))
        .sort(() => Math.random() - 0.5); // 随机打乱
      setCards(shuffledCards);
    } catch (error) {
      console.error('加载塔罗牌失败:', error);
      Taro.showToast({
        title: '加载塔罗牌失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardIndex: number) => {
    if (isDrawing || selectedCards.length >= parseInt(cardCount || '1')) return;

    const newCards = [...cards];
    const selectedCard = { ...newCards[cardIndex] };
    selectedCard.isFlipped = true;
    selectedCard.position = selectedCards.length + 1;

    setSelectedCards([...selectedCards, selectedCard]);
    setCards(newCards.filter((_, index) => index !== cardIndex));

    // 如果抽够了牌，开始占卜
    if (selectedCards.length + 1 >= parseInt(cardCount || '1')) {
      setTimeout(() => {
        startDivination();
      }, 1000);
    }
  };

  const startDivination = async () => {
    setIsDrawing(true);
    setCurrentStep(2);

    try {
      Taro.showLoading({ title: '正在解读...' });

      // 调用真实的占卜API
      const result = await tarotService.performDivination({
        question: question.trim(),
        spreadId: parseInt(spreadId || '1'),
      });

      Taro.hideLoading();

      // 跳转到结果页面，传递占卜结果ID
      Taro.redirectTo({
        url: `/pages/tarot/result/index?resultId=${result.id}`,
      });
    } catch (error) {
      Taro.hideLoading();
      console.error('占卜失败:', error);
      Taro.showToast({
        title: '占卜失败，请重试',
        icon: 'error',
      });
      setIsDrawing(false);
      setCurrentStep(1);
    }
  };

  const handleStartDraw = () => {
    if (!question.trim()) {
      Taro.showToast({
        title: '请先输入你的问题',
        icon: 'none',
      });
      return;
    }
    setCurrentStep(1);
  };

  const renderPrepareStep = () => (
    <View className="prepare-step">
      <View className="question-section">
        <Text className="question-label">请输入你想要占卜的问题：</Text>
        <View className="question-input">
          <input
            className="input"
            placeholder="例如：我的感情运势如何？"
            value={question}
            onInput={(e: any) => setQuestion(e.detail.value)}
            maxLength={100}
          />
        </View>
      </View>

      <View className="instructions">
        <Text className="instruction-title">占卜指引</Text>
        <Text className="instruction-text">1. 静心思考你的问题</Text>
        <Text className="instruction-text">2. 从下方牌堆中选择{cardCount}张牌</Text>
        <Text className="instruction-text">3. 相信你的直觉，选择最有感觉的牌</Text>
      </View>

      <View className="start-button" onClick={handleStartDraw}>
        <Text className="start-text">开始抽牌</Text>
      </View>
    </View>
  );

  const renderDrawStep = () => (
    <View className="draw-step">
      <View className="progress">
        <Text className="progress-text">
          已选择 {selectedCards.length}/{cardCount} 张牌
        </Text>
      </View>

      <View className="selected-cards">
        {selectedCards.map((card, index) => (
          <View key={card.id} className={`selected-card card-${index + 1}`}>
            <View className={`card ${card.isFlipped ? 'flipped' : ''}`}>
              <View className="card-front">
                <Image className="card-image" src={card.imageUrl} />
              </View>
              <View className="card-back">
                <Text className="card-name">{card.nameCn}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className="card-deck">
        <Text className="deck-hint">请选择你的塔罗牌</Text>
        <View className="cards-grid">
          {cards.slice(0, 21).map((card, index) => (
            <View key={card.id} className="deck-card" onClick={() => handleCardSelect(index)}>
              <View className="card-back-image"></View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View className="complete-step">
      <View className="loading-animation">
        <View className="crystal"></View>
        <Text className="loading-text">正在解读你的塔罗牌...</Text>
      </View>
    </View>
  );

  return (
    <View className="tarot-draw">
      <View className="header">
        <Text className="title">塔罗牌占卜</Text>
        <Text className="subtitle">
          {decodeURIComponent(spreadName || '')} - {cardCount}张牌
        </Text>
      </View>

      <View className="content">
        {loading ? (
          <View className="loading">
            <Text>加载中...</Text>
          </View>
        ) : (
          <>
            {currentStep === 0 && renderPrepareStep()}
            {currentStep === 1 && renderDrawStep()}
            {currentStep === 2 && renderCompleteStep()}
          </>
        )}
      </View>
    </View>
  );
};

export default TarotDraw;
