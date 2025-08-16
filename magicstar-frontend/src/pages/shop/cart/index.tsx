import { Component, PropsWithChildren } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { AtButton, AtInputNumber, AtCheckbox, AtSwipeAction, AtLoadMore } from 'taro-ui';
import Taro from '@tarojs/taro';
import { shopService } from '../../../services/shop';
import type { Cart, CartItem } from '../../../services/shop';

import 'taro-ui/dist/style/components/button.scss';
import 'taro-ui/dist/style/components/input-number.scss';
import 'taro-ui/dist/style/components/checkbox.scss';
import 'taro-ui/dist/style/components/swipe-action.scss';
import 'taro-ui/dist/style/components/load-more.scss';
import './index.scss';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  selectedItems: number[];
  selectAll: boolean;
  totalPrice: number;
  totalQuantity: number;
  editing: boolean;
}

export default class CartPage extends Component<PropsWithChildren, CartState> {
  constructor(props) {
    super(props);
    this.state = {
      cart: null,
      loading: false,
      selectedItems: [],
      selectAll: false,
      totalPrice: 0,
      totalQuantity: 0,
      editing: false,
    };
  }

  componentDidMount() {
    this.loadCart();
  }

  componentDidShow() {
    this.loadCart();
  }

  // 加载购物车
  loadCart = async () => {
    try {
      this.setState({ loading: true });
      const cart = await shopService.getCart();
      this.setState({ cart });
      this.calculateTotal();
    } catch (error) {
      console.error('加载购物车失败:', error);
      Taro.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  // 计算总价和总数量
  calculateTotal = () => {
    const { cart, selectedItems } = this.state;
    if (!cart?.items) {
      this.setState({ totalPrice: 0, totalQuantity: 0 });
      return;
    }

    let totalPrice = 0;
    let totalQuantity = 0;

    cart.items.forEach(item => {
      if (selectedItems.includes(item.id)) {
        totalPrice += item.product.price * item.quantity;
        totalQuantity += item.quantity;
      }
    });

    this.setState({ totalPrice, totalQuantity });
  };

  // 选择商品
  handleSelectItem = (itemId: number, checked: boolean) => {
    const { selectedItems } = this.state;
    let newSelectedItems: number[];

    if (checked) {
      newSelectedItems = [...selectedItems, itemId];
    } else {
      newSelectedItems = selectedItems.filter(id => id !== itemId);
    }

    this.setState({ selectedItems: newSelectedItems }, () => {
      this.updateSelectAll();
      this.calculateTotal();
    });
  };

  // 全选/取消全选
  handleSelectAll = (checked: boolean) => {
    const { cart } = this.state;
    if (!cart?.items) return;

    const newSelectedItems = checked ? cart.items.map(item => item.id) : [];
    this.setState(
      {
        selectedItems: newSelectedItems,
        selectAll: checked,
      },
      () => {
        this.calculateTotal();
      }
    );
  };

  // 更新全选状态
  updateSelectAll = () => {
    const { cart, selectedItems } = this.state;
    if (!cart?.items) return;

    const selectAll = cart.items.length > 0 && selectedItems.length === cart.items.length;
    this.setState({ selectAll });
  };

  // 更新商品数量
  handleQuantityChange = async (itemId: number, quantity: number) => {
    if (quantity <= 0) return;

    try {
      await shopService.updateCartItem(itemId, { quantity });
      await this.loadCart();
    } catch (error) {
      console.error('更新数量失败:', error);
      Taro.showToast({
        title: '更新失败，请重试',
        icon: 'none',
      });
    }
  };

  // 删除商品
  handleDeleteItem = async (itemId: number) => {
    try {
      await shopService.removeFromCart(itemId);
      await this.loadCart();

      // 更新选中状态
      const { selectedItems } = this.state;
      const newSelectedItems = selectedItems.filter(id => id !== itemId);
      this.setState({ selectedItems: newSelectedItems }, () => {
        this.updateSelectAll();
        this.calculateTotal();
      });

      Taro.showToast({
        title: '已删除',
        icon: 'success',
      });
    } catch (error) {
      console.error('删除商品失败:', error);
      Taro.showToast({
        title: '删除失败，请重试',
        icon: 'none',
      });
    }
  };

  // 批量删除选中商品
  handleBatchDelete = async () => {
    const { selectedItems } = this.state;
    if (selectedItems.length === 0) {
      Taro.showToast({
        title: '请选择要删除的商品',
        icon: 'none',
      });
      return;
    }

    try {
      const result = await Taro.showModal({
        title: '确认删除',
        content: `确定要删除选中的${selectedItems.length}件商品吗？`,
      });

      if (result.confirm) {
        // 批量删除
        await Promise.all(selectedItems.map(itemId => shopService.removeFromCart(itemId)));

        await this.loadCart();
        this.setState({
          selectedItems: [],
          selectAll: false,
          editing: false,
        });

        Taro.showToast({
          title: '删除成功',
          icon: 'success',
        });
      }
    } catch (error) {
      console.error('批量删除失败:', error);
      Taro.showToast({
        title: '删除失败，请重试',
        icon: 'none',
      });
    }
  };

  // 清空购物车
  handleClearCart = async () => {
    try {
      const result = await Taro.showModal({
        title: '确认清空',
        content: '确定要清空购物车吗？',
      });

      if (result.confirm) {
        await shopService.clearCart();
        await this.loadCart();
        this.setState({
          selectedItems: [],
          selectAll: false,
          editing: false,
        });

        Taro.showToast({
          title: '购物车已清空',
          icon: 'success',
        });
      }
    } catch (error) {
      console.error('清空购物车失败:', error);
      Taro.showToast({
        title: '操作失败，请重试',
        icon: 'none',
      });
    }
  };

  // 切换编辑模式
  handleToggleEdit = () => {
    this.setState({
      editing: !this.state.editing,
      selectedItems: [],
      selectAll: false,
    });
  };

  // 去结算
  handleCheckout = () => {
    const { selectedItems, cart } = this.state;
    if (selectedItems.length === 0) {
      Taro.showToast({
        title: '请选择要结算的商品',
        icon: 'none',
      });
      return;
    }

    if (!cart) return;

    // 跳转到订单确认页面
    const selectedCartItems = cart.items.filter(item => selectedItems.includes(item.id));

    const params = {
      type: 'cart',
      items: JSON.stringify(
        selectedCartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          specs: item.specs,
        }))
      ),
    };

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    Taro.navigateTo({
      url: `/pages/order/confirm/index?${queryString}`,
    });
  };

  // 商品点击
  handleProductClick = (productId: number) => {
    Taro.navigateTo({
      url: `/pages/shop/product-detail/index?id=${productId}`,
    });
  };

  // 继续购物
  handleContinueShopping = () => {
    Taro.switchTab({
      url: '/pages/shop/index',
    });
  };

  // 渲染购物车商品
  renderCartItem = (item: CartItem) => {
    const { selectedItems, editing } = this.state;
    const isSelected = selectedItems.includes(item.id);

    const swipeOptions = [
      {
        text: '删除',
        style: { backgroundColor: '#ff4757', color: '#fff' },
        onClick: () => this.handleDeleteItem(item.id),
      },
    ];

    return (
      <AtSwipeAction key={item.id} options={swipeOptions} disabled={editing}>
        <View className="cart-item">
          <View className="item-checkbox">
            <AtCheckbox
              options={[{ value: item.id.toString(), label: '' }]}
              selectedList={isSelected ? [item.id.toString()] : []}
              onChange={values =>
                this.handleSelectItem(item.id, values.includes(item.id.toString()))
              }
            />
          </View>

          <Image
            className="item-image"
            src={item.product.imageUrl}
            mode="aspectFill"
            onClick={() => this.handleProductClick(item.product.id)}
          />

          <View className="item-info">
            <Text className="item-name" onClick={() => this.handleProductClick(item.product.id)}>
              {item.product.name}
            </Text>

            {item.specs && Object.keys(item.specs).length > 0 && (
              <View className="item-specs">
                {Object.entries(item.specs).map(([key, value]) => (
                  <Text key={key} className="spec-text">
                    {key}: {String(value)}
                  </Text>
                ))}
              </View>
            )}

            <View className="item-price-quantity">
              <Text className="item-price">¥{item.product.price}</Text>

              <View className="quantity-controls">
                <AtInputNumber
                  type="number"
                  min={1}
                  max={item.product.stock}
                  step={1}
                  value={item.quantity}
                  onChange={value => this.handleQuantityChange(item.id, value)}
                />
              </View>
            </View>
          </View>
        </View>
      </AtSwipeAction>
    );
  };

  render() {
    const { cart, loading, selectedItems, selectAll, totalPrice, totalQuantity, editing } =
      this.state;

    return (
      <View className="cart-page">
        {/* 头部操作栏 */}
        <View className="cart-header">
          <Text className="page-title">购物车</Text>
          {cart?.items && cart.items.length > 0 && (
            <View className="header-actions">
              <Text className="edit-btn" onClick={this.handleToggleEdit}>
                {editing ? '完成' : '编辑'}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View className="loading-container">
            <AtLoadMore status="loading" loadingText="加载中..." />
          </View>
        ) : (
          <>
            {cart?.items && cart.items.length > 0 ? (
              <>
                {/* 全选栏 */}
                <View className="select-all-bar">
                  <View className="select-all-checkbox">
                    <AtCheckbox
                      options={[{ value: 'all', label: '全选' }]}
                      selectedList={selectAll ? ['all'] : []}
                      onChange={values => this.handleSelectAll(values.includes('all'))}
                    />
                  </View>

                  {editing && (
                    <View className="batch-actions">
                      <Text className="clear-btn" onClick={this.handleClearCart}>
                        清空购物车
                      </Text>
                    </View>
                  )}
                </View>

                {/* 商品列表 */}
                <ScrollView className="cart-scroll" scrollY>
                  <View className="cart-list">
                    {cart.items.map(item => this.renderCartItem(item))}
                  </View>
                </ScrollView>

                {/* 底部操作栏 */}
                <View className="cart-footer">
                  <View className="footer-info">
                    <Text className="total-text">
                      合计: <Text className="total-price">¥{totalPrice.toFixed(2)}</Text>
                    </Text>
                    {totalQuantity > 0 && (
                      <Text className="total-quantity">共{totalQuantity}件</Text>
                    )}
                  </View>

                  <View className="footer-actions">
                    {editing ? (
                      <AtButton
                        className="delete-btn"
                        onClick={this.handleBatchDelete}
                        disabled={selectedItems.length === 0}
                      >
                        删除({selectedItems.length})
                      </AtButton>
                    ) : (
                      <AtButton
                        className="checkout-btn"
                        type="primary"
                        onClick={this.handleCheckout}
                        disabled={selectedItems.length === 0}
                      >
                        去结算({selectedItems.length})
                      </AtButton>
                    )}
                  </View>
                </View>
              </>
            ) : (
              /* 空购物车 */
              <View className="empty-cart">
                <Text className="empty-icon">🛒</Text>
                <Text className="empty-text">购物车是空的</Text>
                <Text className="empty-desc">快去挑选心仪的商品吧</Text>
                <AtButton
                  className="continue-shopping-btn"
                  type="primary"
                  onClick={this.handleContinueShopping}
                >
                  去购物
                </AtButton>
              </View>
            )}
          </>
        )}
      </View>
    );
  }
}
