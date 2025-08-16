import React, { useState, useEffect } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtCard, AtButton, AtIcon, AtSwitch, AtList, AtListItem, AtDivider } from 'taro-ui';
import { FortuneService, FortuneReminderSettings, FortuneType } from '../../../services/fortune';
import './index.scss';

// 使用服务层定义的接口
// type ReminderSettings = FortuneReminderSettings;

const FortuneReminder: React.FC = () => {
  const [settings, setSettings] = useState<FortuneReminderSettings>({
    enabled: false,
    globalReminderTime: '08:00',
    soundEnabled: true,
    vibrationEnabled: true,
    pushTypes: ['overall'],
    customSettings: {
      [FortuneType.DAILY]: {
        enabled: true,
        reminderTime: '08:00',
        pushTypes: ['overall'],
      },
      [FortuneType.WEEKLY]: {
        enabled: false,
        reminderTime: '09:00',
        pushTypes: ['overall'],
      },
      [FortuneType.MONTHLY]: {
        enabled: false,
        reminderTime: '10:00',
        pushTypes: ['overall'],
      },
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const pushTypeOptions = [
    { value: 'overall', label: '综合运势', icon: 'star', color: '#6190E8' },
    { value: 'love', label: '爱情运势', icon: 'heart', color: '#f5222d' },
    { value: 'career', label: '事业运势', icon: 'briefcase', color: '#52c41a' },
    { value: 'wealth', label: '财富运势', icon: 'money', color: '#faad14' },
    { value: 'health', label: '健康运势', icon: 'heart-2', color: '#722ed1' },
  ];

  useEffect(() => {
    loadReminderSettings();
  }, []);

  const loadReminderSettings = async () => {
    try {
      setLoading(true);

      const response = await FortuneService.getReminderSettings();
      setSettings(response);
    } catch (error) {
      console.error('获取提醒设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReminderSettings = async () => {
    try {
      setSaving(true);

      await FortuneService.saveReminderSettings(settings);

      Taro.showToast({
        title: '设置保存成功',
        icon: 'success',
      });
    } catch (error) {
      console.error('保存提醒设置失败:', error);
      Taro.showToast({
        title: '保存失败',
        icon: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMainSwitchChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));

    if (enabled) {
      // 请求通知权限
      Taro.requestSubscribeMessage({
        tmplIds: ['fortune_daily_reminder', 'fortune_weekly_reminder', 'fortune_monthly_reminder'],
        entityIds: [],
        success: res => {
          console.log('订阅消息权限:', res);
        },
        fail: err => {
          console.error('订阅消息权限失败:', err);
        },
      });
    }
  };

  const handleTypeToggle = (type: string) => {
    setSettings(prev => ({
      ...prev,
      pushTypes: prev.pushTypes.includes(type)
        ? prev.pushTypes.filter(t => t !== type)
        : [...prev.pushTypes, type],
    }));
  };

  // TODO: 实现时间和日期变更处理
  // const handleTimeChange = (field: string, value: string) => {
  //   setSettings(prev => ({ ...prev, [field]: value }));
  // };

  // const handleDayChange = (field: string, value: number) => {
  //   setSettings(prev => ({ ...prev, [field]: value }));
  // };

  const testReminder = async () => {
    try {
      const response = await FortuneService.sendTestReminder(FortuneType.DAILY);

      Taro.showToast({
        title: response.message || '测试提醒已发送',
        icon: 'success',
      });

      Taro.showToast({
        title: '测试提醒已发送',
        icon: 'success',
      });
    } catch (error) {
      console.error('发送测试提醒失败:', error);
      Taro.showToast({
        title: '发送失败',
        icon: 'error',
      });
    }
  };

  if (loading) {
    return (
      <View className="reminder-loading">
        <AtIcon value="loading-3" size="30" color="#6190E8"></AtIcon>
        <Text className="loading-text">正在加载提醒设置...</Text>
      </View>
    );
  }

  return (
    <View className="fortune-reminder-container">
      {/* 主开关 */}
      <AtCard className="main-switch-card">
        <View className="main-switch">
          <View className="switch-info">
            <AtIcon value="bell" size="24" color="#6190E8"></AtIcon>
            <View className="switch-text">
              <Text className="switch-title">运势提醒</Text>
              <Text className="switch-desc">开启后将定时推送运势信息</Text>
            </View>
          </View>
          <AtSwitch checked={settings.enabled} onChange={handleMainSwitchChange} />
        </View>
      </AtCard>

      {settings.enabled && (
        <>
          {/* 提醒类型设置 */}
          <AtCard className="reminder-types-card">
            <AtDivider content="提醒频率" fontColor="#6190E8" lineColor="#6190E8" />

            <AtList>
              <AtListItem
                title="每日运势"
                extraText={
                  settings.customSettings[FortuneType.DAILY]?.enabled ? '已开启' : '已关闭'
                }
                switchIsCheck={settings.customSettings[FortuneType.DAILY]?.enabled || false}
                isSwitch
                onSwitchChange={event =>
                  setSettings(prev => {
                    const currentDaily = prev.customSettings[FortuneType.DAILY];
                    return {
                      ...prev,
                      customSettings: {
                        ...prev.customSettings,
                        [FortuneType.DAILY]: {
                          enabled: event.detail.value,
                          reminderTime: currentDaily?.reminderTime || '08:00',
                          pushTypes: currentDaily?.pushTypes || ['system'],
                        },
                      },
                    };
                  })
                }
              />

              {settings.customSettings[FortuneType.DAILY]?.enabled && (
                <View className="time-setting">
                  <Text className="time-label">提醒时间：</Text>
                  <Picker
                    mode="time"
                    value={settings.customSettings[FortuneType.DAILY]?.reminderTime || '08:00'}
                    onChange={e =>
                      setSettings(prev => {
                        const currentDaily = prev.customSettings[FortuneType.DAILY];
                        return {
                          ...prev,
                          customSettings: {
                            ...prev.customSettings,
                            [FortuneType.DAILY]: {
                              enabled: currentDaily?.enabled || false,
                              reminderTime: e.detail.value,
                              pushTypes: currentDaily?.pushTypes || ['system'],
                            },
                          },
                        };
                      })
                    }
                  >
                    <View className="time-picker">
                      <Text className="time-value">
                        {settings.customSettings[FortuneType.DAILY]?.reminderTime || '08:00'}
                      </Text>
                      <AtIcon value="chevron-right" size="16" color="#999"></AtIcon>
                    </View>
                  </Picker>
                </View>
              )}

              <AtListItem
                title="每周运势"
                extraText={
                  settings.customSettings[FortuneType.WEEKLY]?.enabled ? '已开启' : '已关闭'
                }
                switchIsCheck={settings.customSettings[FortuneType.WEEKLY]?.enabled || false}
                isSwitch
                onSwitchChange={event =>
                  setSettings(prev => {
                    const currentWeekly = prev.customSettings[FortuneType.WEEKLY];
                    return {
                      ...prev,
                      customSettings: {
                        ...prev.customSettings,
                        [FortuneType.WEEKLY]: {
                          enabled: event.detail.value,
                          reminderTime: currentWeekly?.reminderTime || '09:00',
                          pushTypes: currentWeekly?.pushTypes || ['system'],
                        },
                      },
                    };
                  })
                }
              />

              {settings.customSettings[FortuneType.WEEKLY]?.enabled && (
                <View className="time-setting">
                  <Text className="time-label">提醒时间：</Text>
                  <Picker
                    mode="time"
                    value={settings.customSettings[FortuneType.WEEKLY]?.reminderTime || '09:00'}
                    onChange={e =>
                      setSettings(prev => {
                        const currentWeekly = prev.customSettings[FortuneType.WEEKLY];
                        return {
                          ...prev,
                          customSettings: {
                            ...prev.customSettings,
                            [FortuneType.WEEKLY]: {
                              enabled: currentWeekly?.enabled || false,
                              reminderTime: e.detail.value,
                              pushTypes: currentWeekly?.pushTypes || ['system'],
                            },
                          },
                        };
                      })
                    }
                  >
                    <View className="time-picker">
                      <Text className="time-value">
                        {settings.customSettings[FortuneType.WEEKLY]?.reminderTime || '09:00'}
                      </Text>
                      <AtIcon value="chevron-right" size="16" color="#999"></AtIcon>
                    </View>
                  </Picker>
                </View>
              )}

              <AtListItem
                title="每月运势"
                extraText={
                  settings.customSettings[FortuneType.MONTHLY]?.enabled ? '已开启' : '已关闭'
                }
                switchIsCheck={settings.customSettings[FortuneType.MONTHLY]?.enabled || false}
                isSwitch
                onSwitchChange={event =>
                  setSettings(prev => {
                    const currentMonthly = prev.customSettings[FortuneType.MONTHLY];
                    return {
                      ...prev,
                      customSettings: {
                        ...prev.customSettings,
                        [FortuneType.MONTHLY]: {
                          enabled: event.detail.value,
                          reminderTime: currentMonthly?.reminderTime || '10:00',
                          pushTypes: currentMonthly?.pushTypes || ['system'],
                        },
                      },
                    };
                  })
                }
              />

              {settings.customSettings[FortuneType.MONTHLY]?.enabled && (
                <View className="time-setting">
                  <Text className="time-label">提醒时间：</Text>
                  <Picker
                    mode="time"
                    value={settings.customSettings[FortuneType.MONTHLY]?.reminderTime || '10:00'}
                    onChange={e =>
                      setSettings(prev => {
                        const currentMonthly = prev.customSettings[FortuneType.MONTHLY];
                        return {
                          ...prev,
                          customSettings: {
                            ...prev.customSettings,
                            [FortuneType.MONTHLY]: {
                              enabled: currentMonthly?.enabled || false,
                              reminderTime: e.detail.value,
                              pushTypes: currentMonthly?.pushTypes || ['system'],
                            },
                          },
                        };
                      })
                    }
                  >
                    <View className="time-picker">
                      <Text className="time-value">
                        {settings.customSettings[FortuneType.MONTHLY]?.reminderTime || '10:00'}
                      </Text>
                      <AtIcon value="chevron-right" size="16" color="#999"></AtIcon>
                    </View>
                  </Picker>
                </View>
              )}
            </AtList>
          </AtCard>

          {/* 推送内容设置 */}
          <AtCard className="push-content-card">
            <AtDivider content="推送内容" fontColor="#6190E8" lineColor="#6190E8" />

            <View className="push-types">
              {pushTypeOptions.map(option => (
                <View
                  key={option.value}
                  className={`push-type-item ${settings.pushTypes.includes(option.value) ? 'active' : ''}`}
                  onClick={() => handleTypeToggle(option.value)}
                >
                  <AtIcon
                    value={option.icon}
                    size="20"
                    color={settings.pushTypes.includes(option.value) ? option.color : '#ccc'}
                  ></AtIcon>
                  <Text
                    className="type-label"
                    style={{
                      color: settings.pushTypes.includes(option.value) ? option.color : '#999',
                    }}
                  >
                    {option.label}
                  </Text>
                  {settings.pushTypes.includes(option.value) && (
                    <AtIcon value="check-circle" size="16" color={option.color}></AtIcon>
                  )}
                </View>
              ))}
            </View>
          </AtCard>

          {/* 提醒方式设置 */}
          <AtCard className="notification-style-card">
            <AtDivider content="提醒方式" fontColor="#6190E8" lineColor="#6190E8" />

            <AtList>
              <AtListItem
                title="声音提醒"
                extraText={settings.soundEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.soundEnabled}
                isSwitch
                onSwitchChange={event =>
                  setSettings(prev => ({ ...prev, soundEnabled: event.detail.value }))
                }
              />

              <AtListItem
                title="震动提醒"
                extraText={settings.vibrationEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.vibrationEnabled}
                isSwitch
                onSwitchChange={event =>
                  setSettings(prev => ({ ...prev, vibrationEnabled: event.detail.value }))
                }
              />
            </AtList>
          </AtCard>

          {/* 操作按钮 */}
          <View className="action-buttons">
            <AtButton type="primary" size="normal" loading={saving} onClick={saveReminderSettings}>
              保存设置
            </AtButton>

            <AtButton type="secondary" size="normal" onClick={testReminder}>
              测试提醒
            </AtButton>
          </View>
        </>
      )}
    </View>
  );
};

export default FortuneReminder;
