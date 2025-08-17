import { View, Text, Button, Textarea, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import {
  aiService,
  InterpretationResult,
  QualityAssessment,
  OptimizationResult,
} from '../../../services/ai';
import './index.css';

const AiDetail = () => {
  const router = useRouter();
  const { id } = router.params;
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [quality, setQuality] = useState<QualityAssessment | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comment: '',
    helpful: true,
    tags: [] as string[],
  });
  const [regenerating, setRegenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const feedbackTags = [
    '准确',
    '有用',
    '详细',
    '清晰',
    '有启发性',
    '不够准确',
    '太简单',
    '太复杂',
    '不相关',
    '需要改进',
  ];

  useEffect(() => {
    if (id) {
      loadInterpretationDetail();
    }
  }, [id]);

  const loadInterpretationDetail = async () => {
    try {
      setLoading(true);
      // 这里应该调用获取单个解读详情的API
      // 暂时使用模拟数据
      const mockInterpretation: InterpretationResult = {
        id: id || '1',
        type: 'tarot',
        content:
          '根据您抽取的塔罗牌，我看到了一个充满变化和机遇的时期正在到来。愚者牌代表新的开始和无限的可能性，它提醒您要保持开放的心态，勇敢地踏出第一步。星币三代表合作和技能的发展，暗示您在工作或学习方面将会有新的进展。宝剑七则警示您要小心处理人际关系中的冲突，避免因为误解而产生不必要的纷争。',
        summary: '新的开始即将到来，保持开放心态，注意人际关系处理',
        advice:
          '建议您在接下来的时间里，积极拥抱变化，同时保持谨慎的态度。在做重要决定时，多听取他人的意见，但最终要相信自己的直觉。',
        qualityScore: 88,
        metadata: {
          promptUsed: '请为用户的塔罗牌占卜结果提供详细的个性化解读...',
          modelUsed: 'GPT-4',
          processingTime: 2340,
          tokenUsage: {
            promptTokens: 450,
            completionTokens: 320,
            totalTokens: 770,
          },
        },
        createdAt: new Date().toISOString(),
      };
      setInterpretation(mockInterpretation);
    } catch (error) {
      console.error('加载解读详情失败:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssessQuality = async () => {
    if (!interpretation) return;

    try {
      const assessment = await aiService.assessQuality(interpretation.id);
      setQuality(assessment);
      setActiveTab('quality');
    } catch (error) {
      console.error('质量评估失败:', error);
      Taro.showToast({
        title: '评估失败',
        icon: 'error',
      });
    }
  };

  const handleOptimize = async () => {
    if (!interpretation) return;

    try {
      setOptimizing(true);
      const result = await aiService.optimizeInterpretation(interpretation.id);
      setOptimization(result);
      setActiveTab('optimization');
      Taro.showToast({
        title: '优化完成',
        icon: 'success',
      });
    } catch (error) {
      console.error('优化失败:', error);
      Taro.showToast({
        title: '优化失败',
        icon: 'error',
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!interpretation) return;

    try {
      setRegenerating(true);
      const newInterpretation = await aiService.regenerateInterpretation(interpretation.id);
      setInterpretation(newInterpretation);
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
      data: `AI个性化解读：\n${interpretation.summary}\n\n${interpretation.content}\n\n建议：${interpretation.advice}`,
      success: () => {
        Taro.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
        });
      },
    });
  };

  const toggleFeedbackTag = (tag: string) => {
    setFeedback(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
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
      <View className="ai-detail loading">
        <View className="loading-container">
          <View className="spinner"></View>
          <Text className="loading-text">加载解读详情中...</Text>
        </View>
      </View>
    );
  }

  if (!interpretation) {
    return (
      <View className="ai-detail error">
        <Text className="error-text">解读不存在或已被删除</Text>
        <Button className="back-btn" onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    );
  }

  return (
    <View className="ai-detail">
      {/* 头部信息 */}
      <View className="header">
        <View className="title-section">
          <Text className="title">AI解读详情</Text>
          <View className="meta-info">
            <Text className="type">类型: {interpretation.type}</Text>
            <Text
              className="quality"
              style={{ color: getQualityColor(interpretation.qualityScore) }}
            >
              质量: {interpretation.qualityScore}分
            </Text>
          </View>
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
          <Button className="action-btn" size="mini" loading={optimizing} onClick={handleOptimize}>
            {optimizing ? '优化中...' : '优化解读'}
          </Button>
        </View>
      </View>

      {/* 标签页 */}
      <View className="tabs">
        <View
          className={`tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <Text className="tab-text">解读内容</Text>
        </View>
        <View
          className={`tab ${activeTab === 'metadata' ? 'active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          <Text className="tab-text">技术信息</Text>
        </View>
        {quality && (
          <View
            className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
            onClick={() => setActiveTab('quality')}
          >
            <Text className="tab-text">质量评估</Text>
          </View>
        )}
        {optimization && (
          <View
            className={`tab ${activeTab === 'optimization' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimization')}
          >
            <Text className="tab-text">优化结果</Text>
          </View>
        )}
      </View>

      {/* 内容区域 */}
      <ScrollView className="content" scrollY>
        {activeTab === 'content' && (
          <View className="content-section">
            {/* 摘要 */}
            <View className="summary-section">
              <Text className="section-title">核心要点</Text>
              <Text className="summary-text">{interpretation.summary}</Text>
            </View>

            {/* 详细解读 */}
            <View className="detail-section">
              <Text className="section-title">详细解读</Text>
              <Text className="detail-text">{interpretation.content}</Text>
            </View>

            {/* 建议 */}
            {interpretation.advice && (
              <View className="advice-section">
                <Text className="section-title">个性化建议</Text>
                <Text className="advice-text">{interpretation.advice}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'metadata' && (
          <View className="metadata-section">
            <View className="metadata-item">
              <Text className="metadata-label">使用模型</Text>
              <Text className="metadata-value">{interpretation.metadata.modelUsed}</Text>
            </View>
            <View className="metadata-item">
              <Text className="metadata-label">处理时间</Text>
              <Text className="metadata-value">{interpretation.metadata.processingTime}ms</Text>
            </View>
            <View className="metadata-item">
              <Text className="metadata-label">Token使用</Text>
              <Text className="metadata-value">
                总计: {interpretation.metadata.tokenUsage.totalTokens}
                (提示: {interpretation.metadata.tokenUsage.promptTokens}, 完成:{' '}
                {interpretation.metadata.tokenUsage.completionTokens})
              </Text>
            </View>
            <View className="metadata-item">
              <Text className="metadata-label">生成时间</Text>
              <Text className="metadata-value">
                {new Date(interpretation.createdAt).toLocaleString()}
              </Text>
            </View>
            <View className="metadata-item full-width">
              <Text className="metadata-label">使用提示词</Text>
              <Text className="metadata-value prompt">{interpretation.metadata.promptUsed}</Text>
            </View>
          </View>
        )}

        {activeTab === 'quality' && quality && (
          <View className="quality-section">
            <View className="quality-overview">
              <Text className="quality-score" style={{ color: getQualityColor(quality.score) }}>
                {quality.score}分
              </Text>
              <Text className="quality-grade">{getQualityText(quality.grade)}</Text>
            </View>

            <View className="quality-metrics">
              <Text className="section-title">评估指标</Text>
              <View className="metrics-grid">
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
                <View className="metric-item">
                  <Text className="metric-label">有用性</Text>
                  <Text className="metric-value">{quality.metrics.helpfulness}%</Text>
                </View>
              </View>
            </View>

            {quality.feedback && (
              <View className="quality-feedback">
                <Text className="section-title">评估反馈</Text>
                <Text className="feedback-text">{quality.feedback}</Text>
              </View>
            )}

            {quality.suggestions.length > 0 && (
              <View className="quality-suggestions">
                <Text className="section-title">改进建议</Text>
                {quality.suggestions.map((suggestion, index) => (
                  <Text key={index} className="suggestion-item">
                    • {suggestion}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'optimization' && optimization && (
          <View className="optimization-section">
            <View className="optimization-header">
              <Text className="section-title">优化结果</Text>
              <Text className="improvement-score">
                质量提升: +{optimization.qualityImprovement}分
              </Text>
            </View>

            <View className="optimization-strategy">
              <Text className="strategy-label">优化策略</Text>
              <Text className="strategy-text">{optimization.strategy}</Text>
            </View>

            <View className="optimized-content">
              <Text className="section-title">优化后内容</Text>
              <Text className="optimized-text">{optimization.optimizedContent}</Text>
            </View>

            {optimization.improvements.length > 0 && (
              <View className="improvements">
                <Text className="section-title">改进点</Text>
                {optimization.improvements.map((improvement, index) => (
                  <Text key={index} className="improvement-item">
                    • {improvement}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 底部操作 */}
      <View className="bottom-actions">
        <Button className="action-btn share" onClick={handleShare}>
          分享解读
        </Button>
        <Button className="action-btn feedback" onClick={() => setShowFeedback(true)}>
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

              <View className="tags-section">
                <Text className="form-label">标签</Text>
                <View className="tags-grid">
                  {feedbackTags.map(tag => (
                    <View
                      key={tag}
                      className={`tag-item ${feedback.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleFeedbackTag(tag)}
                    >
                      <Text className="tag-text">{tag}</Text>
                    </View>
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

              <Button className="submit-btn" type="primary" onClick={handleSubmitFeedback}>
                提交反馈
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AiDetail;
