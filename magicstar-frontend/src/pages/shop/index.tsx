import { Component, PropsWithChildren } from 'react';
import { View, Text, Swiper, SwiperItem, Image } from '@tarojs/components';
import { AtGrid, AtSearchBar } from 'taro-ui';
import Taro from '@tarojs/taro';
import { shopService } from '../../services/shop';
import type { Product, ProductCategory } from '../../services/shop';

// import 'taro-ui/dist/style/components/grid.css';
// import 'taro-ui/dist/style/components/search-bar.css';
import './index.css';

interface ShopState {
  categories: ProductCategory[];
  hotProducts: Product[];
  recommendedProducts: Product[];
  searchValue: string;
  loading: boolean;
  banners: Array<{
    id: number;
    image: string;
    title: string;
    link?: string;
  }>;
}

export default class Shop extends Component<PropsWithChildren, ShopState> {
  constructor(props) {
    super(props);
    this.state = {
      categories: [],
      hotProducts: [],
      recommendedProducts: [],
      searchValue: '',
      loading: false,
      banners: [
        {
          id: 1,
          image: '/assets/images/shop-banner-1.jpg',
          title: '神秘水晶专区',
          link: '/pages/shop/products/index?categoryId=1',
        },
        {
          id: 2,
          image: '/assets/images/shop-banner-2.jpg',
          title: '塔罗牌精选',
          link: '/pages/shop/products/index?categoryId=2',
        },
        {
          id: 3,
          image: '/assets/images/shop-banner-3.jpg',
          title: '占卜工具',
          link: '/pages/shop/products/index?categoryId=3',
        },
      ],
    };
  }

  componentDidMount() {
    this.loadShopData();
  }

  componentDidShow() {
    // 每次显示页面时刷新购物车数量
    this.updateCartCount();
  }

  // 加载商城数据
  loadShopData = async () => {
    try {
      this.setState({ loading: true });

      const [categories, hotProducts, recommendedProducts] = await Promise.all([
        shopService.getCategories(),
        shopService.getHotProducts(8),
        shopService.getRecommendedProducts(6),
      ]);

      this.setState({
        categories: categories.slice(0, 8), // 只显示前8个分类
        hotProducts,
        recommendedProducts,
      });
    } catch (error) {
      console.error('加载商城数据失败:', error);
      Taro.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  // 更新购物车数量
  updateCartCount = async () => {
    try {
      const cart = await shopService.getCart();
      const count = cart.totalQuantity || 0;

      if (count > 0) {
        Taro.setTabBarBadge({
          index: 2, // 假设购物车是第3个tab
          text: count.toString(),
        });
      } else {
        Taro.removeTabBarBadge({ index: 2 });
      }
    } catch (error) {
      console.error('更新购物车数量失败:', error);
    }
  };

  // 处理轮播图点击
  handleBannerClick = banner => {
    if (banner.link) {
      Taro.navigateTo({ url: banner.link });
    }
  };

  // 处理分类点击
  handleCategoryClick = category => {
    Taro.navigateTo({
      url: `/pages/shop/products/index?categoryId=${category.id}&categoryName=${category.name}`,
    });
  };

  // 处理商品点击
  handleProductClick = (product: Product) => {
    Taro.navigateTo({
      url: `/pages/shop/product-detail/index?id=${product.id}`,
    });
  };

  // 处理搜索
  handleSearch = (value: string) => {
    if (!value.trim()) {
      Taro.showToast({
        title: '请输入搜索关键词',
        icon: 'none',
      });
      return;
    }

    Taro.navigateTo({
      url: `/pages/shop/products/index?keyword=${encodeURIComponent(value.trim())}`,
    });
  };

  // 搜索值变化
  handleSearchChange = (value: string) => {
    this.setState({ searchValue: value });
  };

  // 搜索按钮点击
  handleSearchAction = () => {
    this.handleSearch(this.state.searchValue);
  };

  // 查看更多热门商品
  handleViewMoreHot = () => {
    Taro.navigateTo({
      url: '/pages/shop/products/index?sortBy=sales&sortOrder=desc',
    });
  };

  // 查看更多推荐商品
  handleViewMoreRecommended = () => {
    Taro.navigateTo({
      url: '/pages/shop/products/index?recommended=true',
    });
  };

  // 跳转到购物车
  handleGoToCart = () => {
    Taro.navigateTo({
      url: '/pages/shop/cart/index',
    });
  };

  // 渲染商品卡片
  renderProductCard = (product: Product) => {
    return (
      <View
        key={product.id}
        className="product-card"
        onClick={() => this.handleProductClick(product)}
      >
        <Image className="product-image" src={product.imageUrl} mode="aspectFill" lazyLoad />
        <View className="product-info">
          <Text className="product-name">{product.name}</Text>
          <View className="product-price">
            <Text className="current-price">¥{product.price}</Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text className="original-price">¥{product.originalPrice}</Text>
            )}
          </View>
          <Text className="product-sales">已售{product.sales}件</Text>
        </View>
      </View>
    );
  };

  render() {
    const { categories, hotProducts, recommendedProducts, searchValue, loading, banners } =
      this.state;

    return (
      <View className="shop-page">
        {/* 搜索栏 */}
        <View className="search-section">
          <AtSearchBar
            value={searchValue}
            placeholder="搜索商品"
            onActionClick={this.handleSearchAction}
            onChange={this.handleSearchChange}
          />
        </View>

        {/* 轮播图 */}
        <View className="banner-section">
          <Swiper
            className="banner-swiper"
            indicatorColor="rgba(255, 255, 255, 0.3)"
            indicatorActiveColor="#fff"
            circular
            indicatorDots
            autoplay
            interval={4000}
            duration={500}
          >
            {banners.map(banner => (
              <SwiperItem key={banner.id} onClick={() => this.handleBannerClick(banner)}>
                <View className="banner-item">
                  <Image className="banner-image" src={banner.image} mode="aspectFill" />
                  <View className="banner-overlay">
                    <Text className="banner-title">{banner.title}</Text>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>

        {/* 商品分类 */}
        <View className="category-section">
          <Text className="section-title">商品分类</Text>
          <AtGrid
            data={categories.map(cat => ({
              image: cat.imageUrl || '🛍️',
              value: cat.id.toString(),
              text: cat.name,
            }))}
            columnNum={4}
            hasBorder={false}
            onClick={item => {
              const category = categories.find(cat => cat.id.toString() === item.value);
              if (category) this.handleCategoryClick(category);
            }}
          />
        </View>

        {/* 热门商品 */}
        <View className="hot-products-section">
          <View className="section-header">
            <Text className="section-title">热门商品</Text>
            <Text className="view-more" onClick={this.handleViewMoreHot}>
              查看更多 {'>'}
            </Text>
          </View>
          <View className="products-grid">
            {hotProducts.map(product => this.renderProductCard(product))}
          </View>
        </View>

        {/* 推荐商品 */}
        <View className="recommended-products-section">
          <View className="section-header">
            <Text className="section-title">为你推荐</Text>
            <Text className="view-more" onClick={this.handleViewMoreRecommended}>
              查看更多 {'>'}
            </Text>
          </View>
          <View className="products-grid">
            {recommendedProducts.map(product => this.renderProductCard(product))}
          </View>
        </View>

        {/* 购物车悬浮按钮 */}
        <View className="cart-float-btn" onClick={this.handleGoToCart}>
          <Text className="cart-icon">🛒</Text>
        </View>

        {loading && (
          <View className="loading-overlay">
            <Text>加载中...</Text>
          </View>
        )}
      </View>
    );
  }
}
