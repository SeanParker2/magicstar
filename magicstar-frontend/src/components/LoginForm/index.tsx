import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import { AtInput, AtButton, AtForm, AtCheckbox, AtMessage } from 'taro-ui';
import Taro from '@tarojs/taro';
import './index.css';

export interface LoginFormProps {
  /** 登录模式 */
  mode?: 'login' | 'register' | 'reset';
  /** 是否显示第三方登录 */
  showThirdParty?: boolean;
  /** 是否显示记住密码 */
  showRememberMe?: boolean;
  /** 是否显示注册链接 */
  showRegisterLink?: boolean;
  /** 是否显示忘记密码链接 */
  showForgotLink?: boolean;
  /** 登录成功回调 */
  onLoginSuccess?: (userInfo: any) => void;
  /** 登录失败回调 */
  onLoginError?: (error: string) => void;
  /** 注册成功回调 */
  onRegisterSuccess?: (userInfo: any) => void;
  /** 切换模式回调 */
  onModeChange?: (mode: 'login' | 'register' | 'reset') => void;
  /** 第三方登录回调 */
  onThirdPartyLogin?: (platform: 'wechat' | 'qq' | 'weibo') => void;
  /** 自定义样式类名 */
  className?: string;
}

export interface LoginFormState {
  /** 用户名/手机号/邮箱 */
  username: string;
  /** 密码 */
  password: string;
  /** 确认密码（注册模式） */
  confirmPassword: string;
  /** 验证码 */
  verifyCode: string;
  /** 是否记住密码 */
  rememberMe: boolean;
  /** 是否同意协议 */
  agreeTerms: boolean;
  /** 加载状态 */
  loading: boolean;
  /** 验证码倒计时 */
  codeCountdown: number;
  /** 表单验证错误 */
  errors: {
    username?: string;
    password?: string;
    confirmPassword?: string;
    verifyCode?: string;
  };
}

export default class LoginForm extends Component<LoginFormProps, LoginFormState> {
  private countdownTimer: NodeJS.Timeout | null = null;

  static defaultProps: Partial<LoginFormProps> = {
    mode: 'login',
    showThirdParty: true,
    showRememberMe: true,
    showRegisterLink: true,
    showForgotLink: true,
  };

  constructor(props: LoginFormProps) {
    super(props);
    this.state = {
      username: '',
      password: '',
      confirmPassword: '',
      verifyCode: '',
      rememberMe: false,
      agreeTerms: false,
      loading: false,
      codeCountdown: 0,
      errors: {},
    };
  }

