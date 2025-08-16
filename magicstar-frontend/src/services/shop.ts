import { request } from './api';

// 商品相关接口类型定义
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  images: string[];
  categoryId: number;
  category: ProductCategory;
  stock: number;
  sales: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  tags: string[];
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSpec {
  name: string;
  options?: string[];
}

export interface ProductDetail extends Product {
  images: string[];
  detail?: string;
  specs?: ProductSpec[];
  rating?: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  children?: ProductCategory[];
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
}

export interface CartItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  selectedSpecs?: Record<string, any>;
  specs?: Record<string, string>;
  addedAt: string;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalAmount: number;
  totalQuantity: number;
  updatedAt: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'sales' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
  specs?: Record<string, string>;
}

export interface UpdateCartItemRequest {
  cartItemId: number;
  quantity: number;
  specifications?: Record<string, any>;
}

// 商城API服务类
class ShopService {
  // 获取商品分类列表
  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await request({
        url: '/api/shop/categories',
        method: 'GET',
        cache: {
          enabled: true,
          ttl: 10 * 60 * 1000, // 10分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取商品分类失败:', error);
      throw error;
    }
  }

  // 获取商品列表
  async getProducts(params: ProductListParams = {}): Promise<{
    products: Product[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/shop/products',
        method: 'GET',
        data: params,
        cache: {
          enabled: true,
          ttl: 5 * 60 * 1000, // 5分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取商品列表失败:', error);
      throw error;
    }
  }

  // 获取商品详情
  async getProductDetail(productId: number): Promise<Product> {
    try {
      const response = await request({
        url: `/api/shop/products/${productId}`,
        method: 'GET',
        cache: {
          enabled: true,
          ttl: 5 * 60 * 1000, // 5分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取商品详情失败:', error);
      throw error;
    }
  }

  // 搜索商品
  async searchProducts(
    keyword: string,
    params: Omit<ProductListParams, 'keyword'> = {}
  ): Promise<{
    products: Product[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/shop/products/search',
        method: 'GET',
        data: {
          keyword,
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      console.error('搜索商品失败:', error);
      throw error;
    }
  }

  // 获取购物车
  async getCart(): Promise<Cart> {
    try {
      const response = await request({
        url: '/api/shop/cart',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取购物车失败:', error);
      throw error;
    }
  }

  // 添加商品到购物车
  async addToCart(data: AddToCartRequest): Promise<CartItem> {
    try {
      const response = await request({
        url: '/api/shop/cart/items',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('添加到购物车失败:', error);
      throw error;
    }
  }

  // 更新购物车商品
  async updateCartItem(itemId: number, data: { quantity: number }): Promise<CartItem> {
    try {
      const response = await request({
        url: `/api/shop/cart/items/${itemId}`,
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新购物车商品失败:', error);
      throw error;
    }
  }

  // 删除购物车商品
  async removeFromCart(cartItemId: number): Promise<void> {
    try {
      await request({
        url: `/api/shop/cart/items/${cartItemId}`,
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除购物车商品失败:', error);
      throw error;
    }
  }

  // 清空购物车
  async clearCart(): Promise<void> {
    try {
      await request({
        url: '/api/shop/cart/clear',
        method: 'POST',
      });
    } catch (error) {
      console.error('清空购物车失败:', error);
      throw error;
    }
  }

  // 获取热门商品
  async getHotProducts(limit: number = 10): Promise<Product[]> {
    try {
      const response = await request({
        url: '/api/shop/products/hot',
        method: 'GET',
        data: { limit },
        cache: {
          enabled: true,
          ttl: 15 * 60 * 1000, // 15分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取热门商品失败:', error);
      throw error;
    }
  }

  // 获取推荐商品
  async getRecommendedProducts(limit: number = 10): Promise<Product[]> {
    try {
      const response = await request({
        url: '/api/shop/products/recommended',
        method: 'GET',
        data: { limit },
        cache: {
          enabled: true,
          ttl: 10 * 60 * 1000, // 10分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取推荐商品失败:', error);
      throw error;
    }
  }
}

export const shopService = new ShopService();
export default shopService;
