import { Component } from 'react';
import { View, Text, Image } from '@tarojs/components';
import {
  AtInput,
  AtButton,
  AtTextarea,
  AtActionSheet,
  AtActionSheetItem,
  AtAvatar,
  AtTag,
  AtMessage,
} from 'taro-ui';
import Taro from '@tarojs/taro';
import './index.css';

export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email?: string;
  phone?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  location?: string;
  constellation?: string;
  level?: number;
  points?: number;
  vipLevel?: number;
  joinDate?: string;
  lastLoginDate?: string;
}

export interface UserProfileProps {
  /** 用户信息 */
  userInfo: UserInfo;
  /** 是否可编辑 */
  editable?: boolean;
  /** 显示模式 */
  mode?: 'card' | 'detail' | 'edit';
  /** 显示字段配置 */
  showFields?: {
    avatar?: boolean;
    nickname?: boolean;
    bio?: boolean;
    email?: boolean;
    phone?: boolean;
    birthday?: boolean;
    gender?: boolean;
    location?: boolean;
    constellation?: boolean;
    level?: boolean;
    points?: boolean;
    vipLevel?: boolean;
    joinDate?: boolean;
    lastLoginDate?: boolean;
  };
  /** 保存回调 */
  onSave?: (userInfo: UserInfo) => void;
  /** 头像更换回调 */
  onAvatarChange?: (avatar: string) => void;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义样式类名 */
  className?: string;
}

export interface UserProfileState {
  /** 编辑中的用户信息 */
  editingUserInfo: UserInfo;
  /** 是否处于编辑模式 */
  isEditing: boolean;
  /** 是否显示头像选择 */
  showAvatarSheet: boolean;
  /** 加载状态 */
  loading: boolean;
  /** 表单验证错误 */
  errors: {
    nickname?: string;
    email?: string;
    phone?: string;
    bio?: string;
  };
}

export default class UserProfile extends Component<UserProfileProps, UserProfileState> {
  static defaultProps: Partial<UserProfileProps> = {
    editable: true,
    mode: 'detail',
    showFields: {
      avatar: true,
      nickname: true,
      bio: true,
      email: true,
      phone: true,
      birthday: true,
      gender: true,
      location: true,
      constellation: true,
      level: true,
      points: true,
      vipLevel: true,
      joinDate: true,
      lastLoginDate: false,
    },
  };

  constructor(props: UserProfileProps) {
    super(props);
    this.state = {
      editingUserInfo: { ...props.userInfo },
      isEditing: props.mode === 'edit',
      showAvatarSheet: false,
      loading: false,
      errors: {},
    };
  }

  componentDidUpdate(prevProps: UserProfileProps) {
    if (prevProps.userInfo !== this.props.userInfo) {
      this.setState({
        editingUserInfo: { ...this.props.userInfo },
      });
    }
    if (prevProps.mode !== this.props.mode) {
      this.setState({
        isEditing: this.props.mode === 'edit',
      });
    }
  }

