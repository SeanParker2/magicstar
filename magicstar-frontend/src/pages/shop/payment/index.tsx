import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { AtButton, AtRadio } from 'taro-ui'
import Taro from '@tarojs/taro'
import { shopService } from '../../../services/shop'
import './index.css'

interface PaymentMethod {
  id: string
  name: string
  icon: string
  enabled: boolean
}

interface OrderInfo {
  items: any[]
  totalAmount: number
  shippingFee: number
  discountAmount: number
  finalAmount: number
}

const Payment: React.FC = () => {
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('wechat')
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const paymentMethods: PaymentMethod[] = [
    { id: 'wechat', name: '微信支付', icon: '💚', enabled: true },
    { id: 'alipay', name: '支付宝', icon: '🔵', enabled: true },
    { id: 'apple', name: 'Apple Pay', icon: '🍎', enabled: false },
    { id: 'card', name: '银行卡', icon: '💳', enabled: false }
  ]

  useEffect(() => {
    loadOrderInfo()
  }, [])

  const loadOrderInfo = async () => {
    try {
      setLoading(true)
      // 从路由参数或缓存中获取订单信息
      const params = Taro.getCurrentInstance().router?.params
      if (params?.orderId) {
        // 如果有订单ID，从缓存或本地存储获取订单信息
        const cachedOrder = Taro.getStorageSync(`order_${params.orderId}`)
        if (cachedOrder) {
          setOrderInfo(cachedOrder)
        } else {
          throw new Error('订单信息不存在')
        }
      } else {
        // 否则从购物车创建订单信息
        const cart = await shopService.getCart()
        setOrderInfo({
          items: cart.items || [],
          totalAmount: cart.totalAmount || 0,
          shippingFee: 10, // 默认运费
          discountAmount: 0,
          finalAmount: (cart.totalAmount || 0) + 10
        })
      }
    } catch (error) {
      console.error('加载订单信息失败:', error)
      Taro.showToast({
        title: '加载订单信息失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!orderInfo) return

    try {
      setPaymentLoading(true)
      
      // 模拟支付处理
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 清空购物车
      await shopService.clearCart()
      
      // 生成订单ID
      const orderId = Date.now()
      
      // 保存订单信息到本地存储
      const orderData = {
        id: orderId,
        ...orderInfo,
        paymentMethod: selectedPaymentMethod,
        status: 'paid',
        createdAt: new Date().toISOString()
      }
      Taro.setStorageSync(`order_${orderId}`, orderData)
      
      Taro.showToast({
        title: '支付成功',
        icon: 'success'
      })
      
      // 跳转到成功页面
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/shop/order-success/index?orderId=${orderId}`
        })
      }, 1500)
    } catch (error) {
      console.error('支付失败:', error)
      Taro.showToast({
        title: '支付失败',
        icon: 'error'
      })
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value)
  }

  if (loading) {
    return (
      <View className='payment-loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!orderInfo) {
    return (
      <View className='payment-error'>
        <Text>订单信息加载失败</Text>
        <AtButton onClick={loadOrderInfo}>重试</AtButton>
      </View>
    )
  }

  return (
    <View className='payment'>
      <View className='order-summary'>
        <Text className='section-title'>订单摘要</Text>
        <View className='order-items'>
          {orderInfo.items.map((item, index) => (
            <View key={index} className='order-item'>
              <View className='item-info'>
                <Text className='item-name'>{item.product?.name || '商品'}</Text>
                <Text className='item-spec'>数量: {item.quantity}</Text>
              </View>
              <Text className='item-price'>¥{(item.product?.price || 0) * item.quantity}</Text>
            </View>
          ))}
        </View>
        
        <View className='price-breakdown'>
          <View className='price-row'>
            <Text>商品总价</Text>
            <Text>¥{orderInfo.totalAmount}</Text>
          </View>
          <View className='price-row'>
            <Text>运费</Text>
            <Text>¥{orderInfo.shippingFee}</Text>
          </View>
          {orderInfo.discountAmount > 0 && (
            <View className='price-row discount'>
              <Text>优惠</Text>
              <Text>-¥{orderInfo.discountAmount}</Text>
            </View>
          )}
          <View className='price-row total'>
            <Text>实付金额</Text>
            <Text>¥{orderInfo.finalAmount}</Text>
          </View>
        </View>
      </View>

      <View className='payment-methods'>
        <Text className='section-title'>支付方式</Text>
        <AtRadio
          options={paymentMethods.filter(method => method.enabled).map(method => ({
            label: `${method.icon} ${method.name}`,
            value: method.id
          }))}
          value={selectedPaymentMethod}
          onClick={handlePaymentMethodChange}
        />
      </View>

      <View className='payment-footer'>
        <View className='total-amount'>
          <Text className='amount-label'>实付金额</Text>
          <Text className='amount-value'>¥{orderInfo.finalAmount}</Text>
        </View>
        <AtButton
          type='primary'
          loading={paymentLoading}
          onClick={handlePayment}
          className='pay-button'
        >
          {paymentLoading ? '支付中...' : '立即支付'}
        </AtButton>
      </View>
    </View>
  )
}

export default Payment