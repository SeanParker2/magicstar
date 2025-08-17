import { Component } from 'react';
import { View, Text, Image } from '@tarojs/components';
import {
  AtIcon,
  AtBadge,
  AtDrawer,
  // AtList,
  // AtListItem,
  AtInputNumber,
  AtButton,
  AtSwipeAction,
} from 'taro-ui';
import Taro from '@tarojs/taro';
import { CartItem } from '../../services/shop';
import './index.css';

interface ShoppingCartProps {
  visible: boolean;
  cartItems: CartItem[];
  totalAmount: number;
  totalQuantity: number;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  onProductClick: (productId: string) => void;
  loading?: boolean;
}

interface ShoppingCartState {
  // 组件内部状态
}

export default class ShoppingCart extends Component<ShoppingCartProps, ShoppingCartState> {
  static defaultProps = {
    visible: false,
    cartItems: [],
    totalAmount: 0,
    totalQuantity: 0,
    loading: false,
  };

  constructor(props: ShoppingCartProps) {
    super(props);
    this.state = {};
  }

  // 处理数量变化
  handleQuantityChange = (value: number, itemId: number) => {
    const { onUpdateQuantity } = this.props;
    if (value > 0) {
      onUpdateQuantity(String(itemId), value);
    }
  };

  // 处理商品删除
  handleRemoveItem = (itemId: number) => {
    const { onRemoveItem } = this.props;
    Taro.showModal({
      title: '确认删除',
      content: '确定要从购物车中删除这个商品吗？',
      success: res => {
        if (res.confirm) {
          onRemoveItem(String(itemId));
        }
      },
    });
  };

  // 处理商品点击
  handleProductClick = (productId: number) => {
    const { onProductClick, onClose } = this.props;
    onClose();
    onProductClick(String(productId));
  };

  // 处理结算
  handleCheckout = () => {
    const { onCheckout, cartItems } = this.props;
    if (cartItems.length === 0) {
      Taro.showToast({
        title: '购物车为空',
        icon: 'none',
      });
      return;
    }
    onCheckout();
  };

  // 渲染购物车商品项
  renderCartItem = (item: CartItem) => {
    const { product } = item;
    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 10;

    const swipeOptions = [
      {
        text: '删除',
        style: {
          backgroundColor: '#ff4757',
          color: '#fff',
        },
        onClick: () => this.handleRemoveItem(item.id),
      },
    ];

    return (
      <AtSwipeAction key={item.id} options={swipeOptions} className="cart-item-swipe">
        <View className="cart-item">
          <View className="product-image" onClick={() => this.handleProductClick(product.id)}>
            <Image src={product.images?.[0] || ''} className="image" mode="aspectFill" />
            {isOutOfStock && (
              <View className="stock-overlay">
                <Text className="stock-text">缺货</Text>
              </View>
            )}
          </View>

          <View className="product-info">
            <View className="product-header" onClick={() => this.handleProductClick(product.id)}>
              <Text className="product-name">{product.name}</Text>
              {product.description && (
                <Text className="product-description">{product.description}</Text>
              )}
              {item.specs && Object.keys(item.specs).length > 0 && (
                <View className="product-specs">
                  {Object.entries(item.specs).map(([key, value]) => (
                    <Text key={key} className="spec-item">
                      {key}: {String(value)}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View className="product-footer">
              <View className="price-section">
                <Text className="current-price">¥{product.price.toFixed(2)}</Text>
                {product.originalPrice && product.originalPrice > product.price && (
                  <Text className="original-price">¥{product.originalPrice.toFixed(2)}</Text>
                )}
              </View>

              <View className="stock-info">
                {isOutOfStock ? (
                  <Text className="stock-status out-of-stock">缺货</Text>
                ) : isLowStock ? (
                  <Text className="stock-status low-stock">仅剩{product.stock}件</Text>
                ) : (
                  <Text className="stock-status">库存充足</Text>
                )}
              </View>
            </View>
          </View>

          <View className="quantity-section">
            <AtInputNumber
              type="number"
              min={0}
              max={product.stock}
              step={1}
              value={item.quantity}
              onChange={value => this.handleQuantityChange(Number(value), item.id)}
              disabled={isOutOfStock}
            />
            <View className="item-total">
              <Text className="total-price">¥{(product.price * item.quantity).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </AtSwipeAction>
    );
  };

  // 渲染空购物车
  renderEmptyCart = () => {
    return (
      <View className="empty-cart">
        <AtIcon value="shopping-cart" size="60" color="#ccc" />
        <Text className="empty-text">购物车还是空的</Text>
        <Text className="empty-description">快去挑选心仪的商品吧</Text>
        <AtButton type="primary" size="small" onClick={this.props.onClose}>
          去购物
        </AtButton>
      </View>
    );
  };

  // 渲染购物车底部
  renderCartFooter = () => {
    const { totalAmount, totalQuantity, cartItems, loading } = this.props;

    if (cartItems.length === 0) {
      return null;
    }

    return (
      <View className="cart-footer">
        <View className="footer-info">
          <View className="total-info">
            <Text className="total-quantity">共{totalQuantity}件商品</Text>
            <View className="total-amount">
              <Text className="amount-label">合计：</Text>
              <Text className="amount-value">¥{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <AtButton
          type="primary"
          size="normal"
          className="checkout-button"
          onClick={this.handleCheckout}
          loading={loading}
          disabled={loading || cartItems.some(item => item.product.stock <= 0)}
        >
          {loading ? '处理中...' : '去结算'}
        </AtButton>
      </View>
    );
  };

  render() {
    const { visible, cartItems, onClose, loading } = this.props;

    return (
      <AtDrawer
        show={visible}
        mask
        onClose={onClose}
        right
        width="80%"
        className="shopping-cart-drawer"
      >
        <View className="shopping-cart">
          {/* 购物车头部 */}
          <View className="cart-header">
            <View className="header-title">
              <AtIcon value="shopping-cart" size="20" />
              <Text className="title-text">购物车</Text>
              {cartItems.length > 0 && (
                <AtBadge value={cartItems.length} maxValue={99}>
                  <View className="badge-container" />
                </AtBadge>
              )}
            </View>
            <AtIcon value="close" size="20" onClick={onClose} className="close-icon" />
          </View>

          {/* 购物车内容 */}
          <View className="cart-content">
            {loading ? (
              <View className="loading-container">
                <AtIcon value="loading-3" size="30" className="loading-icon" />
                <Text className="loading-text">加载中...</Text>
              </View>
            ) : cartItems.length === 0 ? (
              this.renderEmptyCart()
            ) : (
              <View className="cart-items">{cartItems.map(item => this.renderCartItem(item))}</View>
            )}
          </View>

          {/* 购物车底部 */}
          {this.renderCartFooter()}
        </View>
      </AtDrawer>
    );
  }
}
