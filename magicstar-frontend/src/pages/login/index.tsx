import { Component, PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import { AtForm, AtInput, AtButton } from 'taro-ui'
import Taro from '@tarojs/taro'

import "taro-ui/dist/style/components/form.scss"
import "taro-ui/dist/style/components/input.scss"
import "taro-ui/dist/style/components/button.scss"
import './index.scss'

interface LoginState {
  username: string
  password: string
}

export default class Login extends Component<PropsWithChildren, LoginState> {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
      password: ''
    }
  }

  componentDidMount() {}

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  handleUsernameChange = (value: string) => {
    this.setState({ username: value })
  }

  handlePasswordChange = (value: string) => {
    this.setState({ password: value })
  }

  handleLogin = () => {
    const { username, password } = this.state
    if (!username || !password) {
      Taro.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      })
      return
    }
    
    // TODO: 调用登录API
    console.log('登录信息:', { username, password })
    
    Taro.showToast({
      title: '登录功能开发中',
      icon: 'none'
    })
  }

  handleRegister = () => {
    Taro.navigateTo({
      url: '/pages/register/index'
    })
  }

  render() {
    const { username, password } = this.state
    
    return (
      <View className='login-page'>
        <View className='login-header'>
          <Text className='login-title'>Magic Lightning</Text>
          <Text className='login-subtitle'>探索神秘的占卜世界</Text>
        </View>
        
        <View className='login-form'>
          <AtForm>
            <AtInput
              name='username'
              title='用户名'
              type='text'
              placeholder='请输入用户名/邮箱/手机号'
              value={username}
              onChange={this.handleUsernameChange}
            />
            <AtInput
              name='password'
              title='密码'
              type='password'
              placeholder='请输入密码'
              value={password}
              onChange={this.handlePasswordChange}
            />
          </AtForm>
          
          <View className='login-actions'>
            <AtButton
              type='primary'
              size='normal'
              onClick={this.handleLogin}
              className='login-btn'
            >
              登录
            </AtButton>
            
            <View className='login-links'>
              <Text className='link-text' onClick={this.handleRegister}>
                还没有账号？立即注册
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }
}