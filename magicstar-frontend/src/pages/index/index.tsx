import { Component, PropsWithChildren } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.css';

// 导入图标资源
import icTopLogo from '../../assets/icons/ic_top_logo.svg';
import icFortuneStarEmpty from '../../assets/icons/ic_fortune_star_empty.svg';
import icFortuneStarFilled from '../../assets/icons/ic_fortune_star_filled.svg';
import icFortuneStarHalf from '../../assets/icons/ic_fortune_star_half.svg';
import imgHomeTarotBanner from '../../assets/icons/img_home_tarot_banner.svg';
import imgHomeSingerBanner from '../../assets/icons/img_home_singer_banner.svg';
import imgHomeSecretPixel from '../../assets/icons/img_home_secret_pixel.svg';
import imgHomeFeatureRider from '../../assets/icons/img_home_feature_rider.svg';
import imgHomeFeatureDice from '../../assets/icons/img_home_feature_dice.svg';
import imgHomeFeatureFengshui from '../../assets/icons/img_home_feature_fengshui.svg';

interface IndexState {
  userInfo: {
    name: string;
    birthDate: string;
    constellation: string;
  };
  todayFortune: {
    overall: number; // 1-5星
    love: number;
    career: number;
    wealth: number;
    health: number;
    percentage: number;
  };
}

export default class Index extends Component<PropsWithChildren, IndexState> {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: {
        name: '白羊座（示例）',
        birthDate: '2000-04-15',
        constellation: '白羊座',
      },
      todayFortune: {
        overall: 4,
        love: 4,
        career: 4,
        wealth: 4,
        health: 4,
        percentage: 85,
      },
    };
  }

  componentDidMount() {
    // TODO: 获取首页数据
  }

  componentWillUnmount() {}

  componentDidShow() {
    // 每次显示页面时刷新数据
  }

  componentDidHide() {}

  handleBannerClick = banner => {
    console.log('点击轮播图:', banner);
    // TODO: 处理轮播图点击事件
  };

  handleQuickAction = (item, _index) => {
    console.log('快捷操作:', item);

    // 根据不同的快捷操作跳转到对应页面
    switch (item.value) {
      case 'tarot':
        Taro.navigateTo({
          url: '/pages/tarot/index',
        });
        break;
      case 'fortune':
        Taro.navigateTo({
          url: '/pages/fortune/index',
        });
        break;
      case 'astrology':
        Taro.navigateTo({
          url: '/pages/ai/index',
        });
        break;
      default:
        Taro.switchTab({
          url: '/pages/divination/index',
        });
        break;
    }
  };

  handleDailyFortune = () => {
    Taro.navigateTo({
      url: '/pages/fortune/index',
    });
  };

  handleShop = () => {
    Taro.switchTab({
      url: '/pages/shop/index',
    });
  };

  // 渲染星星评级
  renderStars = (rating: number) => {
    const stars: JSX.Element[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Image key={i} src={icFortuneStarFilled} className="fortune-star" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<Image key={i} src={icFortuneStarHalf} className="fortune-star" />);
      } else {
        stars.push(<Image key={i} src={icFortuneStarEmpty} className="fortune-star" />);
      }
    }
    return stars;
  };

  render() {
    const { userInfo, todayFortune } = this.state;

    return (
      <ScrollView className="index-page" scrollY>
        {/* 顶部Logo */}
        <View className="header">
          <Image src={icTopLogo} className="top-logo" />
        </View>

        {/* 用户信息卡片 */}
        <View className="user-card">
          <View className="user-info">
            <View className="user-avatar">
              <View className="avatar-placeholder"></View>
            </View>
            <View className="user-details">
              <Text className="user-name">{userInfo.name}</Text>
              <Text className="user-birth">{userInfo.birthDate}</Text>
            </View>
            <View className="user-actions">
              <Text className="edit-btn">编辑</Text>
              <Text className="more-btn">...</Text>
            </View>
          </View>
        </View>

        {/* 今日运势和塔罗占卜 */}
        <View className="main-content">
          {/* 今日运势卡片 */}
          <View className="fortune-card">
            <Text className="card-title">今日运势</Text>
            <View className="fortune-stats">
              <View className="stat-row">
                <Text className="stat-label">爱情运势</Text>
                <View className="stat-stars">{this.renderStars(todayFortune.love)}</View>
                <Text className="stat-percent">{todayFortune.percentage}%</Text>
              </View>
              <View className="stat-row">
                <Text className="stat-label">事业运势</Text>
                <View className="stat-stars">{this.renderStars(todayFortune.career)}</View>
                <Text className="stat-percent">{todayFortune.percentage}%</Text>
              </View>
              <View className="stat-row">
                <Text className="stat-label">财富运势</Text>
                <View className="stat-stars">{this.renderStars(todayFortune.wealth)}</View>
                <Text className="stat-percent">{todayFortune.percentage}%</Text>
              </View>
              <View className="stat-row">
                <Text className="stat-label">对运运势</Text>
                <View className="stat-stars">{this.renderStars(todayFortune.overall)}</View>
                <Text className="stat-percent">{todayFortune.percentage}%</Text>
              </View>
              <View className="stat-row">
                <Text className="stat-label">健康指数</Text>
                <View className="stat-stars">{this.renderStars(todayFortune.health)}</View>
                <Text className="stat-percent">{todayFortune.percentage}%</Text>
              </View>
            </View>
          </View>

          {/* 塔罗占卜卡片 */}
          <View className="tarot-card" onClick={() => this.handleQuickAction({ value: 'tarot' }, 0)}>
            <Text className="card-title">塔罗占卜</Text>
            <Text className="card-subtitle">专业解析·AI分析</Text>
            <Image src={imgHomeTarotBanner} className="tarot-image" />
          </View>
        </View>

        {/* 占卜歌者横幅 */}
        <View className="singer-banner" onClick={() => this.handleQuickAction({ value: 'singer' }, 0)}>
          <Image src={imgHomeSingerBanner} className="singer-image" />
          <View className="singer-content">
            <Text className="singer-title">占卜歌者100%的</Text>
            <Text className="singer-subtitle">灵魂传递</Text>
          </View>
        </View>

        {/* 洞悉命理奥秘 */}
        <View className="secret-section" onClick={() => this.handleQuickAction({ value: 'secret' }, 0)}>
          <Image src={imgHomeSecretPixel} className="secret-image" />
          <View className="secret-content">
            <Text className="secret-title">洞悉命理奥秘，</Text>
            <Text className="secret-subtitle">揭开命运密码</Text>
            <Text className="secret-desc">人生路途充满未知，命运学AI让你看透命运</Text>
            <Text className="secret-desc">的运转法则，助你把握人生主动权</Text>
            <Text className="secret-count">♪ 999+</Text>
          </View>
        </View>

        {/* 底部功能区 */}
        <View className="bottom-features">
          <View className="feature-row">
            <View className="feature-item" onClick={() => this.handleQuickAction({ value: 'rider' }, 0)}>
              <Image src={imgHomeFeatureRider} className="feature-icon" />
              <Text className="feature-text">雷诺曼牌</Text>
            </View>
            <View className="feature-item" onClick={() => this.handleQuickAction({ value: 'dice' }, 0)}>
              <Image src={imgHomeFeatureDice} className="feature-icon" />
              <Text className="feature-text">星座骰子</Text>
            </View>
            <View className="feature-item" onClick={() => this.handleQuickAction({ value: 'fengshui' }, 0)}>
              <Image src={imgHomeFeatureFengshui} className="feature-icon" />
              <Text className="feature-text">办公风水</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }
}
