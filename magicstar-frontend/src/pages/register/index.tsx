import { Component, PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import { AtForm, AtInput, AtButton } from 'taro-ui'
import Taro from '@tarojs/taro'

import "taro-ui/dist/style/components/form.scss"
import "taro-ui/dist/style/components/input.scss"
import "taro-ui/dist/style/components/button.scss"
import './index.scss'

interface RegisterState {
  username: string
  email: string
  password: string
  confirmPassword: string
  _phone: string
}

export default class Register extends Component<PropsWithChildren, RegisterState> {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      _phone: ''
    }
  }

  componentDidMount() {}

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  handleInputChange = (field: keyof RegisterState) => (value: string) => {
    this.setState({ [field]: value } as Pick<RegisterState, keyof RegisterState>)
  }

  validateForm = () => {
    const { username, email, password, confirmPassword } = this.state
    
    if (!username || !email || !password || !confirmPassword) {
      Taro.showToast({
        title: '请填写所有必填项',
        icon: 'none'
      })
      return false
    }
    
    if (password !== confirmPassword) {
      Taro.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      })
      return false
    }
    
    if (password.length < 6) {
      Taro.showToast({
        title: '密码长度至少6位',
        icon: 'none'
      })
      return false
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Taro.showToast({
        title: '请输入有效的邮箱地址',
        icon: 'none'
      })
      return false
    }
    
    return true
  }

  handleRegister = () => {
    if (!this.validateForm()) {
      return
    }
    
    const { username, email, password, _phone } = this.state
    
    // TODO: 调用注册API
    console.log('注册信息:', { username, email, password, _phone })
    
    Taro.showToast({
      title: '注册功能开发中',
      icon: 'none'
    })
  }

  handleLogin = () => {
    Taro.navigateBack()
  }

  render() {
    const { username, email, password, confirmPassword, _phone } = this.state
    
    return (
      <View className='register-page'>
        <View className='register-header'>
          <Text className='register-title'>创建账号</Text>
          <Text className='register-subtitle'>加入Magic Lightning大家庭</Text>
        </View>
        
        <View className='register-form'>
          <AtForm>
            <AtInput
              name='username'
              title='用户名'
              type='text'
              placeholder='请输入用户名'
              value={username}
              onChange={this.handleInputChange('username')}
              required
            />
            <AtInput
              name='email'
              title='邮箱'
              type='text'
              placeholder='请输入邮箱地址'
              value={email}
              onChange={this.handleInputChange('email')}
              required
            />
            <AtInput
              name='phone'
              title='手机号'
              type='phone'
              placeholder='请输入手机号（可选）'
              value={_phone}
              onChange={this.handleInputChange('_phone')}
            />
            <AtInput
              name='password'
              title='密码'
              type='password'
              placeholder='请输入密码（至少6位）'
              value={password}
              onChange={this.handleInputChange('password')}
              required
            />
            <AtInput
              name='confirmPassword'
              title='确认密码'
              type='password'
              placeholder='请再次输入密码'
              value={confirmPassword}
              onChange={this.handleInputChange('confirmPassword')}
              required
            />
          </AtForm>
          
          <View className='register-actions'>
            <AtButton
              type='primary'
              size='normal'
              onClick={this.handleRegister}
              className='register-btn'
            >
              注册
            </AtButton>
            
            <View className='register-links'>
              <Text className='link-text' onClick={this.handleLogin}>
                已有账号？立即登录
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }
}