  // 表单验证
  validateForm = (): boolean => {
    const { editingUserInfo } = this.state;
    const errors: UserProfileState['errors'] = {};

    // 昵称验证
    if (!editingUserInfo.nickname?.trim()) {
      errors.nickname = '请输入昵称';
    } else if (editingUserInfo.nickname.length > 20) {
      errors.nickname = '昵称长度不能超过20个字符';
    }

    // 邮箱验证
    if (editingUserInfo.email && !/^\w+@\w+\.\w+$/.test(editingUserInfo.email)) {
      errors.email = '请输入正确的邮箱地址';
    }

    // 手机号验证
    if (editingUserInfo.phone && !/^1[3-9]\d{9}$/.test(editingUserInfo.phone)) {
      errors.phone = '请输入正确的手机号';
    }

    // 个人简介验证
    if (editingUserInfo.bio && editingUserInfo.bio.length > 200) {
      errors.bio = '个人简介不能超过200个字符';
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  // 开始编辑
  startEdit = () => {
    this.setState({ isEditing: true });
  };

  // 取消编辑
  cancelEdit = () => {
    this.setState({
      isEditing: false,
      editingUserInfo: { ...this.props.userInfo },
      errors: {},
    });
  };

  // 保存编辑
  saveEdit = async () => {
    if (!this.validateForm()) return;

    const { onSave } = this.props;
    const { editingUserInfo } = this.state;

    this.setState({ loading: true });

    try {
      // 这里调用保存用户信息API
      // await updateUserInfo(editingUserInfo)

      Taro.atMessage({
        message: '保存成功',
        type: 'success',
      });

      this.setState({ isEditing: false });
      onSave?.(editingUserInfo);
    } catch (error) {
      Taro.atMessage({
        message: '保存失败，请重试',
        type: 'error',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  // 选择头像
  selectAvatar = () => {
    this.setState({ showAvatarSheet: true });
  };

  // 从相册选择头像
  chooseFromAlbum = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: res => {
        const avatar = res.tempFilePaths[0];
        this.setState({
          editingUserInfo: {
            ...this.state.editingUserInfo,
            avatar,
          },
          showAvatarSheet: false,
        });
        this.props.onAvatarChange?.(avatar);
      },
    });
  };

  // 拍照选择头像
  takePhoto = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: res => {
        const avatar = res.tempFilePaths[0];
        this.setState({
          editingUserInfo: {
            ...this.state.editingUserInfo,
            avatar,
          },
          showAvatarSheet: false,
        });
        this.props.onAvatarChange?.(avatar);
      },
    });
  };

  // 格式化日期
  formatDate = (dateString?: string): string => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 获取星座
  getConstellation = (birthday?: string): string => {
    if (!birthday) return '未知';
    const date = new Date(birthday);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const constellations = [
      '水瓶座',
      '双鱼座',
      '白羊座',
      '金牛座',
      '双子座',
      '巨蟹座',
      '狮子座',
      '处女座',
      '天秤座',
      '天蝎座',
      '射手座',
      '摩羯座',
    ];

    const dates = [
      [1, 20],
      [2, 19],
      [3, 21],
      [4, 20],
      [5, 21],
      [6, 22],
      [7, 23],
      [8, 23],
      [9, 23],
      [10, 24],
      [11, 23],
      [12, 22],
    ];

    let index = month - 1;
    if (day < dates[index][1]) {
      index = index === 0 ? 11 : index - 1;
    }

    return constellations[index];
  };

  // 获取VIP等级显示
  getVipLevelDisplay = (vipLevel?: number): string => {
    if (!vipLevel || vipLevel === 0) return '普通用户';
    return `VIP${vipLevel}`;
  };

  // 获取性别显示
  getGenderDisplay = (gender?: string): string => {
    const genderMap = {
      male: '男',
      female: '女',
      other: '其他',
    };
    return genderMap[gender as keyof typeof genderMap] || '未设置';
  };

