import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { AtTabs, AtTabsPane, AtButton } from 'taro-ui'
import Taro from '@tarojs/taro'
import './index.css'

interface Order {
  id: number
  items: any[]
  totalAmount: number
  finalAmount: number
  paymentMethod: string
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
}

const OrderList: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const tabList = [
    { title: '全部' },
    { title: '待付款' },
    { title: '待发货' },
    { title: '待收货' },
    { title: '已完成' }
  ]

  const statusMap = {
    pending: '待付款',
    paid: '待发货',
    shipped: '待收货',
    delivered: '已完成',
    cancelled: '已取消'
  }

  useEffect(() => {
    loadOrders()
  }, [currentTab])

  const loadOrders = async () => {
    try {
      setLoading(true)
      // 从本地存储获取订单数据
      const allOrders: Order[] = []
      const storage = Taro.getStorageInfoSync()
      
      storage.keys.forEach(key => {
        if (key.startsWith('order_')) {
          const order = Taro.getStorageSync(key)
          if (order) {
            allOrders.push(order)
          }
        }
      })

      // 根据当前tab过滤订单
      let filteredOrders = allOrders
      if (currentTab === 1) {
        filteredOrders = allOrders.filter(order => order.status === 'pending')
      } else if (currentTab === 2) {
        filteredOrders = allOrders.filter(order => order.status === 'paid')
      } else if (currentTab === 3) {
        filteredOrders = allOrders.filter(order => order.status === 'shipped')
      } else if (currentTab === 4) {
        filteredOrders = allOrders.filter(order => order.status === 'delivered')
      }

      // 按创建时间倒序排列
      filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      setOrders(filteredOrders)
    } catch (error) {
      console.error('加载订单失败:', error)
      Taro.showToast({
        title: '加载订单失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTabClick = (value: number) => {
    setCurrentTab(value)
  }

  const handleOrderClick = (orderId: number) => {
    Taro.navigateTo({
      url: `/pages/shop/order-detail/index?id=${orderId}`
    })
  }

  const handlePayOrder = (orderId: number) => {
    Taro.navigateTo({
      url: `/pages/shop/payment/index?orderId=${orderId}`
    })
  }

  const handleCancelOrder = async (orderId: number) => {
    try {
      const result = await Taro.showModal({
        title: '确认取消',
        content: '确定要取消这个订单吗？'
      })
      
      if (result.confirm) {
        // 更新订单状态
        const orderKey = `order_${orderId}`
        const order = Taro.getStorageSync(orderKey)
        if (order) {
          order.status = 'cancelled'
          Taro.setStorageSync(orderKey, order)
          loadOrders() // 重新加载订单列表
          Taro.showToast({
            title: '订单已取消',
            icon: 'success'
          })
        }
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      Taro.showToast({
        title: '取消订单失败',
        icon: 'error'
      })
    }
  }

  const renderOrderItem = (order: Order) => {
    return (
      <View key={order.id} className='order-item' onClick={() => handleOrderClick(order.id)}>
        <View className='order-header'>
          <Text className='order-id'>订单号: {order.id}</Text>
          <Text className={`order-status status-${order.status}`}>
            {statusMap[order.status]}
          </Text>
        </View>
        
        <View className='order-products'>
          {order.items.map((item, index) => (
            <View key={index} className='product-item'>
              <View className='product-info'>
                <Text className='product-name'>{item.product?.name || '商品'}</Text>
                <Text className='product-spec'>数量: {item.quantity}</Text>
              </View>
              <Text className='product-price'>¥{(item.product?.price || 0) * item.quantity}</Text>
            </View>
          ))}
        </View>
        
        <View className='order-footer'>
          <Text className='total-amount'>总计: ¥{order.finalAmount}</Text>
          <View className='order-actions'>
            {order.status === 'pending' && (
              <>
                <AtButton 
                  size='small' 
                  type='secondary'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelOrder(order.id)
                  }}
                >
                  取消订单
                </AtButton>
                <AtButton 
                  size='small' 
                  type='primary'
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePayOrder(order.id)
                  }}
                >
                  立即付款
                </AtButton>
              </>
            )}
            {order.status === 'shipped' && (
              <AtButton size='small' type='primary'>
                确认收货
              </AtButton>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='order-list'>
      <AtTabs 
        current={currentTab} 
        tabList={tabList} 
        onClick={handleTabClick}
        className='order-tabs'
      >
        {tabList.map((_, index) => (
          <AtTabsPane key={index} current={currentTab} index={index}>
            <View className='tab-content'>
              {loading ? (
                <View className='loading-state'>
                  <Text>加载中...</Text>
                </View>
              ) : orders.length > 0 ? (
                <View className='orders-container'>
                  {orders.map(order => renderOrderItem(order))}
                </View>
              ) : (
                <View className='empty-state'>
                  <Text>暂无订单</Text>
                  <AtButton 
                    type='primary' 
                    size='small'
                    onClick={() => {
                      Taro.navigateTo({
                        url: '/pages/shop/products/index'
                      })
                    }}
                  >
                    去购物
                  </AtButton>
                </View>
              )}
            </View>
          </AtTabsPane>
        ))}
      </AtTabs>
    </View>
  )
}

export default OrderList