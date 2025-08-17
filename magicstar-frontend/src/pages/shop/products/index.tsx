import { Component, PropsWithChildren } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { AtSearchBar, AtButton, AtLoadMore, AtFloatLayout } from 'taro-ui';
import Taro, { getCurrentInstance } from '@tarojs/taro';
import { shopService } from '../../../services/shop';
import type { Product, ProductListParams } from '../../../services/shop';

// import 'taro-ui/dist/style/components/search-bar.css';
// import 'taro-ui/dist/style/components/button.css';
// import 'taro-ui/dist/style/components/load-more.css';
// import 'taro-ui/dist/style/components/float-layout.css';
import './index.css';

interface ProductsState {
  products: Product[];
  loading: boolean;
  hasMore: boolean;
  searchValue: string;
  sortBy: string;
  sortOrder: string;
  categoryId?: number;
  categoryName?: string;
  keyword?: string;
  showSortModal: boolean;
  page: number;
  total: number;
}

interface SortOption {
  label: string;
  value: string;
  sortBy: string;
  sortOrder: string;
}

export default class Products extends Component<PropsWithChildren, ProductsState> {
  private sortOptions: SortOption[] = [
    { label: '综合排序', value: 'default', sortBy: 'created_at', sortOrder: 'desc' },
    { label: '销量从高到低', value: 'sales_desc', sortBy: 'sales', sortOrder: 'desc' },
    { label: '价格从低到高', value: 'price_asc', sortBy: 'price', sortOrder: 'asc' },
    { label: '价格从高到低', value: 'price_desc', sortBy: 'price', sortOrder: 'desc' },
    { label: '最新发布', value: 'newest', sortBy: 'created_at', sortOrder: 'desc' },
  ];

  constructor(props) {
    super(props);
    this.state = {
      products: [],
      loading: false,
      hasMore: true,
      searchValue: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
      showSortModal: false,
      page: 1,
      total: 0,
    };
  }

  componentDidMount() {
    this.parseParams();
    this.loadProducts(true);
  }

  // 解析页面参数
  parseParams = () => {
    const instance = getCurrentInstance();
    const params = instance?.router?.params || {};

    this.setState({
      categoryId: params.categoryId ? parseInt(params.categoryId) : undefined,
      categoryName: params.categoryName || '',
      keyword: params.keyword || '',
      searchValue: params.keyword || '',
      sortBy: params.sortBy || 'created_at',
      sortOrder: params.sortOrder || 'desc',
    });

    // 设置导航栏标题
    if (params.categoryName) {
      Taro.setNavigationBarTitle({ title: params.categoryName });
    } else if (params.keyword) {
      Taro.setNavigationBarTitle({ title: `搜索: ${params.keyword}` });
    } else {
      Taro.setNavigationBarTitle({ title: '商品列表' });
    }
  };

