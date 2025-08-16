import { View, Text, Button, Textarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { aiService, InterpretationResult, QualityAssessment } from '../../services/ai';
import './index.scss';

interface AiInterpretationProps {
  type: 'tarot' | 'astrology' | 'numerology';
  data: any;
  onInterpretationGenerated?: (result: InterpretationResult) => void;
  className?: string;
}

const AiInterpretation = ({
  type,
  data,
  onInterpretationGenerated,
  className = '',
}: AiInterpretationProps) => {
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [quality, setQuality] = useState<QualityAssessment | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comment: '',
    helpful: true,
  });
  const [options] = useState({
    style: 'professional' as 'professional' | 'casual' | 'mystical',
    length: 'detailed' as 'brief' | 'detailed' | 'comprehensive',
    language: 'zh' as 'zh' | 'en',
  });

  useEffect(() => {
    if (data) {
      generateInterpretation();
    }
  }, [data]);

  const generateInterpretation = async () => {
    try {
      setLoading(true);
      const result = await aiService.generateInterpretation({
        type,
        data,
        options,
      });
      setInterpretation(result);
      onInterpretationGenerated?.(result);
    } catch (error) {
      console.error('生成AI解读失败:', error);
      Taro.showToast({
        title: '生成解读失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!interpretation) return;

    try {
      setRegenerating(true);
      const result = await aiService.regenerateInterpretation(interpretation.id, options);
      setInterpretation(result);
      onInterpretationGenerated?.(result);
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
      setRegenerating(false);
    }
  };

  const handleAssessQuality = async () => {
    if (!interpretation) return;

    try {
      const assessment = await aiService.assessQuality(interpretation.id);
      setQuality(assessment);
    } catch (error) {
      console.error('质量评估失败:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!interpretation) return;

    try {
      await aiService.submitFeedback(interpretation.id, feedback);
      setShowFeedback(false);
      Taro.showToast({
        title: '反馈提交成功',
        icon: 'success',
      });
    } catch (error) {
      console.error('提交反馈失败:', error);
      Taro.showToast({
        title: '提交反馈失败',
        icon: 'error',
      });
    }
  };

  const handleShare = () => {
    if (!interpretation) return;

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

  const getQualityColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#faad14';
    if (score >= 70) return '#fa8c16';
    return '#f5222d';
  };

  const getQualityText = (grade: string) => {
    const gradeMap = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差',
    };
    return gradeMap[grade] || grade;
  };

  if (loading) {
    return (
      <View className={`ai-interpretation loading ${className}`}>
        <View className="loading-container">
          <View className="spinner"></View>
          <Text className="loading-text">AI正在为您生成个性化解读...</Text>
        </View>
      </View>
    );
  }

  if (!interpretation) {
    return (
      <View className={`ai-interpretation error ${className}`}>
        <View className="error-container">
          <Text className="error-text">暂无AI解读</Text>
          <Button className="retry-btn" size="mini" type="primary" onClick={generateInterpretation}>
            重新生成
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className={`ai-interpretation ${className}`}>
      {/* 解读头部 */}
      <View className="interpretation-header">
        <View className="title-section">
          <Text className="title">AI个性化解读</Text>
          {quality && (
            <View className="quality-badge">
              <Text className="quality-score" style={{ color: getQualityColor(quality.score) }}>
                {quality.score}分
              </Text>
              <Text className="quality-grade">{getQualityText(quality.grade)}</Text>
            </View>
          )}
        </View>

        <View className="action-buttons">
          <Button
            className="action-btn"
            size="mini"
            loading={regenerating}
            onClick={handleRegenerate}
          >
            {regenerating ? '生成中...' : '重新生成'}
          </Button>
          <Button className="action-btn" size="mini" onClick={handleAssessQuality}>
            质量评估
          </Button>
        </View>
      </View>

      {/* 解读内容 */}
      <View className="interpretation-content">
        {/* 摘要 */}
        <View className="summary-section">
          <Text className="section-title">核心要点</Text>
          <Text className="summary-text">{interpretation.summary}</Text>
        </View>

        {/* 详细解读 */}
        <View className="content-section">
          <Text className="section-title">详细解读</Text>
          <Text className="content-text">{interpretation.content}</Text>
        </View>

        {/* 建议 */}
        {interpretation.advice && (
          <View className="advice-section">
            <Text className="section-title">个性化建议</Text>
            <Text className="advice-text">{interpretation.advice}</Text>
          </View>
        )}
      </View>

      {/* 质量评估结果 */}
      {quality && (
        <View className="quality-section">
          <Text className="section-title">质量评估</Text>
          <View className="quality-metrics">
            <View className="metric-item">
              <Text className="metric-label">相关性</Text>
              <Text className="metric-value">{quality.metrics.relevance}%</Text>
            </View>
            <View className="metric-item">
              <Text className="metric-label">清晰度</Text>
              <Text className="metric-value">{quality.metrics.clarity}%</Text>
            </View>
            <View className="metric-item">
              <Text className="metric-label">深度</Text>
              <Text className="metric-value">{quality.metrics.depth}%</Text>
            </View>
            <View className="metric-item">
              <Text className="metric-label">准确性</Text>
              <Text className="metric-value">{quality.metrics.accuracy}%</Text>
            </View>
          </View>
          {quality.feedback && <Text className="quality-feedback">{quality.feedback}</Text>}
        </View>
      )}

      {/* 操作区域 */}
      <View className="action-section">
        <Button className="share-btn" size="mini" onClick={handleShare}>
          分享解读
        </Button>
        <Button className="feedback-btn" size="mini" onClick={() => setShowFeedback(true)}>
          提供反馈
        </Button>
      </View>

      {/* 反馈弹窗 */}
      {showFeedback && (
        <View className="feedback-modal">
          <View className="modal-content">
            <View className="modal-header">
              <Text className="modal-title">解读反馈</Text>
              <Button className="close-btn" size="mini" onClick={() => setShowFeedback(false)}>
                关闭
              </Button>
            </View>

            <View className="feedback-form">
              <View className="rating-section">
                <Text className="form-label">评分</Text>
                <View className="rating-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Text
                      key={star}
                      className={`star ${star <= feedback.rating ? 'active' : ''}`}
                      onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                    >
                      ★
                    </Text>
                  ))}
                </View>
              </View>

              <View className="comment-section">
                <Text className="form-label">评价</Text>
                <Textarea
                  className="comment-input"
                  placeholder="请分享您的使用体验..."
                  value={feedback.comment}
                  onInput={e => setFeedback(prev => ({ ...prev, comment: e.detail.value }))}
                />
              </View>

              <View className="helpful-section">
                <Text className="form-label">这个解读对您有帮助吗？</Text>
                <View className="helpful-options">
                  <Button
                    className={`helpful-btn ${feedback.helpful ? 'active' : ''}`}
                    size="mini"
                    onClick={() => setFeedback(prev => ({ ...prev, helpful: true }))}
                  >
                    有帮助
                  </Button>
                  <Button
                    className={`helpful-btn ${!feedback.helpful ? 'active' : ''}`}
                    size="mini"
                    onClick={() => setFeedback(prev => ({ ...prev, helpful: false }))}
                  >
                    没帮助
                  </Button>
                </View>
              </View>

              <Button className="submit-btn" type="primary" onClick={handleSubmitFeedback}>
                提交反馈
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 元数据信息 */}
      <View className="metadata-section">
        <Text className="metadata-text">
          生成时间: {new Date(interpretation.createdAt).toLocaleString()}
        </Text>
        <Text className="metadata-text">处理时间: {interpretation.metadata.processingTime}ms</Text>
        <Text className="metadata-text">使用模型: {interpretation.metadata.modelUsed}</Text>
      </View>
    </View>
  );
};

export default AiInterpretation;
