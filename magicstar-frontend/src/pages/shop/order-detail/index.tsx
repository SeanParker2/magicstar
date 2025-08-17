import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { AtButton, AtSteps, AtIcon } from 'taro-ui'
import Taro from '@tarojs/taro'
import './index.css'

interface OrderDetail {
  id: number
  items: any[]
  totalAmount: number
  shippingFee: number
  discountAmount: number
  finalAmount: number
  paymentMethod: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  paidAt?: string
  shippedAt?: string
  deliveredAt?: string
  shippingAddress?: {
    name: string
    phone: string
    address: string
  }
  trackingNumber?: string
}

const OrderDetail: React.FC = () => {
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const statusMap = {
    pending: '待付款',
    paid: '待发货',
    shipped: '待收货',
    delivered: '已完成',
    cancelled: '已取消'
  }

  const paymentMethodMap = {
    wechat: '微信支付',
    alipay: '支付宝',
    apple: 'Apple Pay',
    card: '银行卡'
  }

  useEffect(() => {
    loadOrderDetail()
  }, [])

  const loadOrderDetail = async () => {
    try {
      const params = Taro.getCurrentInstance().router?.params
      if (params?.id) {
        const orderData = Taro.getStorageSync(`order_${params.id}`)
        if (orderData) {
          setOrderDetail({
            ...orderData,
            shippingAddress: {
              name: '张三',
              phone: '138****8888',
              address: '北京市朝阳区某某街道某某小区某某号'
            },
            trackingNumber: orderData.status === 'shipped' || orderData.status === 'delivered' ? 'SF1234567890' : undefined
          })
        } else {
          throw new Error('订单不存在')
        }
      }
    } catch (error) {
      console.error('加载订单详情失败:', error)
      Taro.showToast({
        title: '订单不存在',
        icon: 'error'
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  const handlePayOrder = () => {
    if (orderDetail) {
      Taro.navigateTo({
        url: `/pages/shop/payment/index?orderId=${orderDetail.id}`
      })
    }
  }

  const handleCancelOrder = async () => {
    if (!orderDetail) return

    try {
      const result = await Taro.showModal({
        title: '确认取消',
        content: '确定要取消这个订单吗？'
      })
      
      if (result.confirm) {
        const updatedOrder = {
          ...orderDetail,
          status: 'cancelled' as const
        }
        Taro.setStorageSync(`order_${orderDetail.id}`, updatedOrder)
        setOrderDetail(updatedOrder)
        Taro.showToast({
          title: '订单已取消',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      Taro.showToast({
        title: '取消订单失败',
        icon: 'error'
      })
    }
  }

  const handleConfirmReceipt = async () => {
    if (!orderDetail) return

    try {
      const result = await Taro.showModal({
        title: '确认收货',
        content: '确认已收到商品吗？'
      })
      
      if (result.confirm) {
        const updatedOrder = {
          ...orderDetail,
          status: 'delivered' as const,
          deliveredAt: new Date().toISOString()
        }
        Taro.setStorageSync(`order_${orderDetail.id}`, updatedOrder)
        setOrderDetail(updatedOrder)
        Taro.showToast({
          title: '确认收货成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('确认收货失败:', error)
      Taro.showToast({
        title: '确认收货失败',
        icon: 'error'
      })
    }
  }

  const getOrderSteps = () => {
    if (!orderDetail) return []

    const steps: Array<{title: string; desc: string; status?: 'success' | 'error'}> = [
      {
        title: '订单提交',
        desc: new Date(orderDetail.createdAt).toLocaleString(),
        status: 'success'
      }
    ]

    if (orderDetail.status !== 'cancelled') {
      steps.push({
        title: '付款成功',
        desc: orderDetail.paidAt ? new Date(orderDetail.paidAt).toLocaleString() : '',
        status: ['paid', 'shipped', 'delivered'].includes(orderDetail.status) ? 'success' : undefined
      })

      steps.push({
        title: '商品发货',
        desc: orderDetail.shippedAt ? new Date(orderDetail.shippedAt).toLocaleString() : '',
        status: ['shipped', 'delivered'].includes(orderDetail.status) ? 'success' : undefined
      })

      steps.push({
        title: '确认收货',
        desc: orderDetail.deliveredAt ? new Date(orderDetail.deliveredAt).toLocaleString() : '',
        status: orderDetail.status === 'delivered' ? 'success' : undefined
      })
    } else {
      steps.push({
        title: '订单取消',
        desc: '订单已取消',
        status: 'error'
      })
    }

    return steps
  }

  if (loading) {
    return (
      <View className='order-detail-loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!orderDetail) {
    return (
      <View className='order-detail-error'>
        <Text>订单不存在</Text>
      </View>
    )
  }

  return (
    <View className='order-detail'>
      <View className='order-status'>
        <AtIcon 
          value={orderDetail.status === 'cancelled' ? 'close-circle' : 'check-circle'} 
          size='40' 
          color={orderDetail.status === 'cancelled' ? '#e74c3c' : '#52c41a'} 
        />
        <Text className='status-text'>{statusMap[orderDetail.status]}</Text>
        {orderDetail.status === 'shipped' && orderDetail.trackingNumber && (
          <Text className='tracking-number'>快递单号: {orderDetail.trackingNumber}</Text>
        )}
      </View>

      <View className='order-progress'>
        <Text className='section-title'>订单进度</Text>
        <AtSteps 
          items={getOrderSteps()}
          current={getOrderSteps().findIndex(step => !step.status)}
          onChange={() => {}}
        />
      </View>

      {orderDetail.shippingAddress && (
        <View className='shipping-info'>
          <Text className='section-title'>收货信息</Text>
          <View className='address-info'>
            <View className='address-row'>
              <Text className='label'>收货人</Text>
              <Text className='value'>{orderDetail.shippingAddress.name}</Text>
            </View>
            <View className='address-row'>
              <Text className='label'>联系电话</Text>
              <Text className='value'>{orderDetail.shippingAddress.phone}</Text>
            </View>
            <View className='address-row'>
              <Text className='label'>收货地址</Text>
              <Text className='value'>{orderDetail.shippingAddress.address}</Text>
            </View>
          </View>
        </View>
      )}

      <View className='order-items'>
        <Text className='section-title'>商品信息</Text>
        {orderDetail.items.map((item, index) => (
          <View key={index} className='item'>
            <View className='item-info'>
              <Text className='item-name'>{item.product?.name || '商品'}</Text>
              <Text className='item-spec'>数量: {item.quantity}</Text>
            </View>
            <Text className='item-price'>¥{(item.product?.price || 0) * item.quantity}</Text>
          </View>
        ))}
      </View>

      <View className='order-summary'>
        <Text className='section-title'>订单信息</Text>
        <View className='summary-row'>
          <Text className='label'>订单号</Text>
          <Text className='value'>{orderDetail.id}</Text>
        </View>
        <View className='summary-row'>
          <Text className='label'>下单时间</Text>
          <Text className='value'>{new Date(orderDetail.createdAt).toLocaleString()}</Text>
        </View>
        <View className='summary-row'>
          <Text className='label'>支付方式</Text>
          <Text className='value'>{paymentMethodMap[orderDetail.paymentMethod] || orderDetail.paymentMethod}</Text>
        </View>
        <View className='summary-row'>
          <Text className='label'>商品总价</Text>
          <Text className='value'>¥{orderDetail.totalAmount}</Text>
        </View>
        <View className='summary-row'>
          <Text className='label'>运费</Text>
          <Text className='value'>¥{orderDetail.shippingFee || 0}</Text>
        </View>
        {orderDetail.discountAmount > 0 && (
          <View className='summary-row'>
            <Text className='label'>优惠</Text>
            <Text className='value discount'>-¥{orderDetail.discountAmount}</Text>
          </View>
        )}
        <View className='summary-row total'>
          <Text className='label'>实付金额</Text>
          <Text className='value'>¥{orderDetail.finalAmount}</Text>
        </View>
      </View>

      <View className='action-buttons'>
        {orderDetail.status === 'pending' && (
          <>
            <AtButton 
              type='secondary' 
              onClick={handleCancelOrder}
              className='cancel-btn'
            >
              取消订单
            </AtButton>
            <AtButton 
              type='primary' 
              onClick={handlePayOrder}
              className='pay-btn'
            >
              立即付款
            </AtButton>
          </>
        )}
        {orderDetail.status === 'shipped' && (
          <AtButton 
            type='primary' 
            onClick={handleConfirmReceipt}
            className='confirm-btn'
          >
            确认收货
          </AtButton>
        )}
      </View>
    </View>
  )
}

export default OrderDetail