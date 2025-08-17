import { Component, PropsWithChildren } from 'react';
import { View, Text } from '@tarojs/components';
import { AtList, AtListItem, AtAvatar, AtButton } from 'taro-ui';
import Taro from '@tarojs/taro';

// import 'taro-ui/dist/style/components/list.css';
// import 'taro-ui/dist/style/components/avatar.css';
// import 'taro-ui/dist/style/components/button.css';
import './index.css';

interface ProfileState {
  userInfo: {
    nickname: string;
    avatar: string;
    email: string;
    _phone: string;
    vipLevel: number;
    points: number;
  };
  isLoggedIn: boolean;
}

export default class Profile extends Component<PropsWithChildren, ProfileState> {
  constructor(props) {
    super(props);
    this.state = {
      userInfo: {
        nickname: '神秘占卜师',
        avatar: '',
        email: 'user@example.com',
        _phone: '138****8888',
        vipLevel: 1,
        points: 1280,
      },
      isLoggedIn: false, // TODO: 从状态管理中获取登录状态
    };
  }

  componentDidMount() {
    // TODO: 检查登录状态，获取用户信息
  }

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  handleLogin = () => {
    Taro.navigateTo({
      url: '/pages/login/index',
    });
  };

  handleEditProfile = () => {
    Taro.showToast({
      title: '编辑资料功能开发中',
      icon: 'none',
    });
  };

  handleSettings = () => {
    Taro.showToast({
      title: '设置功能开发中',
      icon: 'none',
    });
  };

  handleOrders = () => {
    Taro.showToast({
      title: '我的订单功能开发中',
      icon: 'none',
    });
  };

  handleFavorites = () => {
    Taro.showToast({
      title: '我的收藏功能开发中',
      icon: 'none',
    });
  };

  handleHistory = () => {
    Taro.showToast({
      title: '占卜记录功能开发中',
      icon: 'none',
    });
  };

  handleVip = () => {
    Taro.showToast({
      title: 'VIP会员功能开发中',
      icon: 'none',
    });
  };

  handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          // TODO: 清除登录状态
          this.setState({ isLoggedIn: false });
          Taro.showToast({
            title: '已退出登录',
            icon: 'success',
          });
        }
      },
    });
  };

  renderLoginPrompt = () => {
    return (
      <View className="login-prompt">
        <AtAvatar circle size="large" text="未登录" />
        <Text className="prompt-text">登录后享受更多功能</Text>
        <AtButton
          type="primary"
          size="small"
          onClick={this.handleLogin}
          className="login-prompt-btn"
        >
          立即登录
        </AtButton>
      </View>
    );
  };

  renderUserInfo = () => {
    const { userInfo } = this.state;

    return (
      <View className="user-info">
        <View className="user-header">
          <AtAvatar
            circle
            size="large"
            image={userInfo.avatar || ''}
            text={userInfo.nickname.charAt(0)}
          />
          <View className="user-details">
            <Text className="user-nickname">{userInfo.nickname}</Text>
            <Text className="user-email">{userInfo.email}</Text>
            <View className="user-stats">
              <Text className="stat-item">VIP{userInfo.vipLevel}</Text>
              <Text className="stat-item">积分: {userInfo.points}</Text>
            </View>
          </View>
          <Text className="edit-btn" onClick={this.handleEditProfile}>
            编辑
          </Text>
        </View>
      </View>
    );
  };

  render() {
    const { isLoggedIn } = this.state;

    return (
      <View className="profile-page">
        <View className="profile-header">
          {isLoggedIn ? this.renderUserInfo() : this.renderLoginPrompt()}
        </View>

        <View className="profile-content">
          <AtList>
            <AtListItem title="我的订单" arrow="right" thumb="📦" onClick={this.handleOrders} />
            <AtListItem title="占卜记录" arrow="right" thumb="🔮" onClick={this.handleHistory} />
            <AtListItem title="我的收藏" arrow="right" thumb="❤️" onClick={this.handleFavorites} />
            <AtListItem title="VIP会员" arrow="right" thumb="👑" onClick={this.handleVip} />
          </AtList>

          <AtList>
            <AtListItem title="设置" arrow="right" thumb="⚙️" onClick={this.handleSettings} />
          </AtList>

          {isLoggedIn && (
            <View className="logout-section">
              <AtButton
                type="secondary"
                size="normal"
                onClick={this.handleLogout}
                className="logout-btn"
              >
                退出登录
              </AtButton>
            </View>
          )}
        </View>
      </View>
    );
  }
}
