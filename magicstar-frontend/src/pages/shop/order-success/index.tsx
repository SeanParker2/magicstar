import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { AtButton, AtIcon } from 'taro-ui'
import Taro from '@tarojs/taro'
import './index.css'

interface OrderData {
  id: number
  items: any[]
  totalAmount: number
  finalAmount: number
  paymentMethod: string
  status: string
  createdAt: string
}

const OrderSuccess: React.FC = () => {
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrderData()
  }, [])

  const loadOrderData = async () => {
    try {
      const params = Taro.getCurrentInstance().router?.params
      if (params?.orderId) {
        const cachedOrder = Taro.getStorageSync(`order_${params.orderId}`)
        if (cachedOrder) {
          setOrderData(cachedOrder)
        }
      }
    } catch (error) {
      console.error('加载订单数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = () => {
    if (orderData) {
      Taro.navigateTo({
        url: `/pages/shop/order-detail/index?id=${orderData.id}`
      })
    }
  }

  const handleBackToHome = () => {
    Taro.switchTab({
      url: '/pages/index/index'
    })
  }

  const handleContinueShopping = () => {
    Taro.navigateTo({
      url: '/pages/shop/products/index'
    })
  }

  const getPaymentMethodName = (method: string) => {
    const methods = {
      wechat: '微信支付',
      alipay: '支付宝',
      apple: 'Apple Pay',
      card: '银行卡'
    }
    return methods[method] || method
  }

  if (loading) {
    return (
      <View className='order-success-loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!orderData) {
    return (
      <View className='order-success-error'>
        <AtIcon value='close-circle' size='60' color='#e74c3c' />
        <Text className='error-title'>订单信息获取失败</Text>
        <Text className='error-desc'>请稍后重试或联系客服</Text>
        <AtButton type='primary' onClick={handleBackToHome}>
          返回首页
        </AtButton>
      </View>
    )
  }

  return (
    <View className='order-success'>
      <View className='success-header'>
        <AtIcon value='check-circle' size='80' color='#52c41a' />
        <Text className='success-title'>支付成功</Text>
        <Text className='success-desc'>您的订单已支付成功，我们将尽快为您处理</Text>
      </View>

      <View className='order-info'>
        <View className='info-row'>
          <Text className='label'>订单号</Text>
          <Text className='value'>{orderData.id}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>支付方式</Text>
          <Text className='value'>{getPaymentMethodName(orderData.paymentMethod)}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>支付金额</Text>
          <Text className='value amount'>¥{orderData.finalAmount}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>支付时间</Text>
          <Text className='value'>{new Date(orderData.createdAt).toLocaleString()}</Text>
        </View>
      </View>

      <View className='order-items'>
        <Text className='section-title'>商品清单</Text>
        {orderData.items.map((item, index) => (
          <View key={index} className='item'>
            <View className='item-info'>
              <Text className='item-name'>{item.product?.name || '商品'}</Text>
              <Text className='item-spec'>数量: {item.quantity}</Text>
            </View>
            <Text className='item-price'>¥{(item.product?.price || 0) * item.quantity}</Text>
          </View>
        ))}
      </View>

      <View className='action-buttons'>
        <AtButton 
          type='secondary' 
          onClick={handleViewOrder}
          className='view-order-btn'
        >
          查看订单
        </AtButton>
        <AtButton 
          type='primary' 
          onClick={handleContinueShopping}
          className='continue-shopping-btn'
        >
          继续购物
        </AtButton>
      </View>

      <View className='back-home'>
        <AtButton 
          type='secondary' 
          size='small'
          onClick={handleBackToHome}
        >
          返回首页
        </AtButton>
      </View>
    </View>
  )
}

export default OrderSuccess