  // 加载商品列表
  loadProducts = async (reset: boolean = false) => {
    const { loading, hasMore, page, categoryId, keyword, sortBy, sortOrder } = this.state;

    if (loading || (!reset && !hasMore)) return;

    try {
      this.setState({ loading: true });

      const currentPage = reset ? 1 : page;
      const params: ProductListParams = {
        page: currentPage,
        limit: 20,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      };

      if (categoryId) {
        params.categoryId = categoryId;
      }

      if (keyword) {
        params.keyword = keyword;
      }

      const result = await shopService.getProducts(params);

      this.setState({
        products: reset ? result.products : [...this.state.products, ...result.products],
        hasMore: result.hasMore,
        page: currentPage + 1,
        total: result.total,
      });
    } catch (error) {
      console.error('加载商品列表失败:', error);
      Taro.showToast({
        title: '加载失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  // 搜索商品
  handleSearch = () => {
    const value = this.state.searchValue;
    if (!value.trim()) {
      Taro.showToast({
        title: '请输入搜索关键词',
        icon: 'none',
      });
      return;
    }

    this.setState(
      {
        keyword: value.trim(),
        page: 1,
      },
      () => {
        this.loadProducts(true);
      }
    );

    Taro.setNavigationBarTitle({ title: `搜索: ${value.trim()}` });
  };

  // 搜索值变化
  handleSearchChange = (value: string) => {
    this.setState({ searchValue: value });
  };

  // 显示排序选项
  handleShowSort = () => {
    this.setState({ showSortModal: true });
  };

  // 选择排序方式
  handleSelectSort = (option: SortOption) => {
    this.setState(
      {
        sortBy: option.sortBy,
        sortOrder: option.sortOrder,
        showSortModal: false,
        page: 1,
      },
      () => {
        this.loadProducts(true);
      }
    );
  };

  // 关闭排序弹窗
  handleCloseSortModal = () => {
    this.setState({ showSortModal: false });
  };

  // 商品点击
  handleProductClick = (product: Product) => {
    Taro.navigateTo({
      url: `/pages/shop/product-detail/index?id=${product.id}`,
    });
  };

  // 下拉刷新
  onPullDownRefresh = () => {
    this.loadProducts(true).finally(() => {
      Taro.stopPullDownRefresh();
    });
  };

  // 上拉加载更多
  onReachBottom = () => {
    this.loadProducts();
  };

  // 获取当前排序选项标签
  getCurrentSortLabel = () => {
    const { sortBy, sortOrder } = this.state;
    const option = this.sortOptions.find(
      opt => opt.sortBy === sortBy && opt.sortOrder === sortOrder
    );
    return option?.label || '综合排序';
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
          <Text className="product-desc">{product.description}</Text>
          <View className="product-price">
            <Text className="current-price">¥{product.price}</Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text className="original-price">¥{product.originalPrice}</Text>
            )}
          </View>
          <View className="product-meta">
            <Text className="product-sales">已售{product.sales}件</Text>
            <Text className="product-stock">库存{product.stock}件</Text>
          </View>
        </View>
      </View>
    );
  };

  render() {
    const { products, loading, hasMore, searchValue, showSortModal, total, categoryName, keyword } =
      this.state;

    return (
      <View className="products-page">
        {/* 搜索栏 */}
        <View className="search-section">
          <AtSearchBar
            value={searchValue}
            placeholder="搜索商品"
            onActionClick={this.handleSearch}
            onChange={this.handleSearchChange}
          />
        </View>

        {/* 筛选栏 */}
        <View className="filter-section">
          <View className="filter-info">
            <Text className="result-count">
              {categoryName && `${categoryName} · `}
              {keyword && `"${keyword}" · `}共{total}件商品
            </Text>
          </View>
          <View className="sort-btn" onClick={this.handleShowSort}>
            <Text className="sort-text">{this.getCurrentSortLabel()}</Text>
            <Text className="sort-arrow">▼</Text>
          </View>
        </View>

        {/* 商品列表 */}
        <ScrollView className="products-scroll" scrollY onScrollToLower={this.onReachBottom}>
          <View className="products-list">
            {products.map(product => this.renderProductCard(product))}
          </View>

          {/* 加载更多 */}
          <AtLoadMore
            status={loading ? 'loading' : hasMore ? 'more' : 'noMore'}
            loadingText="加载中..."
            moreText="上拉加载更多"
            noMoreText="没有更多商品了"
          />
        </ScrollView>

        {/* 排序弹窗 */}
        <AtFloatLayout
          isOpened={showSortModal}
          title="排序方式"
          onClose={this.handleCloseSortModal}
        >
          <View className="sort-options">
            {this.sortOptions.map(option => (
              <View
                key={option.value}
                className={`sort-option ${
                  this.getCurrentSortLabel() === option.label ? 'active' : ''
                }`}
                onClick={() => this.handleSelectSort(option)}
              >
                <Text className="option-text">{option.label}</Text>
                {this.getCurrentSortLabel() === option.label && (
                  <Text className="check-icon">✓</Text>
                )}
              </View>
            ))}
          </View>
        </AtFloatLayout>

        {/* 空状态 */}
        {!loading && products.length === 0 && (
          <View className="empty-state">
            <Text className="empty-icon">📦</Text>
            <Text className="empty-text">暂无商品</Text>
            <AtButton type="primary" size="small" onClick={() => this.loadProducts(true)}>
              重新加载
            </AtButton>
          </View>
        )}
      </View>
    );
  }
}
