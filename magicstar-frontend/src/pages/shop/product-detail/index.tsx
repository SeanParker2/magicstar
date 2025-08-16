import { Component, PropsWithChildren } from 'react';
import { View, Text, Image, ScrollView, Swiper, SwiperItem } from '@tarojs/components';
import { AtButton, AtInputNumber, AtTabs, AtTabsPane, AtFloatLayout } from 'taro-ui';
import Taro, { getCurrentInstance } from '@tarojs/taro';
import { shopService } from '../../../services/shop';
import type { Product, ProductDetail as ProductDetailType } from '../../../services/shop';

import 'taro-ui/dist/style/components/button.scss';
import 'taro-ui/dist/style/components/input-number.scss';
import 'taro-ui/dist/style/components/tabs.scss';
import 'taro-ui/dist/style/components/float-layout.scss';
import './index.scss';

interface ProductDetailState {
  product: ProductDetailType | null;
  loading: boolean;
  currentImageIndex: number;
  quantity: number;
  selectedSpecs: Record<string, string>;
  showSpecModal: boolean;
  actionType: 'cart' | 'buy';
  tabCurrent: number;
  relatedProducts: Product[];
}

interface TabItem {
  title: string;
}

export default class ProductDetail extends Component<PropsWithChildren, ProductDetailState> {
  private productId: number = 0;
  private tabList: TabItem[] = [
    { title: '商品详情' },
    { title: '规格参数' },
    { title: '用户评价' },
  ];

  constructor(props) {
    super(props);
    this.state = {
      product: null,
      loading: true,
      currentImageIndex: 0,
      quantity: 1,
      selectedSpecs: {},
      showSpecModal: false,
      actionType: 'cart',
      tabCurrent: 0,
      relatedProducts: [],
    };
  }

  componentDidMount() {
    this.parseParams();
    this.loadProductDetail();
    this.loadRelatedProducts();
  }

  // 解析页面参数
  parseParams = () => {
    const instance = getCurrentInstance();
    const params = instance?.router?.params || {};
    this.productId = parseInt(params.id || '0');
  };

