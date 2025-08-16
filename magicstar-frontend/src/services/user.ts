import Taro from '@tarojs/taro';
import { request } from './api';

// 用户相关接口类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthday?: string;
  birthPlace?: string;
  birthTime?: string;
  bio?: string;
  points: number;
  isVip: boolean;
  vipExpiredAt?: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserRequest {
  phone?: string;
  nickname?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthday?: string;
  birthPlace?: string;
  birthTime?: string;
  bio?: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthday?: string;
  birthPlace?: string;
  birthTime?: string;
  bio?: string;
}

export interface UpdateAvatarRequest {
  avatar: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePhoneRequest {
  phone: string;
  code: string;
}

export interface SecuritySettings {
  hasPassword: boolean;
  hasPhone: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * 用户管理服务类
 */
export class UserService {
  /**
   * 获取当前用户信息
   */
  static async getProfile(): Promise<User> {
    try {
      const response = await request<ApiResponse<User>>({
        url: '/users/profile',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户信息
   */
  static async getUserById(id: string): Promise<User> {
    try {
      const response = await request<ApiResponse<User>>({
        url: `/users/${id}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表（管理员功能）
   */
  static async getUserList(query: PaginationQuery = {}): Promise<PaginatedResponse<User>> {
    try {
      const response = await request<PaginatedResponse<User>>({
        url: '/users',
        method: 'GET',
        data: query,
      });
      return response;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息（管理员功能）
   */
  static async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    try {
      const response = await request<ApiResponse<User>>({
        url: `/users/${id}`,
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户（管理员功能）
   */
  static async deleteUser(id: string): Promise<void> {
    try {
      await request<ApiResponse>({
        url: `/users/${id}`,
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新个人资料
   */
  static async updateProfile(data: UpdateProfileRequest): Promise<User> {
    try {
      const response = await request<ApiResponse<User>>({
        url: '/users/profile/info',
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新个人资料失败:', error);
      throw error;
    }
  }

  /**
   * 更新头像
   */
  static async updateAvatar(data: UpdateAvatarRequest): Promise<User> {
    try {
      const response = await request<ApiResponse<User>>({
        url: '/users/profile/avatar',
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新头像失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await request<ApiResponse>({
        url: '/users/profile/change-password',
        method: 'POST',
        data,
      });
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  /**
   * 获取账号安全设置
   */
  static async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const response = await request<ApiResponse<SecuritySettings>>({
        url: '/users/profile/security',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取安全设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新手机号
   */
  static async updatePhoneNumber(data: UpdatePhoneRequest): Promise<User> {
    try {
      const response = await request<ApiResponse<User>>({
        url: '/users/profile/phone',
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新手机号失败:', error);
      throw error;
    }
  }

  /**
   * 上传头像文件
   */
  static async uploadAvatar(filePath: string): Promise<string> {
    try {
      const token = Taro.getStorageSync('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const uploadResult = await Taro.uploadFile({
        url: `${process.env.TARO_APP_API_BASE_URL || 'http://localhost:3000/api'}/upload/avatar`,
        filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      const response = JSON.parse(uploadResult.data);
      if (response.code !== 200) {
        throw new Error(response.message || '上传失败');
      }

      return response.data.url;
    } catch (error) {
      console.error('上传头像失败:', error);
      throw error;
    }
  }

  /**
   * 选择并上传头像
   */
  static async chooseAndUploadAvatar(): Promise<string> {
    try {
      const chooseResult = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      });

      if (chooseResult.tempFilePaths.length === 0) {
        throw new Error('未选择图片');
      }

      const avatarUrl = await this.uploadAvatar(chooseResult.tempFilePaths[0]);

      // 更新用户头像
      await this.updateAvatar({ avatar: avatarUrl });

      return avatarUrl;
    } catch (error) {
      console.error('选择并上传头像失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户缓存信息
   */
  static getUserFromCache(): User | null {
    try {
      const userStr = Taro.getStorageSync('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('获取用户缓存失败:', error);
      return null;
    }
  }

  /**
   * 缓存用户信息
   */
  static setUserToCache(user: User): void {
    try {
      Taro.setStorageSync('user', JSON.stringify(user));
    } catch (error) {
      console.error('缓存用户信息失败:', error);
    }
  }

  /**
   * 清除用户缓存
   */
  static clearUserCache(): void {
    try {
      Taro.removeStorageSync('user');
    } catch (error) {
      console.error('清除用户缓存失败:', error);
    }
  }

  /**
   * 刷新用户信息并更新缓存
   */
  static async refreshUserInfo(): Promise<User> {
    try {
      const user = await this.getProfile();
      this.setUserToCache(user);
      return user;
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      throw error;
    }
  }
}

export default UserService;
