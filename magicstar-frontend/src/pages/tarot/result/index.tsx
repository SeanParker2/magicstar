import { View, Text, Image, Button } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { tarotService, DivinationResult } from '../../../services/tarot';
import AiInterpretation from '../../../components/AiInterpretation';
import { InterpretationResult } from '../../../services/ai';
import './index.scss';

const TarotResult = () => {
  const router = useRouter();
  const { resultId } = router.params;
  const [result, setResult] = useState<DivinationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, details, advice, ai
  const [_aiInterpretation, setAiInterpretation] = useState<InterpretationResult | null>(null);

  useEffect(() => {
    if (resultId) {
      loadTarotResult();
    }
  }, [resultId]);

  const loadTarotResult = async () => {
    try {
      setLoading(true);
      const data = await tarotService.getRecordDetail(parseInt(resultId || '0'));
      setResult(data);
    } catch (error) {
      console.error('加载结果失败:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;

    try {
      const shareData = await tarotService.shareResult({
        recordId: result.id,
        platform: 'wechat',
      });

      Taro.showActionSheet({
        itemList: ['分享到微信', '分享到朋友圈', '复制链接'],
        success: res => {
          switch (res.tapIndex) {
            case 0:
              // 分享到微信
              Taro.showToast({ title: '分享到微信', icon: 'success' });
              break;
            case 1:
              // 分享到朋友圈
              Taro.showToast({ title: '分享到朋友圈', icon: 'success' });
              break;
            case 2:
              // 复制链接
              Taro.setClipboardData({
                data: shareData.shareUrl || `我的塔罗牌占卜结果：${result.interpretation.summary}`,
                success: () => {
                  Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
                },
              });
              break;
          }
        },
      });
    } catch (error) {
      console.error('分享失败:', error);
      // 降级处理
      Taro.setClipboardData({
        data: `我的塔罗牌占卜结果：${result.interpretation.summary}`,
        success: () => {
          Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
        },
      });
    }
  };

  const handleSaveToHistory = () => {
    Taro.showToast({
      title: '已保存到历史记录',
      icon: 'success',
    });
  };

  const handleNewReading = () => {
    Taro.navigateBack({
      delta: 2,
    });
  };

  if (loading) {
    return (
      <View className="tarot-result loading">
        <View className="loading-container">
          <View className="spinner"></View>
          <Text className="loading-text">正在生成占卜结果...</Text>
        </View>
      </View>
    );
  }

  if (!result) {
    return (
      <View className="tarot-result error">
        <Text className="error-text">加载失败，请重试</Text>
      </View>
    );
  }

  return (
    <View className="tarot-result">
      <View className="header">
        <Text className="title">占卜结果</Text>
        <Text className="question">问题：{result.question}</Text>
        <Text className="time">
          {result.divinationTime ? new Date(result.divinationTime).toLocaleString() : ''}
        </Text>
      </View>

      <View className="cards-display">
        {result.cardResults?.map((cardResult, _index) => (
          <View key={cardResult.cardId} className={`card-item position-${cardResult.position}`}>
            <View className={`card ${cardResult.isReversed ? 'reversed' : ''}`}>
              <Image
                className="card-image"
                src={cardResult.card.imageUrl || '/assets/images/tarot-back.jpg'}
                mode="aspectFit"
              />
              <View className="card-overlay">
                <Text className="card-name">{cardResult.card.nameCn || cardResult.card.name}</Text>
                <Text className="card-meaning">{cardResult.meaning || '暂无解释'}</Text>
              </View>
            </View>
            <Text className="position-label">位置 {cardResult.position}</Text>
          </View>
        )) || []}
      </View>

      <View className="tabs">
        <View
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Text className="tab-text">总览</Text>
        </View>
        <View
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <Text className="tab-text">详解</Text>
        </View>
        <View
          className={`tab ${activeTab === 'advice' ? 'active' : ''}`}
          onClick={() => setActiveTab('advice')}
        >
          <Text className="tab-text">建议</Text>
        </View>
        <View
          className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Text className="tab-text">AI解读</Text>
        </View>
      </View>

      <View className="content">
        {activeTab === 'overview' && (
          <View className="overview-content">
            <Text className="content-text">{result.interpretation.summary}</Text>
            <View className="summary-box">
              <Text className="summary-title">总结</Text>
              <Text className="summary-text">{result.interpretation.summary}</Text>
            </View>
          </View>
        )}

        {activeTab === 'details' && (
          <View className="details-content">
            <Text className="content-text">{result.interpretation.detailed}</Text>
            <View className="cards-meanings">
              {result.cardResults?.map((cardResult, _index) => (
                <View key={cardResult.cardId} className="card-meaning-item">
                  <Text className="card-title">
                    {cardResult.card.nameCn || cardResult.card.name}
                  </Text>
                  <Text className="card-description">{cardResult.meaning || '暂无解释'}</Text>
                </View>
              )) || []}
            </View>
          </View>
        )}

        {activeTab === 'advice' && (
          <View className="advice-content">
            <Text className="content-text">{result.interpretation.advice}</Text>
          </View>
        )}

        {activeTab === 'ai' && (
          <View className="ai-content">
            <AiInterpretation
              type="tarot"
              data={{
                question: result.question,
                spread: result.spread,
                cardResults: result.cardResults,
                interpretation: result.interpretation,
              }}
              onInterpretationGenerated={interpretation => {
                setAiInterpretation(interpretation);
              }}
              className="tarot-ai-interpretation"
            />
          </View>
        )}
      </View>

      <View className="actions">
        <Button className="action-btn secondary" onClick={handleSaveToHistory}>
          保存记录
        </Button>
        <Button className="action-btn secondary" onClick={handleShare}>
          分享结果
        </Button>
        <Button className="action-btn primary" onClick={handleNewReading}>
          重新占卜
        </Button>
      </View>
    </View>
  );
};

export default TarotResult;