  componentWillUnmount() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  // 表单验证
  validateForm = (): boolean => {
    const { mode } = this.props;
    const { username, password, confirmPassword, verifyCode, agreeTerms } = this.state;
    const errors: LoginFormState['errors'] = {};

    // 用户名验证
    if (!username.trim()) {
      errors.username = '请输入用户名/手机号/邮箱';
    } else if (!/^(1[3-9]\d{9}|\w+@\w+\.\w+|\w{3,20})$/.test(username)) {
      errors.username = '请输入正确的手机号、邮箱或用户名';
    }

    // 密码验证
    if (!password.trim()) {
      errors.password = '请输入密码';
    } else if (password.length < 6) {
      errors.password = '密码长度不能少于6位';
    }

    // 注册模式下的确认密码验证
    if (mode === 'register') {
      if (!confirmPassword.trim()) {
        errors.confirmPassword = '请确认密码';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      }
    }

    // 验证码验证（手机号登录/注册）
    if (/^1[3-9]\d{9}$/.test(username) && !verifyCode.trim()) {
      errors.verifyCode = '请输入验证码';
    }

    // 注册时协议同意验证
    if (mode === 'register' && !agreeTerms) {
      Taro.atMessage({
        message: '请先同意用户协议和隐私政策',
        type: 'error',
      });
      return false;
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  // 发送验证码
  sendVerifyCode = async () => {
    const { username } = this.state;

    if (!/^1[3-9]\d{9}$/.test(username)) {
      Taro.atMessage({
        message: '请输入正确的手机号',
        type: 'error',
      });
      return;
    }

    try {
      // 这里调用发送验证码API
      // await sendSmsCode(username)

      Taro.atMessage({
        message: '验证码已发送',
        type: 'success',
      });

      // 开始倒计时
      this.setState({ codeCountdown: 60 });
      this.countdownTimer = setInterval(() => {
        this.setState(prevState => {
          if (prevState.codeCountdown <= 1) {
            if (this.countdownTimer) {
              clearInterval(this.countdownTimer);
            }
            return { codeCountdown: 0 };
          }
          return { codeCountdown: prevState.codeCountdown - 1 };
        });
      }, 1000);
    } catch (error) {
      Taro.atMessage({
        message: '验证码发送失败，请重试',
        type: 'error',
      });
    }
  };

  // 处理登录
  handleLogin = async () => {
    if (!this.validateForm()) return;

    const { username } = this.state;
    const { onLoginSuccess, onLoginError } = this.props;

    this.setState({ loading: true });

    try {
      // 这里调用登录API
      // const loginData = {
      //   username,
      //   password,
      //   verifyCode: /^1[3-9]\d{9}$/.test(username) ? verifyCode : undefined,
      //   rememberMe,
      // };

      // const userInfo = await login(loginData)
      const userInfo = { id: 1, username, avatar: '', nickname: username };

      Taro.atMessage({
        message: '登录成功',
        type: 'success',
      });

      onLoginSuccess?.(userInfo);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '登录失败，请重试';
      Taro.atMessage({
        message: errorMsg,
        type: 'error',
      });
      onLoginError?.(errorMsg);
    } finally {
      this.setState({ loading: false });
    }
  };

  // 处理注册
  handleRegister = async () => {
    if (!this.validateForm()) return;

    const { username } = this.state;
    const { onRegisterSuccess, onLoginError } = this.props;

    this.setState({ loading: true });

    try {
      // 这里调用注册API
      // const registerData = {
      //   username,
      //   password,
      //   verifyCode: /^1[3-9]\d{9}$/.test(username) ? verifyCode : undefined,
      // };

      // const userInfo = await register(registerData)
      const userInfo = { id: 1, username, avatar: '', nickname: username };

      Taro.atMessage({
        message: '注册成功',
        type: 'success',
      });

      onRegisterSuccess?.(userInfo);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '注册失败，请重试';
      Taro.atMessage({
        message: errorMsg,
        type: 'error',
      });
      onLoginError?.(errorMsg);
    } finally {
      this.setState({ loading: false });
    }
  };

  // 处理密码重置
  handleResetPassword = async () => {
    if (!this.validateForm()) return;

    const { username, password, verifyCode } = this.state;
    const { onLoginError } = this.props;

    this.setState({ loading: true });

    try {
      // 这里调用重置密码API
      const resetData = {
        username,
        newPassword: password,
        verifyCode,
      };

      // TODO: 实现重置密码API调用
      // await resetPassword(resetData)
      console.log('Reset password data:', resetData);

      Taro.atMessage({
        message: '密码重置成功，请重新登录',
        type: 'success',
      });

      // 切换到登录模式
      this.props.onModeChange?.('login');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '密码重置失败，请重试';
      Taro.atMessage({
        message: errorMsg,
        type: 'error',
      });
      onLoginError?.(errorMsg);
    } finally {
      this.setState({ loading: false });
    }
  };

  // 第三方登录
  handleThirdPartyLogin = (platform: 'wechat' | 'qq' | 'weibo') => {
    this.props.onThirdPartyLogin?.(platform);
  };

  render() {
    const { mode, showThirdParty, showRememberMe, showRegisterLink, showForgotLink, className } =
      this.props;

    const {
      username,
      password,
      confirmPassword,
      verifyCode,
      rememberMe,
      agreeTerms,
      loading,
      codeCountdown,
      errors,
    } = this.state;

    const isPhoneNumber = /^1[3-9]\d{9}$/.test(username);
    const modeConfig = {
      login: { title: '登录', buttonText: '登录', submitHandler: this.handleLogin },
      register: { title: '注册', buttonText: '注册', submitHandler: this.handleRegister },
      reset: { title: '重置密码', buttonText: '重置密码', submitHandler: this.handleResetPassword },
    };

    const currentConfig = modeConfig[mode!];

    return (
      <View className={`login-form ${className || ''}`}>
        <AtMessage />

        <View className="login-form__header">
          <Text className="login-form__title">{currentConfig.title}</Text>
          <Text className="login-form__subtitle">
            {mode === 'login' && '欢迎回来，请登录您的账户'}
            {mode === 'register' && '创建新账户，开启占卜之旅'}
            {mode === 'reset' && '重置您的账户密码'}
          </Text>
        </View>

        <AtForm className="login-form__form">
          {/* 用户名输入 */}
          <View className="login-form__field">
            <AtInput
              name="username"
              title=""
              type="text"
              placeholder="请输入手机号/邮箱/用户名"
              value={username}
              onChange={value => this.setState({ username: value as string })}
              error={!!errors.username}
            />
            {errors.username && <Text className="login-form__error">{errors.username}</Text>}
          </View>

          {/* 验证码输入（手机号时显示） */}
          {isPhoneNumber && (
            <View className="login-form__field login-form__field--verify">
              <View className="login-form__verify-input">
                <AtInput
                  name="verifyCode"
                  title=""
                  type="number"
                  placeholder="请输入验证码"
                  value={verifyCode}
                  onChange={value => this.setState({ verifyCode: value as string })}
                  error={!!errors.verifyCode}
                />
              </View>
              <AtButton
                size="small"
                type="secondary"
                disabled={codeCountdown > 0}
                onClick={this.sendVerifyCode}
                className="login-form__verify-btn"
              >
                {codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'}
              </AtButton>
              {errors.verifyCode && <Text className="login-form__error">{errors.verifyCode}</Text>}
            </View>
          )}

          {/* 密码输入 */}
          <View className="login-form__field">
            <AtInput
              name="password"
              title=""
              type="password"
              placeholder={mode === 'reset' ? '请输入新密码' : '请输入密码'}
              value={password}
              onChange={value => this.setState({ password: value as string })}
              error={!!errors.password}
            />
            {errors.password && <Text className="login-form__error">{errors.password}</Text>}
          </View>

          {/* 确认密码输入（注册和重置模式） */}
          {(mode === 'register' || mode === 'reset') && (
            <View className="login-form__field">
              <AtInput
                name="confirmPassword"
                title=""
                type="password"
                placeholder="请确认密码"
                value={confirmPassword}
                onChange={value => this.setState({ confirmPassword: value as string })}
                error={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <Text className="login-form__error">{errors.confirmPassword}</Text>
              )}
            </View>
          )}

          {/* 记住密码选项 */}
          {mode === 'login' && showRememberMe && (
            <View className="login-form__options">
              <AtCheckbox
                options={[{ value: 'remember', label: '记住密码' }]}
                selectedList={rememberMe ? ['remember'] : []}
                onChange={values => this.setState({ rememberMe: values.includes('remember') })}
              />
            </View>
          )}

          {/* 协议同意（注册模式） */}
          {mode === 'register' && (
            <View className="login-form__agreement">
              <AtCheckbox
                options={[
                  {
                    value: 'agree',
                    label: '我已阅读并同意《用户协议》和《隐私政策》',
                  },
                ]}
                selectedList={agreeTerms ? ['agree'] : []}
                onChange={values => this.setState({ agreeTerms: values.includes('agree') })}
              />
            </View>
          )}

          {/* 提交按钮 */}
          <View className="login-form__submit">
            <AtButton
              type="primary"
              size="normal"
              loading={loading}
              onClick={currentConfig.submitHandler}
              className="login-form__submit-btn"
            >
              {currentConfig.buttonText}
            </AtButton>
          </View>
        </AtForm>

        {/* 模式切换链接 */}
        <View className="login-form__links">
          {mode === 'login' && showForgotLink && (
            <Text className="login-form__link" onClick={() => this.props.onModeChange?.('reset')}>
              忘记密码？
            </Text>
          )}

          {mode === 'login' && showRegisterLink && (
            <Text
              className="login-form__link"
              onClick={() => this.props.onModeChange?.('register')}
            >
              注册新账户
            </Text>
          )}

          {(mode === 'register' || mode === 'reset') && (
            <Text className="login-form__link" onClick={() => this.props.onModeChange?.('login')}>
              返回登录
            </Text>
          )}
        </View>

        {/* 第三方登录 */}
        {mode === 'login' && showThirdParty && (
          <View className="login-form__third-party">
            <View className="login-form__divider">
              <Text className="login-form__divider-text">其他登录方式</Text>
            </View>

            <View className="login-form__third-party-buttons">
              <View
                className="login-form__third-party-btn login-form__third-party-btn--wechat"
                onClick={() => this.handleThirdPartyLogin('wechat')}
              >
                <Text className="login-form__third-party-text">微信</Text>
              </View>

              <View
                className="login-form__third-party-btn login-form__third-party-btn--qq"
                onClick={() => this.handleThirdPartyLogin('qq')}
              >
                <Text className="login-form__third-party-text">QQ</Text>
              </View>

              <View
                className="login-form__third-party-btn login-form__third-party-btn--weibo"
                onClick={() => this.handleThirdPartyLogin('weibo')}
              >
                <Text className="login-form__third-party-text">微博</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }
}
