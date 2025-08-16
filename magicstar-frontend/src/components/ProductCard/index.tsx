import { Component } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { Product } from '../../services/shop';

import './index.scss';

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  showAddToCart?: boolean;
  onAddToCart?: (product: Product) => void;
  layout?: 'grid' | 'list';
}

export default class ProductCard extends Component<ProductCardProps> {
  static defaultProps = {
    showAddToCart: false,
    layout: 'grid',
  };

  // 处理商品点击
  handleProductClick = () => {
    const { product, onClick } = this.props;
    if (onClick) {
      onClick(product);
    } else {
      // 默认跳转到商品详情页
      Taro.navigateTo({
        url: `/pages/shop/product-detail/index?id=${product.id}`,
      });
    }
  };

  // 处理加入购物车
  handleAddToCart = e => {
    e.stopPropagation();
    const { product, onAddToCart } = this.props;
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  // 格式化价格
  formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // 计算折扣
  getDiscount = () => {
    const { product } = this.props;
    if (!product.originalPrice || product.originalPrice <= product.price) {
      return null;
    }
    const discount = Math.round((1 - product.price / product.originalPrice) * 10) / 10;
    return discount;
  };

  // 渲染网格布局
  renderGridLayout = () => {
    const { product, showAddToCart } = this.props;
    const discount = this.getDiscount();

    return (
      <View className="product-card grid-layout" onClick={this.handleProductClick}>
        <View className="product-image-container">
          <Image className="product-image" src={product.imageUrl} mode="aspectFill" lazyLoad />
          {discount && (
            <View className="discount-badge">
              <Text className="discount-text">{discount}折</Text>
            </View>
          )}
          {product.stock <= 10 && product.stock > 0 && (
            <View className="stock-badge">
              <Text className="stock-text">仅剩{product.stock}件</Text>
            </View>
          )}
          {product.stock === 0 && (
            <View className="sold-out-mask">
              <Text className="sold-out-text">售罄</Text>
            </View>
          )}
        </View>

        <View className="product-info">
          <Text className="product-name">{product.name}</Text>
          <Text className="product-desc">{product.description}</Text>

          <View className="price-section">
            <Text className="current-price">¥{this.formatPrice(product.price)}</Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text className="original-price">¥{this.formatPrice(product.originalPrice)}</Text>
            )}
          </View>

          <View className="product-meta">
            <Text className="sales-count">已售{product.sales}件</Text>
            {showAddToCart && product.stock > 0 && (
              <View className="add-to-cart-btn" onClick={this.handleAddToCart}>
                <Text className="add-text">+</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // 渲染列表布局
  renderListLayout = () => {
    const { product, showAddToCart } = this.props;
    const discount = this.getDiscount();

    return (
      <View className="product-card list-layout" onClick={this.handleProductClick}>
        <View className="product-image-container">
          <Image className="product-image" src={product.imageUrl} mode="aspectFill" lazyLoad />
          {discount && (
            <View className="discount-badge">
              <Text className="discount-text">{discount}折</Text>
            </View>
          )}
          {product.stock === 0 && (
            <View className="sold-out-mask">
              <Text className="sold-out-text">售罄</Text>
            </View>
          )}
        </View>

        <View className="product-info">
          <View className="info-top">
            <Text className="product-name">{product.name}</Text>
            <Text className="product-desc">{product.description}</Text>
          </View>

          <View className="info-bottom">
            <View className="price-section">
              <Text className="current-price">¥{this.formatPrice(product.price)}</Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text className="original-price">¥{this.formatPrice(product.originalPrice)}</Text>
              )}
            </View>

            <View className="product-meta">
              <Text className="sales-count">已售{product.sales}件</Text>
              <Text className="stock-count">库存{product.stock}件</Text>
              {showAddToCart && product.stock > 0 && (
                <View className="add-to-cart-btn" onClick={this.handleAddToCart}>
                  <Text className="add-text">加入购物车</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  render() {
    const { layout } = this.props;

    return layout === 'list' ? this.renderListLayout() : this.renderGridLayout();
  }
}