  // 加载商品详情
  loadProductDetail = async () => {
    if (!this.productId) {
      Taro.showToast({
        title: '商品不存在',
        icon: 'none',
      });
      return;
    }

    try {
      this.setState({ loading: true });
      const product = await shopService.getProductDetail(this.productId);

      // 初始化规格选择
      const selectedSpecs: Record<string, string> = {};
      const productDetail = product as ProductDetailType;
      if (productDetail.specs && productDetail.specs.length > 0) {
        productDetail.specs.forEach(spec => {
          if (spec.options && spec.options.length > 0) {
            selectedSpecs[spec.name] = spec.options[0];
          }
        });
      }

      this.setState({
        product,
        selectedSpecs,
      });

      // 设置导航栏标题
      Taro.setNavigationBarTitle({ title: product.name });
    } catch (error) {
      console.error('加载商品详情失败:', error);
      Taro.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  // 加载相关商品
  loadRelatedProducts = async () => {
    try {
      const result = await shopService.getProducts({
        page: 1,
        limit: 6,
        sortBy: 'sales',
        sortOrder: 'desc',
      });
      this.setState({ relatedProducts: result.products });
    } catch (error) {
      console.error('加载相关商品失败:', error);
    }
  };

  // 轮播图切换
  handleSwiperChange = e => {
    this.setState({ currentImageIndex: e.detail.current });
  };

  // 图片预览
  handleImagePreview = () => {
    const { product, currentImageIndex } = this.state;
    if (!product?.images) return;

    Taro.previewImage({
      urls: product.images,
      current: product.images[currentImageIndex],
    });
  };

  // 数量变化
  handleQuantityChange = (value: number) => {
    this.setState({ quantity: value });
  };

  // 规格选择
  handleSpecSelect = (specName: string, option: string) => {
    this.setState({
      selectedSpecs: {
        ...this.state.selectedSpecs,
        [specName]: option,
      },
    });
  };

  // 显示规格选择弹窗
  handleShowSpecModal = (actionType: 'cart' | 'buy') => {
    this.setState({
      showSpecModal: true,
      actionType,
    });
  };

  // 关闭规格选择弹窗
  handleCloseSpecModal = () => {
    this.setState({ showSpecModal: false });
  };

  // 加入购物车
  handleAddToCart = async () => {
    const { product, quantity, selectedSpecs } = this.state;
    if (!product) return;

    try {
      await shopService.addToCart({
        productId: product.id,
        quantity,
        specs: selectedSpecs,
      });

      Taro.showToast({
        title: '已加入购物车',
        icon: 'success',
      });

      this.handleCloseSpecModal();
    } catch (error) {
      console.error('加入购物车失败:', error);
      Taro.showToast({
        title: '加入购物车失败',
        icon: 'none',
      });
    }
  };

  // 立即购买
  handleBuyNow = () => {
    const { product, quantity, selectedSpecs } = this.state;
    if (!product) return;

    // 跳转到订单确认页面
    const params = {
      type: 'direct',
      productId: product.id,
      quantity,
      specs: JSON.stringify(selectedSpecs),
    };

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    Taro.navigateTo({
      url: `/pages/order/confirm/index?${queryString}`,
    });

    this.handleCloseSpecModal();
  };

  // 确认规格选择
  handleConfirmSpec = () => {
    const { actionType } = this.state;
    if (actionType === 'cart') {
      this.handleAddToCart();
    } else {
      this.handleBuyNow();
    }
  };

  // Tab切换
  handleTabClick = (value: number) => {
    this.setState({ tabCurrent: value });
  };

  // 商品点击
  handleProductClick = (product: Product) => {
    Taro.redirectTo({
      url: `/pages/shop/product-detail/index?id=${product.id}`,
    });
  };

  // 返回商城
  handleBackToShop = () => {
    Taro.navigateBack();
  };

  // 分享商品
  handleShare = () => {
    const { product } = this.state;
    if (!product) return;

    Taro.showShareMenu({
      withShareTicket: true,
    });
  };

  // 收藏商品
  handleFavorite = () => {
    Taro.showToast({
      title: '收藏功能开发中',
      icon: 'none',
    });
  };

  // 联系客服
  handleContact = () => {
    Taro.showToast({
      title: '客服功能开发中',
      icon: 'none',
    });
  };

  // 渲染商品图片轮播
  renderImageSwiper = () => {
    const { product, currentImageIndex } = this.state;
    if (!product?.images || product.images.length === 0) return null;

    return (
      <View className="image-section">
        <Swiper
          className="image-swiper"
          indicatorDots
          autoplay
          interval={3000}
          duration={500}
          onChange={this.handleSwiperChange}
          onClick={this.handleImagePreview}
        >
          {product.images.map((image, index) => (
            <SwiperItem key={index}>
              <Image className="product-image" src={image} mode="aspectFill" />
            </SwiperItem>
          ))}
        </Swiper>
        <View className="image-indicator">
          <Text className="indicator-text">
            {currentImageIndex + 1}/{product.images.length}
          </Text>
        </View>
      </View>
    );
  };

  // 渲染商品信息
  renderProductInfo = () => {
    const { product } = this.state;
    if (!product) return null;

    return (
      <View className="product-info">
        <View className="price-section">
          <Text className="current-price">¥{product.price}</Text>
          {product.originalPrice && product.originalPrice > product.price && (
            <Text className="original-price">¥{product.originalPrice}</Text>
          )}
        </View>

        <Text className="product-name">{product.name}</Text>
        <Text className="product-desc">{product.description}</Text>

        <View className="product-meta">
          <View className="meta-item">
            <Text className="meta-label">销量</Text>
            <Text className="meta-value">{product.sales}件</Text>
          </View>
          <View className="meta-item">
            <Text className="meta-label">库存</Text>
            <Text className="meta-value">{product.stock}件</Text>
          </View>
          <View className="meta-item">
            <Text className="meta-label">评价</Text>
            <Text className="meta-value">{product.rating || 5.0}分</Text>
          </View>
        </View>
      </View>
    );
  };

  // 渲染规格选择
  renderSpecSelection = () => {
    const { product, selectedSpecs } = this.state;
    if (!product?.specs || product.specs.length === 0) return null;

    return (
      <View className="spec-section">
        <Text className="section-title">选择规格</Text>
        {product.specs.map(spec => (
          <View key={spec.name} className="spec-group">
            <Text className="spec-name">{spec.name}</Text>
            <View className="spec-options">
              {spec.options?.map(option => (
                <View
                  key={option}
                  className={`spec-option ${selectedSpecs[spec.name] === option ? 'selected' : ''}`}
                  onClick={() => this.handleSpecSelect(spec.name, option)}
                >
                  <Text className="option-text">{option}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // 渲染数量选择
  renderQuantitySelection = () => {
    const { quantity, product } = this.state;
    if (!product) return null;

    return (
      <View className="quantity-section">
        <Text className="section-title">购买数量</Text>
        <AtInputNumber
          type="number"
          min={1}
          max={product.stock}
          step={1}
          value={quantity}
          onChange={this.handleQuantityChange}
        />
      </View>
    );
  };

  // 渲染详情内容
  renderDetailContent = () => {
    const { product, tabCurrent } = this.state;
    if (!product) return null;

    switch (tabCurrent) {
      case 0:
        return (
          <View className="detail-content">
            <Text className="detail-text">{product.detail || '暂无详细信息'}</Text>
          </View>
        );
      case 1:
        return (
          <View className="spec-content">
            {product.specs && product.specs.length > 0 ? (
              product.specs.map(spec => (
                <View key={spec.name} className="spec-row">
                  <Text className="spec-label">{spec.name}</Text>
                  <Text className="spec-value">{spec.options?.join(', ')}</Text>
                </View>
              ))
            ) : (
              <Text className="no-data">暂无规格参数</Text>
            )}
          </View>
        );
      case 2:
        return (
          <View className="review-content">
            <Text className="no-data">暂无用户评价</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // 渲染相关商品
  renderRelatedProducts = () => {
    const { relatedProducts } = this.state;
    if (relatedProducts.length === 0) return null;

    return (
      <View className="related-section">
        <Text className="section-title">相关推荐</Text>
        <ScrollView className="related-scroll" scrollX>
          <View className="related-list">
            {relatedProducts.map(product => (
              <View
                key={product.id}
                className="related-item"
                onClick={() => this.handleProductClick(product)}
              >
                <Image className="related-image" src={product.imageUrl} mode="aspectFill" />
                <Text className="related-name">{product.name}</Text>
                <Text className="related-price">¥{product.price}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  render() {
    const { product, loading, showSpecModal, actionType, tabCurrent } = this.state;

    if (loading) {
      return (
        <View className="loading-container">
          <Text className="loading-text">加载中...</Text>
        </View>
      );
    }

    if (!product) {
      return (
        <View className="error-container">
          <Text className="error-text">商品不存在</Text>
          <AtButton type="primary" onClick={this.handleBackToShop}>
            返回商城
          </AtButton>
        </View>
      );
    }

    return (
      <View className="product-detail-page">
        <ScrollView className="detail-scroll" scrollY>
          {/* 商品图片 */}
          {this.renderImageSwiper()}

          {/* 商品信息 */}
          {this.renderProductInfo()}

          {/* 详情Tab */}
          <View className="detail-section">
            <AtTabs current={tabCurrent} tabList={this.tabList} onClick={this.handleTabClick}>
              <AtTabsPane current={tabCurrent} index={0}>
                {this.renderDetailContent()}
              </AtTabsPane>
              <AtTabsPane current={tabCurrent} index={1}>
                {this.renderDetailContent()}
              </AtTabsPane>
              <AtTabsPane current={tabCurrent} index={2}>
                {this.renderDetailContent()}
              </AtTabsPane>
            </AtTabs>
          </View>

          {/* 相关商品 */}
          {this.renderRelatedProducts()}
        </ScrollView>

        {/* 底部操作栏 */}
        <View className="bottom-actions">
          <View className="action-icons">
            <View className="action-icon" onClick={this.handleContact}>
              <Text className="icon-text">💬</Text>
              <Text className="icon-label">客服</Text>
            </View>
            <View className="action-icon" onClick={this.handleFavorite}>
              <Text className="icon-text">❤️</Text>
              <Text className="icon-label">收藏</Text>
            </View>
            <View className="action-icon" onClick={this.handleShare}>
              <Text className="icon-text">📤</Text>
              <Text className="icon-label">分享</Text>
            </View>
          </View>

          <View className="action-buttons">
            <AtButton className="cart-btn" onClick={() => this.handleShowSpecModal('cart')}>
              加入购物车
            </AtButton>
            <AtButton
              className="buy-btn"
              type="primary"
              onClick={() => this.handleShowSpecModal('buy')}
            >
              立即购买
            </AtButton>
          </View>
        </View>

        {/* 规格选择弹窗 */}
        <AtFloatLayout
          isOpened={showSpecModal}
          title={actionType === 'cart' ? '加入购物车' : '立即购买'}
          onClose={this.handleCloseSpecModal}
        >
          <View className="spec-modal">
            {/* 商品信息 */}
            <View className="modal-product-info">
              <Image className="modal-product-image" src={product.imageUrl} mode="aspectFill" />
              <View className="modal-product-detail">
                <Text className="modal-product-price">¥{product.price}</Text>
                <Text className="modal-product-name">{product.name}</Text>
                <Text className="modal-product-stock">库存{product.stock}件</Text>
              </View>
            </View>

            {/* 规格选择 */}
            {this.renderSpecSelection()}

            {/* 数量选择 */}
            {this.renderQuantitySelection()}

            {/* 确认按钮 */}
            <View className="modal-actions">
              <AtButton className="confirm-btn" type="primary" onClick={this.handleConfirmSpec}>
                {actionType === 'cart' ? '加入购物车' : '立即购买'}
              </AtButton>
            </View>
          </View>
        </AtFloatLayout>
      </View>
    );
  }
}
