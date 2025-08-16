import { Component, PropsWithChildren } from 'react';
import { View, Text } from '@tarojs/components';
import { AtForm, AtInput, AtButton } from 'taro-ui';
import Taro from '@tarojs/taro';
import { authService } from '../../services/auth';

import 'taro-ui/dist/style/components/form.scss';
import 'taro-ui/dist/style/components/input.scss';
import 'taro-ui/dist/style/components/button.scss';
import './index.scss';

interface LoginState {
  username: string;
  password: string;
  loading: boolean;
}

export default class Login extends Component<PropsWithChildren, LoginState> {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      loading: false,
    };
  }

  componentDidMount() {}

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  handleUsernameChange = (value: string) => {
    this.setState({ username: value });
  };

  handlePasswordChange = (value: string) => {
    this.setState({ password: value });
  };

  handleLogin = async () => {
    const { username, password } = this.state;

    if (!username || !password) {
      Taro.showToast({
        title: '请输入用户名和密码',
        icon: 'none',
      });
      return;
    }

    this.setState({ loading: true });

    try {
      const result = await authService.login({
        username: username.trim(),
        password,
      });

      // 登录成功，result包含accessToken和用户信息
      if (result.accessToken) {
        Taro.showToast({
          title: '登录成功',
          icon: 'success',
        });

        // 登录成功后跳转到首页
        setTimeout(() => {
          Taro.switchTab({
            url: '/pages/index/index',
          });
        }, 1500);
      } else {
        Taro.showToast({
          title: '登录失败',
          icon: 'none',
        });
      }
    } catch (error: any) {
      console.error('登录错误:', error);

      // 处理API错误响应
      let errorMessage = '网络错误，请稍后重试';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Taro.showToast({
        title: errorMessage,
        icon: 'none',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  handleRegister = () => {
    Taro.navigateTo({
      url: '/pages/register/index',
    });
  };

  render() {
    const { username, password, loading } = this.state;

    return (
      <View className="login-page">
        <View className="login-header">
          <Text className="login-title">Magic Lightning</Text>
          <Text className="login-subtitle">探索神秘的占卜世界</Text>
        </View>

        <View className="login-form">
          <AtForm>
            <AtInput
              name="username"
              title="用户名"
              type="text"
              placeholder="请输入用户名/邮箱/手机号"
              value={username}
              onChange={this.handleUsernameChange}
            />
            <AtInput
              name="password"
              title="密码"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={this.handlePasswordChange}
            />
          </AtForm>

          <View className="login-actions">
            <AtButton
              type="primary"
              size="normal"
              onClick={this.handleLogin}
              className="login-btn"
              loading={loading}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </AtButton>

            <View className="login-links">
              <Text className="link-text" onClick={this.handleRegister}>
                还没有账号？立即注册
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
}