  render() {
    const { mode, showFields, editable, className, onClick } = this.props;
    const { editingUserInfo, isEditing, showAvatarSheet, loading, errors } = this.state;

    const userInfo = isEditing ? editingUserInfo : this.props.userInfo;
    const constellation = this.getConstellation(userInfo.birthday);

    // 卡片模式
    if (mode === 'card') {
      return (
        <View className={`user-profile user-profile--card ${className || ''}`} onClick={onClick}>
          <AtMessage />

          {showFields?.avatar && (
            <View className="user-profile__avatar-container">
              {userInfo.avatar ? (
                <Image className="user-profile__avatar" src={userInfo.avatar} mode="aspectFill" />
              ) : (
                <AtAvatar
                  className="user-profile__avatar"
                  text={userInfo.nickname?.charAt(0) || userInfo.username?.charAt(0) || 'U'}
                  size="large"
                />
              )}

              {showFields?.vipLevel && userInfo.vipLevel && userInfo.vipLevel > 0 && (
                <AtTag className="user-profile__vip-tag" type="primary" size="small">
                  {this.getVipLevelDisplay(userInfo.vipLevel)}
                </AtTag>
              )}
            </View>
          )}

          <View className="user-profile__info">
            {showFields?.nickname && (
              <Text className="user-profile__nickname">
                {userInfo.nickname || userInfo.username}
              </Text>
            )}

            {showFields?.bio && userInfo.bio && (
              <Text className="user-profile__bio">{userInfo.bio}</Text>
            )}

            <View className="user-profile__meta">
              {showFields?.level && userInfo.level && (
                <Text className="user-profile__meta-item">Lv.{userInfo.level}</Text>
              )}

              {showFields?.points && userInfo.points !== undefined && (
                <Text className="user-profile__meta-item">{userInfo.points}积分</Text>
              )}

              {showFields?.constellation && (
                <Text className="user-profile__meta-item">{constellation}</Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    // 详情和编辑模式
    return (
      <View className={`user-profile user-profile--detail ${className || ''}`}>
        <AtMessage />

        {/* 头像区域 */}
        {showFields?.avatar && (
          <View className="user-profile__header">
            <View className="user-profile__avatar-section">
              {userInfo.avatar ? (
                <Image
                  className="user-profile__avatar user-profile__avatar--large"
                  src={userInfo.avatar}
                  mode="aspectFill"
                  onClick={isEditing ? this.selectAvatar : undefined}
                />
              ) : (
                <View onClick={isEditing ? this.selectAvatar : undefined}>
                  <AtAvatar
                    className="user-profile__avatar user-profile__avatar--large"
                    text={userInfo.nickname?.charAt(0) || userInfo.username?.charAt(0) || 'U'}
                    size="large"
                  />
                </View>
              )}

              {isEditing && <Text className="user-profile__avatar-tip">点击更换头像</Text>}
            </View>

            <View className="user-profile__header-info">
              {showFields?.vipLevel && userInfo.vipLevel && userInfo.vipLevel > 0 && (
                <AtTag className="user-profile__vip-tag" type="primary">
                  {this.getVipLevelDisplay(userInfo.vipLevel)}
                </AtTag>
              )}

              {showFields?.level && userInfo.level && (
                <Text className="user-profile__level">等级 Lv.{userInfo.level}</Text>
              )}

              {showFields?.points && userInfo.points !== undefined && (
                <Text className="user-profile__points">{userInfo.points} 积分</Text>
              )}
            </View>
          </View>
        )}

        {/* 基本信息 */}
        <View className="user-profile__section">
          <Text className="user-profile__section-title">基本信息</Text>

          {/* 昵称 */}
          {showFields?.nickname && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">昵称</Text>
              {isEditing ? (
                <View className="user-profile__field-input">
                  <AtInput
                    name="nickname"
                    type="text"
                    placeholder="请输入昵称"
                    value={editingUserInfo.nickname}
                    onChange={value =>
                      this.setState({
                        editingUserInfo: {
                          ...editingUserInfo,
                          nickname: value as string,
                        },
                      })
                    }
                    error={!!errors.nickname}
                  />
                  {errors.nickname && (
                    <Text className="user-profile__error">{errors.nickname}</Text>
                  )}
                </View>
              ) : (
                <Text className="user-profile__field-value">
                  {userInfo.nickname || userInfo.username}
                </Text>
              )}
            </View>
          )}

          {/* 邮箱 */}
          {showFields?.email && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">邮箱</Text>
              {isEditing ? (
                <View className="user-profile__field-input">
                  <AtInput
                    name="email"
                    type="text"
                    placeholder="请输入邮箱"
                    value={editingUserInfo.email || ''}
                    onChange={value =>
                      this.setState({
                        editingUserInfo: {
                          ...editingUserInfo,
                          email: value as string,
                        },
                      })
                    }
                    error={!!errors.email}
                  />
                  {errors.email && <Text className="user-profile__error">{errors.email}</Text>}
                </View>
              ) : (
                <Text className="user-profile__field-value">{userInfo.email || '未设置'}</Text>
              )}
            </View>
          )}

          {/* 手机号 */}
          {showFields?.phone && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">手机号</Text>
              {isEditing ? (
                <View className="user-profile__field-input">
                  <AtInput
                    name="phone"
                    type="phone"
                    placeholder="请输入手机号"
                    value={editingUserInfo.phone || ''}
                    onChange={value =>
                      this.setState({
                        editingUserInfo: {
                          ...editingUserInfo,
                          phone: value as string,
                        },
                      })
                    }
                    error={!!errors.phone}
                  />
                  {errors.phone && <Text className="user-profile__error">{errors.phone}</Text>}
                </View>
              ) : (
                <Text className="user-profile__field-value">
                  {userInfo.phone
                    ? userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
                    : '未设置'}
                </Text>
              )}
            </View>
          )}

          {/* 生日 */}
          {showFields?.birthday && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">生日</Text>
              <Text className="user-profile__field-value">
                {this.formatDate(userInfo.birthday)}
              </Text>
            </View>
          )}

          {/* 性别 */}
          {showFields?.gender && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">性别</Text>
              <Text className="user-profile__field-value">
                {this.getGenderDisplay(userInfo.gender)}
              </Text>
            </View>
          )}

          {/* 星座 */}
          {showFields?.constellation && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">星座</Text>
              <Text className="user-profile__field-value">{constellation}</Text>
            </View>
          )}

