import { request } from './api';

// 支付相关接口类型定义
export interface PaymentMethod {
  id: string;
  name: string;
  type: 'wechat' | 'alipay' | 'apple_pay' | 'bank_card';
  icon: string;
  enabled: boolean;
  description?: string;
}

export interface PaymentRequest {
  orderId: number;
  paymentMethod: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface PaymentResult {
  paymentId: string;
  orderId: number;
  orderNo: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentData?: any; // 支付平台返回的数据
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface WechatPayData {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

export interface AlipayData {
  orderString: string;
}

export interface PaymentRecord {
  id: string;
  orderId: number;
  orderNo: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
  transactionId?: string;
  refundAmount?: number;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // 不传则全额退款
  reason: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  refundTransactionId?: string;
  processedAt?: string;
  createdAt: string;
}

// 支付API服务类
class PaymentService {
  // 获取支付方式列表
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await request({
        url: '/api/payment/methods',
        method: 'GET',
        cache: {
          enabled: true,
          ttl: 10 * 60 * 1000, // 10分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取支付方式失败:', error);
      throw error;
    }
  }

  // 创建支付订单
  async createPayment(data: PaymentRequest): Promise<PaymentResult> {
    try {
      const response = await request({
        url: '/api/payment/create',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('创建支付订单失败:', error);
      throw error;
    }
  }

  // 查询支付状态
  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const response = await request({
        url: `/api/payment/${paymentId}/status`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('查询支付状态失败:', error);
      throw error;
    }
  }

  // 微信支付
  async wechatPay(orderId: number): Promise<WechatPayData> {
    try {
      const response = await request({
        url: '/api/payment/wechat/pay',
        method: 'POST',
        data: { orderId },
      });
      return response.data;
    } catch (error) {
      console.error('微信支付失败:', error);
      throw error;
    }
  }

  // 支付宝支付
  async alipay(orderId: number): Promise<AlipayData> {
    try {
      const response = await request({
        url: '/api/payment/alipay/pay',
        method: 'POST',
        data: { orderId },
      });
      return response.data;
    } catch (error) {
      console.error('支付宝支付失败:', error);
      throw error;
    }
  }

  // Apple Pay
  async applePay(orderId: number): Promise<any> {
    try {
      const response = await request({
        url: '/api/payment/apple/pay',
        method: 'POST',
        data: { orderId },
      });
      return response.data;
    } catch (error) {
      console.error('Apple Pay支付失败:', error);
      throw error;
    }
  }

  // 验证支付结果
  async verifyPayment(paymentId: string, paymentData: any): Promise<PaymentResult> {
    try {
      const response = await request({
        url: `/api/payment/${paymentId}/verify`,
        method: 'POST',
        data: paymentData,
      });
      return response.data;
    } catch (error) {
      console.error('验证支付结果失败:', error);
      throw error;
    }
  }

  // 取消支付
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      await request({
        url: `/api/payment/${paymentId}/cancel`,
        method: 'POST',
      });
    } catch (error) {
      console.error('取消支付失败:', error);
      throw error;
    }
  }

  // 申请退款
  async requestRefund(data: RefundRequest): Promise<RefundResult> {
    try {
      const response = await request({
        url: '/api/payment/refund',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('申请退款失败:', error);
      throw error;
    }
  }

  // 查询退款状态
  async getRefundStatus(refundId: string): Promise<RefundResult> {
    try {
      const response = await request({
        url: `/api/payment/refund/${refundId}/status`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('查询退款状态失败:', error);
      throw error;
    }
  }

  // 获取支付记录列表
  async getPaymentRecords(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      paymentMethod?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    records: PaymentRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/payment/records',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取支付记录失败:', error);
      throw error;
    }
  }

  // 获取支付记录详情
  async getPaymentRecord(paymentId: string): Promise<PaymentRecord> {
    try {
      const response = await request({
        url: `/api/payment/records/${paymentId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取支付记录详情失败:', error);
      throw error;
    }
  }

  // 获取订单支付记录
  async getOrderPaymentRecords(orderId: number): Promise<PaymentRecord[]> {
    try {
      const response = await request({
        url: `/api/payment/orders/${orderId}/records`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取订单支付记录失败:', error);
      throw error;
    }
  }

  // 重新支付
  async retryPayment(orderId: number, paymentMethod: string): Promise<PaymentResult> {
    try {
      const response = await request({
        url: '/api/payment/retry',
        method: 'POST',
        data: {
          orderId,
          paymentMethod,
        },
      });
      return response.data;
    } catch (error) {
      console.error('重新支付失败:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
