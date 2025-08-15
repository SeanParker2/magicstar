import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import { AtCard, AtButton, AtIcon, AtProgress, AtTag, AtDivider } from 'taro-ui';
import './index.scss';

interface FortuneDetail {
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
  detailedAnalysis: {
    love: string;
    career: string;
    wealth: string;
    health: string;
  };
  recommendations: string[];
  createdAt: string;
}

const FortuneDetail: React.FC = () => {
  const router = useRouter();
  const [fortuneDetail, setFortuneDetail] = useState<FortuneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const fortuneId = router.params.id;

  useEffect(() => {
    if (fortuneId) {
      loadFortuneDetail();
    }
  }, [fortuneId]);

  const loadFortuneDetail = async () => {
    try {
      setLoading(true);
      
      const response = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/history/${fortuneId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('token')}`
        }
      });
      
      if (response.data.success) {
        setFortuneDetail(response.data.data);
      } else {
        Taro.showToast({
          title: '运势记录不存在',
          icon: 'error'
        });
        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('获取运势详情失败:', error);
      Taro.showToast({
        title: '获取运势详情失败',
        icon: 'error'
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

  const getTypeText = (type: string): string => {
    switch (type) {
      case 'daily':
        return '今日运势';
      case 'weekly':
        return '本周运势';
      case 'monthly':
        return '本月运势';
      default:
        return '运势';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleShare = async () => {
    try {
      await Taro.showShareMenu({
        withShareTicket: true
      });
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这条运势记录吗？'
      });
      
      if (result.confirm) {
        await Taro.request({
          url: `${process.env.TARO_APP_API_URL}/fortune/history/${fortuneId}`,
          method: 'DELETE',
          header: {
            'Authorization': `Bearer ${Taro.getStorageSync('token')}`
          }
        });
        
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      Taro.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  };

  if (loading) {
    return (
      <View className='detail-loading'>
        <AtIcon value='loading-3' size='30' color='#6190E8'></AtIcon>
        <Text className='loading-text'>正在加载运势详情...</Text>
      </View>
    );
  }

  if (!fortuneDetail) {
    return (
      <View className='detail-error'>
        <AtIcon value='close-circle' size='60' color='#f5222d'></AtIcon>
        <Text className='error-text'>运势记录不存在</Text>
        <AtButton 
          type='primary'
          size='small'
          onClick={() => Taro.navigateBack()}
        >
          返回
        </AtButton>
      </View>
    );
  }

  return (
    <View className='fortune-detail-container'>
      {/* 运势概览 */}
      <AtCard className='overview-card'>
        <View className='overview-header'>
          <View className='type-info'>
            <AtTag size='normal' type='primary' circle>
              {getTypeText(fortuneDetail.type)}
            </AtTag>
            <Text className='date-text'>{formatDate(fortuneDetail.date)}</Text>
          </View>
          
          <View className='overall-score'>
            <Text 
              className='score-value'
              style={{ color: getScoreColor(fortuneDetail.overallScore) }}
            >
              {fortuneDetail.overallScore}
            </Text>
            <Text className='score-text'>
              {getScoreText(fortuneDetail.overallScore)}
            </Text>
          </View>
        </View>
        
        <AtDivider content='综合运势' fontColor='#6190E8' lineColor='#6190E8' />
        
        {/* 各项运势评分 */}
        <View className='score-details'>
          <View className='score-item'>
            <View className='score-header'>
              <AtIcon value='heart' size='20' color='#f5222d'></AtIcon>
              <Text className='score-label'>爱情运势</Text>
            </View>
            <AtProgress 
              percent={fortuneDetail.loveScore} 
              strokeWidth={10}
              color={getScoreColor(fortuneDetail.loveScore)}
            />
            <Text className='score-number'>{fortuneDetail.loveScore}</Text>
          </View>
          
          <View className='score-item'>
            <View className='score-header'>
              <AtIcon value='briefcase' size='20' color='#52c41a'></AtIcon>
              <Text className='score-label'>事业运势</Text>
            </View>
            <AtProgress 
              percent={fortuneDetail.careerScore} 
              strokeWidth={10}
              color={getScoreColor(fortuneDetail.careerScore)}
            />
            <Text className='score-number'>{fortuneDetail.careerScore}</Text>
          </View>
          
          <View className='score-item'>
            <View className='score-header'>
              <AtIcon value='money' size='20' color='#faad14'></AtIcon>
              <Text className='score-label'>财富运势</Text>
            </View>
            <AtProgress 
              percent={fortuneDetail.wealthScore} 
              strokeWidth={10}
              color={getScoreColor(fortuneDetail.wealthScore)}
            />
            <Text className='score-number'>{fortuneDetail.wealthScore}</Text>
          </View>
          
          <View className='score-item'>
            <View className='score-header'>
              <AtIcon value='heart-2' size='20' color='#722ed1'></AtIcon>
              <Text className='score-label'>健康运势</Text>
            </View>
            <AtProgress 
              percent={fortuneDetail.healthScore} 
              strokeWidth={10}
              color={getScoreColor(fortuneDetail.healthScore)}
            />
            <Text className='score-number'>{fortuneDetail.healthScore}</Text>
          </View>
        </View>
      </AtCard>
      
      {/* 幸运元素 */}
      <AtCard className='lucky-card'>
        <AtDivider content='幸运元素' fontColor='#6190E8' lineColor='#6190E8' />
        
        <View className='lucky-elements'>
          <View className='lucky-item'>
            <AtIcon value='heart' size='24' color='#f5222d'></AtIcon>
            <Text className='lucky-label'>幸运色彩</Text>
            <View 
              className='lucky-color'
              style={{ backgroundColor: fortuneDetail.luckyColor }}
            ></View>
            <Text className='color-code'>{fortuneDetail.luckyColor}</Text>
          </View>
          
          <View className='lucky-item'>
            <AtIcon value='star' size='24' color='#faad14'></AtIcon>
            <Text className='lucky-label'>幸运数字</Text>
            <Text className='lucky-number'>{fortuneDetail.luckyNumber}</Text>
          </View>
        </View>
        
        <View className='keywords-section'>
          <Text className='keywords-title'>运势关键词</Text>
          <View className='keywords-list'>
            {fortuneDetail.keywords.map((keyword, index) => (
              <AtTag 
                key={index}
                size='small'
                type='primary'
                circle
              >
                {keyword}
              </AtTag>
            ))}
          </View>
        </View>
      </AtCard>
      
      {/* 详细分析 */}
      <AtCard className='analysis-card'>
        <AtDivider content='详细分析' fontColor='#6190E8' lineColor='#6190E8' />
        
        <View className='analysis-sections'>
          <View className='analysis-item'>
            <View className='analysis-header'>
              <AtIcon value='heart' size='18' color='#f5222d'></AtIcon>
              <Text className='analysis-title'>爱情分析</Text>
            </View>
            <Text className='analysis-content'>{fortuneDetail.detailedAnalysis.love}</Text>
          </View>
          
          <View className='analysis-item'>
            <View className='analysis-header'>
              <AtIcon value='briefcase' size='18' color='#52c41a'></AtIcon>
              <Text className='analysis-title'>事业分析</Text>
            </View>
            <Text className='analysis-content'>{fortuneDetail.detailedAnalysis.career}</Text>
          </View>
          
          <View className='analysis-item'>
            <View className='analysis-header'>
              <AtIcon value='money' size='18' color='#faad14'></AtIcon>
              <Text className='analysis-title'>财富分析</Text>
            </View>
            <Text className='analysis-content'>{fortuneDetail.detailedAnalysis.wealth}</Text>
          </View>
          
          <View className='analysis-item'>
            <View className='analysis-header'>
              <AtIcon value='heart-2' size='18' color='#722ed1'></AtIcon>
              <Text className='analysis-title'>健康分析</Text>
            </View>
            <Text className='analysis-content'>{fortuneDetail.detailedAnalysis.health}</Text>
          </View>
        </View>
      </AtCard>
      
      {/* 运势建议 */}
      <AtCard className='advice-card'>
        <AtDivider content='运势建议' fontColor='#6190E8' lineColor='#6190E8' />
        
        <View className='advice-content'>
          <Text className='advice-text'>{fortuneDetail.advice}</Text>
        </View>
        
        {fortuneDetail.recommendations && fortuneDetail.recommendations.length > 0 && (
          <View className='recommendations'>
            <Text className='recommendations-title'>专属建议</Text>
            {fortuneDetail.recommendations.map((recommendation, index) => (
              <View key={index} className='recommendation-item'>
                <AtIcon value='check-circle' size='16' color='#52c41a'></AtIcon>
                <Text className='recommendation-text'>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}
      </AtCard>
      
      {/* 操作按钮 */}
      <View className='action-buttons'>
        <AtButton 
          type='primary'
          size='normal'
          onClick={handleShare}
        >
          <AtIcon value='share' size='16'></AtIcon>
          分享运势
        </AtButton>
        
        <AtButton 
          type='secondary'
          size='normal'
          onClick={handleDelete}
        >
          <AtIcon value='trash' size='16'></AtIcon>
          删除记录
        </AtButton>
      </View>
    </View>
  );
};

export default FortuneDetail;