          {/* 地区 */}
          {showFields?.location && (
            <View className="user-profile__field">
              <Text className="user-profile__field-label">地区</Text>
              <Text className="user-profile__field-value">{userInfo.location || '未设置'}</Text>
            </View>
          )}
        </View>

        {/* 个人简介 */}
        {showFields?.bio && (
          <View className="user-profile__section">
            <Text className="user-profile__section-title">个人简介</Text>
            {isEditing ? (
              <View className="user-profile__field-input">
                <AtTextarea
                  value={editingUserInfo.bio || ''}
                  onChange={value =>
                    this.setState({
                      editingUserInfo: {
                        ...editingUserInfo,
                        bio: value as string,
                      },
                    })
                  }
                  placeholder="请输入个人简介"
                  maxLength={200}
                  count
                />
                {errors.bio && <Text className="user-profile__error">{errors.bio}</Text>}
              </View>
            ) : (
              <Text className="user-profile__bio-content">
                {userInfo.bio || '这个人很懒，什么都没有留下...'}
              </Text>
            )}
          </View>
        )}

        {/* 账户信息 */}
        {(showFields?.joinDate || showFields?.lastLoginDate) && (
          <View className="user-profile__section">
            <Text className="user-profile__section-title">账户信息</Text>

            {showFields?.joinDate && (
              <View className="user-profile__field">
                <Text className="user-profile__field-label">注册时间</Text>
                <Text className="user-profile__field-value">
                  {this.formatDate(userInfo.joinDate)}
                </Text>
              </View>
            )}

            {showFields?.lastLoginDate && (
              <View className="user-profile__field">
                <Text className="user-profile__field-label">最后登录</Text>
                <Text className="user-profile__field-value">
                  {this.formatDate(userInfo.lastLoginDate)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 操作按钮 */}
        {editable && (
          <View className="user-profile__actions">
            {isEditing ? (
              <View className="user-profile__edit-actions">
                <AtButton
                  size="normal"
                  type="secondary"
                  onClick={this.cancelEdit}
                  className="user-profile__cancel-btn"
                >
                  取消
                </AtButton>
                <AtButton
                  size="normal"
                  type="primary"
                  loading={loading}
                  onClick={this.saveEdit}
                  className="user-profile__save-btn"
                >
                  保存
                </AtButton>
              </View>
            ) : (
              <AtButton
                size="normal"
                type="primary"
                onClick={this.startEdit}
                className="user-profile__edit-btn"
              >
                编辑资料
              </AtButton>
            )}
          </View>
        )}

        {/* 头像选择弹窗 */}
        <AtActionSheet
          isOpened={showAvatarSheet}
          cancelText="取消"
          onCancel={() => this.setState({ showAvatarSheet: false })}
          onClose={() => this.setState({ showAvatarSheet: false })}
        >
          <AtActionSheetItem onClick={this.chooseFromAlbum}>从相册选择</AtActionSheetItem>
          <AtActionSheetItem onClick={this.takePhoto}>拍照</AtActionSheetItem>
        </AtActionSheet>
      </View>
    );
  }
}
