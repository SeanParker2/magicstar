import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { AtSearchBar } from 'taro-ui'
import Taro from '@tarojs/taro'
import { shopService, Product } from '../../../services/shop'
import './index.css'

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    loadProducts()
  }, [category])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const categoryId = category === 'all' ? undefined : parseInt(category)
      const response = await shopService.getProducts({ categoryId, keyword: searchValue })
      setProducts(response.products || [])
    } catch (error) {
      console.error('加载商品失败:', error)
      Taro.showToast({
        title: '加载商品失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchValue(value)
    loadProducts()
  }

  const handleProductClick = (productId: number) => {
    Taro.navigateTo({
      url: `/pages/shop/product-detail/index?id=${productId}`
    })
  }

  const categories = [
    { value: 'all', label: '全部' },
    { value: '1', label: '水晶' },
    { value: '2', label: '塔罗牌' },
    { value: '3', label: '书籍' },
    { value: '4', label: '配饰' }
  ]

  return (
    <View className='product-list'>
      <View className='search-bar'>
        <AtSearchBar
          value={searchValue}
          onChange={handleSearch}
          onActionClick={() => handleSearch(searchValue)}
          placeholder='搜索商品'
        />
      </View>

      <View className='category-tabs'>
        {categories.map(cat => (
          <View
            key={cat.value}
            className={`category-tab ${category === cat.value ? 'active' : ''}`}
            onClick={() => setCategory(cat.value)}
          >
            <Text>{cat.label}</Text>
          </View>
        ))}
      </View>

      <View className='product-grid'>
        {products.map(product => (
          <View
            key={product.id}
            className='product-item'
            onClick={() => handleProductClick(product.id)}
          >
            <View className='product-image'>
              <Text>📦</Text>
            </View>
            <View className='product-info'>
              <Text className='product-name'>{product.name}</Text>
              <Text className='product-price'>¥{product.price}</Text>
              <Text className='product-desc'>{product.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {products.length === 0 && !loading && (
        <View className='empty-state'>
          <Text>暂无商品</Text>
        </View>
      )}

      {loading && (
        <View className='loading-state'>
          <Text>加载中...</Text>
        </View>
      )}
    </View>
  )
}

export default ProductList