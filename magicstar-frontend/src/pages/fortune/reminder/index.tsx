import React, { useState, useEffect } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtCard, AtButton, AtIcon, AtSwitch, AtList, AtListItem, AtDivider } from 'taro-ui';
import './index.scss';

interface ReminderSettings {
  id?: string;
  enabled: boolean;
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  dailyTime: string;
  weeklyDay: number; // 0-6, 0为周日
  weeklyTime: string;
  monthlyDay: number; // 1-28
  monthlyTime: string;
  pushTypes: string[]; // ['overall', 'love', 'career', 'wealth', 'health']
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const FortuneReminder: React.FC = () => {
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    dailyEnabled: true,
    weeklyEnabled: false,
    monthlyEnabled: false,
    dailyTime: '08:00',
    weeklyDay: 1, // 周一
    weeklyTime: '09:00',
    monthlyDay: 1,
    monthlyTime: '10:00',
    pushTypes: ['overall'],
    soundEnabled: true,
    vibrationEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const pushTypeOptions = [
    { value: 'overall', label: '综合运势', icon: 'star', color: '#6190E8' },
    { value: 'love', label: '爱情运势', icon: 'heart', color: '#f5222d' },
    { value: 'career', label: '事业运势', icon: 'briefcase', color: '#52c41a' },
    { value: 'wealth', label: '财富运势', icon: 'money', color: '#faad14' },
    { value: 'health', label: '健康运势', icon: 'heart-2', color: '#722ed1' }
  ];

  useEffect(() => {
    loadReminderSettings();
  }, []);

  const loadReminderSettings = async () => {
    try {
      setLoading(true);
      
      const response = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/reminder/settings`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('token')}`
        }
      });
      
      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('获取提醒设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReminderSettings = async () => {
    try {
      setSaving(true);
      
      const response = await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/reminder/settings`,
        method: 'POST',
        data: settings,
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('token')}`
        }
      });
      
      if (response.data.success) {
        Taro.showToast({
          title: '设置保存成功',
          icon: 'success'
        });
      } else {
        throw new Error(response.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存提醒设置失败:', error);
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
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
        success: (res) => {
          console.log('订阅消息权限:', res);
        },
        fail: (err) => {
          console.error('订阅消息权限失败:', err);
        }
      });
    }
  };

  const handleTypeToggle = (type: string) => {
    setSettings(prev => ({
      ...prev,
      pushTypes: prev.pushTypes.includes(type)
        ? prev.pushTypes.filter(t => t !== type)
        : [...prev.pushTypes, type]
    }));
  };

  const handleTimeChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDayChange = (field: string, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const testReminder = async () => {
    try {
      await Taro.request({
        url: `${process.env.TARO_APP_API_URL}/fortune/reminder/test`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('token')}`
        }
      });
      
      Taro.showToast({
        title: '测试提醒已发送',
        icon: 'success'
      });
    } catch (error) {
      console.error('发送测试提醒失败:', error);
      Taro.showToast({
        title: '发送失败',
        icon: 'error'
      });
    }
  };

  if (loading) {
    return (
      <View className='reminder-loading'>
        <AtIcon value='loading-3' size='30' color='#6190E8'></AtIcon>
        <Text className='loading-text'>正在加载提醒设置...</Text>
      </View>
    );
  }

  return (
    <View className='fortune-reminder-container'>
      {/* 主开关 */}
      <AtCard className='main-switch-card'>
        <View className='main-switch'>
          <View className='switch-info'>
            <AtIcon value='bell' size='24' color='#6190E8'></AtIcon>
            <View className='switch-text'>
              <Text className='switch-title'>运势提醒</Text>
              <Text className='switch-desc'>开启后将定时推送运势信息</Text>
            </View>
          </View>
          <AtSwitch 
            checked={settings.enabled}
            onChange={handleMainSwitchChange}
          />
        </View>
      </AtCard>

      {settings.enabled && (
        <>
          {/* 提醒类型设置 */}
          <AtCard className='reminder-types-card'>
            <AtDivider content='提醒频率' fontColor='#6190E8' lineColor='#6190E8' />
            
            <AtList>
              <AtListItem
                title='每日运势'
                extraText={settings.dailyEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.dailyEnabled}
                isSwitch
                onSwitchChange={(event) => setSettings(prev => ({ ...prev, dailyEnabled: event.detail.value }))}
              />
              
              {settings.dailyEnabled && (
                <View className='time-setting'>
                  <Text className='time-label'>提醒时间：</Text>
                  <Picker
                    mode='time'
                    value={settings.dailyTime}
                    onChange={(e) => handleTimeChange('dailyTime', e.detail.value)}
                  >
                    <View className='time-picker'>
                      <Text className='time-value'>{settings.dailyTime}</Text>
                      <AtIcon value='chevron-right' size='16' color='#999'></AtIcon>
                    </View>
                  </Picker>
                </View>
              )}
              
              <AtListItem
                title='每周运势'
                extraText={settings.weeklyEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.weeklyEnabled}
                isSwitch
                onSwitchChange={(event) => setSettings(prev => ({ ...prev, weeklyEnabled: event.detail.value }))}
              />
              
              {settings.weeklyEnabled && (
                <View className='weekly-setting'>
                  <View className='setting-row'>
                    <Text className='setting-label'>提醒日期：</Text>
                    <Picker
                      mode='selector'
                      range={weekDays}
                      value={settings.weeklyDay}
                      onChange={(e) => handleDayChange('weeklyDay', Number(e.detail.value))}
                    >
                      <View className='day-picker'>
                        <Text className='day-value'>{weekDays[settings.weeklyDay]}</Text>
                        <AtIcon value='chevron-right' size='16' color='#999'></AtIcon>
                      </View>
                    </Picker>
                  </View>
                  
                  <View className='setting-row'>
                    <Text className='setting-label'>提醒时间：</Text>
                    <Picker
                      mode='time'
                      value={settings.weeklyTime}
                      onChange={(e) => handleTimeChange('weeklyTime', e.detail.value)}
                    >
                      <View className='time-picker'>
                        <Text className='time-value'>{settings.weeklyTime}</Text>
                        <AtIcon value='chevron-right' size='16' color='#999'></AtIcon>
                      </View>
                    </Picker>
                  </View>
                </View>
              )}
              
              <AtListItem
                title='每月运势'
                extraText={settings.monthlyEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.monthlyEnabled}
                isSwitch
                onSwitchChange={(event) => setSettings(prev => ({ ...prev, monthlyEnabled: event.detail.value }))}
              />
              
              {settings.monthlyEnabled && (
                <View className='monthly-setting'>
                  <View className='setting-row'>
                    <Text className='setting-label'>提醒日期：</Text>
                    <Picker
                      mode='selector'
                      range={Array.from({ length: 28 }, (_, i) => `${i + 1}日`)}
                      value={settings.monthlyDay - 1}
                      onChange={(e) => handleDayChange('monthlyDay', Number(e.detail.value) + 1)}
                    >
                      <View className='day-picker'>
                        <Text className='day-value'>{settings.monthlyDay}日</Text>
                        <AtIcon value='chevron-right' size='16' color='#999'></AtIcon>
                      </View>
                    </Picker>
                  </View>
                  
                  <View className='setting-row'>
                    <Text className='setting-label'>提醒时间：</Text>
                    <Picker
                      mode='time'
                      value={settings.monthlyTime}
                      onChange={(e) => handleTimeChange('monthlyTime', e.detail.value)}
                    >
                      <View className='time-picker'>
                        <Text className='time-value'>{settings.monthlyTime}</Text>
                        <AtIcon value='chevron-right' size='16' color='#999'></AtIcon>
                      </View>
                    </Picker>
                  </View>
                </View>
              )}
            </AtList>
          </AtCard>

          {/* 推送内容设置 */}
          <AtCard className='push-content-card'>
            <AtDivider content='推送内容' fontColor='#6190E8' lineColor='#6190E8' />
            
            <View className='push-types'>
              {pushTypeOptions.map((option) => (
                <View 
                  key={option.value}
                  className={`push-type-item ${settings.pushTypes.includes(option.value) ? 'active' : ''}`}
                  onClick={() => handleTypeToggle(option.value)}
                >
                  <AtIcon 
                    value={option.icon} 
                    size='20' 
                    color={settings.pushTypes.includes(option.value) ? option.color : '#ccc'}
                  ></AtIcon>
                  <Text 
                    className='type-label'
                    style={{ 
                      color: settings.pushTypes.includes(option.value) ? option.color : '#999' 
                    }}
                  >
                    {option.label}
                  </Text>
                  {settings.pushTypes.includes(option.value) && (
                    <AtIcon value='check-circle' size='16' color={option.color}></AtIcon>
                  )}
                </View>
              ))}
            </View>
          </AtCard>

          {/* 提醒方式设置 */}
          <AtCard className='notification-style-card'>
            <AtDivider content='提醒方式' fontColor='#6190E8' lineColor='#6190E8' />
            
            <AtList>
              <AtListItem
                title='声音提醒'
                extraText={settings.soundEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.soundEnabled}
                isSwitch
                onSwitchChange={(event) => setSettings(prev => ({ ...prev, soundEnabled: event.detail.value }))}
              />
              
              <AtListItem
                title='震动提醒'
                extraText={settings.vibrationEnabled ? '已开启' : '已关闭'}
                switchIsCheck={settings.vibrationEnabled}
                isSwitch
                onSwitchChange={(event) => setSettings(prev => ({ ...prev, vibrationEnabled: event.detail.value }))}
              />
            </AtList>
          </AtCard>

          {/* 操作按钮 */}
          <View className='action-buttons'>
            <AtButton 
              type='primary'
              size='normal'
              loading={saving}
              onClick={saveReminderSettings}
            >
              保存设置
            </AtButton>
            
            <AtButton 
              type='secondary'
              size='normal'
              onClick={testReminder}
            >
              测试提醒
            </AtButton>
          </View>
        </>
      )}
    </View>
  );
};

export default FortuneReminder;