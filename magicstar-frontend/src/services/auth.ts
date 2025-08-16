import Taro from '@tarojs/taro';
import { request } from './api';

// 认证相关接口类型定义
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface PhoneLoginRequest {
  phone: string;
  smsCode: string;
  rememberMe?: boolean;
}

export interface WechatLoginRequest {
  code: string;
  userInfo?: {
    nickname?: string;
    avatar?: string;
    gender?: number;
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
  phone?: string;
  nickname?: string;
  gender?: number;
  birthday?: string;
  birthPlace?: string;
  birthTime?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    username: string;
    email: string;
    phone?: string;
    nickname?: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    isVip: boolean;
    vipExpiredAt?: Date;
  };
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * 认证服务类
 */
export class AuthService {
  private static instance: AuthService;
  private baseUrl = '/api/auth';

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await request<ApiResponse<LoginResponse>>({
        url: `${this.baseUrl}/register`,
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await request<ApiResponse<LoginResponse>>({
        url: `${this.baseUrl}/login`,
        method: 'POST',
        data,
      });

      // 保存token到本地存储
      if (response.data.accessToken) {
        await Taro.setStorageSync('accessToken', response.data.accessToken);
        await Taro.setStorageSync('refreshToken', response.data.refreshToken);
        await Taro.setStorageSync('user', response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 手机号登录
   */
  async phoneLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
    try {
      const response = await request<ApiResponse<LoginResponse>>({
        url: `${this.baseUrl}/phone-login`,
        method: 'POST',
        data,
      });

      // 保存token到本地存储
      if (response.data.accessToken) {
        await Taro.setStorageSync('accessToken', response.data.accessToken);
        await Taro.setStorageSync('refreshToken', response.data.refreshToken);
        await Taro.setStorageSync('user', response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error('手机号登录失败:', error);
      throw error;
    }
  }

  /**
   * 微信登录
   */
  async wechatLogin(data: WechatLoginRequest): Promise<LoginResponse> {
    try {
      const response = await request<ApiResponse<LoginResponse>>({
        url: `${this.baseUrl}/wechat-login`,
        method: 'POST',
        data,
      });

      // 保存token到本地存储
      if (response.data.accessToken) {
        await Taro.setStorageSync('accessToken', response.data.accessToken);
        await Taro.setStorageSync('refreshToken', response.data.refreshToken);
        await Taro.setStorageSync('user', response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(data?: RefreshTokenRequest): Promise<LoginResponse> {
    try {
      const refreshToken = data?.refreshToken || Taro.getStorageSync('refreshToken');
      if (!refreshToken) {
        throw new Error('刷新token不存在');
      }

      const response = await request<ApiResponse<LoginResponse>>({
        url: `${this.baseUrl}/refresh`,
        method: 'POST',
        data: { refreshToken },
      });

      // 更新token
      if (response.data.accessToken) {
        await Taro.setStorageSync('accessToken', response.data.accessToken);
        await Taro.setStorageSync('refreshToken', response.data.refreshToken);
        await Taro.setStorageSync('user', response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error('刷新token失败:', error);
      // 刷新失败，清除本地存储
      await this.logout();
      throw error;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await request<ApiResponse<void>>({
        url: `${this.baseUrl}/password`,
        method: 'PUT',
        data,
      });
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      await request<ApiResponse<void>>({
        url: `${this.baseUrl}/reset-password`,
        method: 'POST',
        data,
      });
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 发送重置密码邮件
   */
  async sendResetPasswordEmail(email: string): Promise<void> {
    try {
      await request<ApiResponse<void>>({
        url: `${this.baseUrl}/send-reset-email`,
        method: 'POST',
        data: { email },
      });
    } catch (error) {
      console.error('发送重置密码邮件失败:', error);
      throw error;
    }
  }

  /**
   * 发送短信验证码
   */
  async sendSmsCode(phone: string, type: 'login' | 'register' | 'reset' = 'login'): Promise<void> {
    try {
      await request<ApiResponse<void>>({
        url: `${this.baseUrl}/send-sms`,
        method: 'POST',
        data: { phone, type },
      });
    } catch (error) {
      console.error('发送短信验证码失败:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      // 清除本地存储
      await Taro.removeStorageSync('accessToken');
      await Taro.removeStorageSync('refreshToken');
      await Taro.removeStorageSync('user');

      // 可选：调用后端登出接口
      try {
        await request<ApiResponse<void>>({
          url: `${this.baseUrl}/logout`,
          method: 'POST',
        });
      } catch (error) {
        // 忽略后端登出错误，因为本地已经清除
        console.warn('后端登出失败:', error);
      }
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  }

  /**
   * 检查登录状态
   */
  isLoggedIn(): boolean {
    try {
      const token = Taro.getStorageSync('accessToken');
      return !!token;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): LoginResponse['user'] | null {
    try {
      return Taro.getStorageSync('user') || null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 获取访问token
   */
  getAccessToken(): string | null {
    try {
      return Taro.getStorageSync('accessToken') || null;
    } catch (error) {
      console.error('获取访问token失败:', error);
      return null;
    }
  }

  /**
   * 获取刷新token
   */
  getRefreshToken(): string | null {
    try {
      return Taro.getStorageSync('refreshToken') || null;
    } catch (error) {
      console.error('获取刷新token失败:', error);
      return null;
    }
  }
}

// 导出单例实例
export const authService = AuthService.getInstance();
export default authService;
