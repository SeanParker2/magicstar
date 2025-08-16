import { request } from './api';
import type { Product } from './shop';

// 订单相关接口类型定义
export interface OrderItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  price: number;
  totalPrice: number;
  specifications?: Record<string, any>;
}

export interface ShippingAddress {
  id?: number;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod?: string;
  paymentTime?: string;
  shippingTime?: string;
  deliveryTime?: string;
  completedTime?: string;
  cancelledTime?: string;
  cancelReason?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  cartItemIds?: number[]; // 从购物车创建订单
  items?: {
    // 直接购买
    productId: number;
    quantity: number;
    specifications?: Record<string, any>;
  }[];
  shippingAddressId: number;
  remark?: string;
  couponId?: number;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface OrderStatusUpdate {
  status: 'cancelled' | 'confirmed';
  reason?: string;
}

export interface RefundRequest {
  orderId: number;
  reason: string;
  amount?: number;
  items?: {
    orderItemId: number;
    quantity: number;
  }[];
}

export interface RefundRecord {
  id: number;
  orderId: number;
  orderNo: string;
  refundNo: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  processedAt?: string;
  completedAt?: string;
  remark?: string;
  createdAt: string;
}

// 订单API服务类
class OrderService {
  // 创建订单
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    try {
      const response = await request({
        url: '/api/shop/orders',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }

  // 获取订单列表
  async getOrders(params: OrderListParams = {}): Promise<{
    orders: Order[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/shop/orders',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取订单列表失败:', error);
      throw error;
    }
  }

  // 获取订单详情
  async getOrderDetail(orderId: number): Promise<Order> {
    try {
      const response = await request({
        url: `/api/shop/orders/${orderId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取订单详情失败:', error);
      throw error;
    }
  }

  // 根据订单号获取订单详情
  async getOrderByNo(orderNo: string): Promise<Order> {
    try {
      const response = await request({
        url: `/api/shop/orders/no/${orderNo}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取订单详情失败:', error);
      throw error;
    }
  }

  // 更新订单状态
  async updateOrderStatus(orderId: number, data: OrderStatusUpdate): Promise<Order> {
    try {
      const response = await request({
        url: `/api/shop/orders/${orderId}/status`,
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新订单状态失败:', error);
      throw error;
    }
  }

  // 取消订单
  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    try {
      const response = await request({
        url: `/api/shop/orders/${orderId}/cancel`,
        method: 'POST',
        data: { reason },
      });
      return response.data;
    } catch (error) {
      console.error('取消订单失败:', error);
      throw error;
    }
  }

  // 确认收货
  async confirmDelivery(orderId: number): Promise<Order> {
    try {
      const response = await request({
        url: `/api/shop/orders/${orderId}/confirm`,
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('确认收货失败:', error);
      throw error;
    }
  }

  // 申请退款
  async requestRefund(data: RefundRequest): Promise<RefundRecord> {
    try {
      const response = await request({
        url: '/api/shop/refunds',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('申请退款失败:', error);
      throw error;
    }
  }

  // 获取退款记录列表
  async getRefunds(
    params: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ): Promise<{
    refunds: RefundRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/shop/refunds',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取退款记录失败:', error);
      throw error;
    }
  }

  // 获取退款详情
  async getRefundDetail(refundId: number): Promise<RefundRecord> {
    try {
      const response = await request({
        url: `/api/shop/refunds/${refundId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取退款详情失败:', error);
      throw error;
    }
  }

  // 获取收货地址列表
  async getShippingAddresses(): Promise<ShippingAddress[]> {
    try {
      const response = await request({
        url: '/api/shop/addresses',
        method: 'GET',
        cache: {
          enabled: true,
          ttl: 5 * 60 * 1000, // 5分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取收货地址失败:', error);
      throw error;
    }
  }

  // 添加收货地址
  async addShippingAddress(data: Omit<ShippingAddress, 'id'>): Promise<ShippingAddress> {
    try {
      const response = await request({
        url: '/api/shop/addresses',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('添加收货地址失败:', error);
      throw error;
    }
  }

  // 更新收货地址
  async updateShippingAddress(
    addressId: number,
    data: Partial<ShippingAddress>
  ): Promise<ShippingAddress> {
    try {
      const response = await request({
        url: `/api/shop/addresses/${addressId}`,
        method: 'PUT',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('更新收货地址失败:', error);
      throw error;
    }
  }

  // 删除收货地址
  async deleteShippingAddress(addressId: number): Promise<void> {
    try {
      await request({
        url: `/api/shop/addresses/${addressId}`,
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除收货地址失败:', error);
      throw error;
    }
  }

  // 设置默认收货地址
  async setDefaultAddress(addressId: number): Promise<ShippingAddress> {
    try {
      const response = await request({
        url: `/api/shop/addresses/${addressId}/default`,
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('设置默认地址失败:', error);
      throw error;
    }
  }
}

export const orderService = new OrderService();
export default orderService;
