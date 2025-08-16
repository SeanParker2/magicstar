import { request } from './api';

// 财务相关接口类型定义
export interface FinancialRecord {
  id: number;
  userId: number;
  type: 'income' | 'expense' | 'refund' | 'commission';
  category: string;
  amount: number;
  description: string;
  orderId?: number;
  orderNo?: string;
  paymentId?: string;
  refundId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletBalance {
  userId: number;
  totalBalance: number;
  availableBalance: number;
  frozenBalance: number;
  totalIncome: number;
  totalExpense: number;
  updatedAt: string;
}

export interface WithdrawRequest {
  amount: number;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  remark?: string;
}

export interface WithdrawRecord {
  id: number;
  userId: number;
  amount: number;
  fee: number;
  actualAmount: number;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  remark?: string;
  processedAt?: string;
  completedAt?: string;
  failReason?: string;
  createdAt: string;
}

export interface RechargeRequest {
  amount: number;
  paymentMethod: string;
}

export interface RechargeRecord {
  id: number;
  userId: number;
  amount: number;
  paymentMethod: string;
  paymentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paidAt?: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  totalRefund: number;
  totalCommission: number;
  currentBalance: number;
  pendingAmount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// 财务API服务类
class FinanceService {
  // 获取钱包余额
  async getWalletBalance(): Promise<WalletBalance> {
    try {
      const response = await request({
        url: '/api/finance/wallet/balance',
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取钱包余额失败:', error);
      throw error;
    }
  }

  // 获取财务记录列表
  async getFinancialRecords(params: TransactionListParams = {}): Promise<{
    records: FinancialRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/finance/records',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取财务记录失败:', error);
      throw error;
    }
  }

  // 获取财务记录详情
  async getFinancialRecord(recordId: number): Promise<FinancialRecord> {
    try {
      const response = await request({
        url: `/api/finance/records/${recordId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取财务记录详情失败:', error);
      throw error;
    }
  }

  // 获取财务汇总
  async getFinancialSummary(
    params: {
      startDate?: string;
      endDate?: string;
      period?: 'day' | 'week' | 'month' | 'year';
    } = {}
  ): Promise<FinancialSummary> {
    try {
      const response = await request({
        url: '/api/finance/summary',
        method: 'GET',
        data: params,
        cache: {
          enabled: true,
          ttl: 5 * 60 * 1000, // 5分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取财务汇总失败:', error);
      throw error;
    }
  }

  // 申请提现
  async requestWithdraw(data: WithdrawRequest): Promise<WithdrawRecord> {
    try {
      const response = await request({
        url: '/api/finance/withdraw',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('申请提现失败:', error);
      throw error;
    }
  }

  // 获取提现记录列表
  async getWithdrawRecords(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    records: WithdrawRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/finance/withdraw/records',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取提现记录失败:', error);
      throw error;
    }
  }

  // 获取提现记录详情
  async getWithdrawRecord(recordId: number): Promise<WithdrawRecord> {
    try {
      const response = await request({
        url: `/api/finance/withdraw/records/${recordId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取提现记录详情失败:', error);
      throw error;
    }
  }

  // 取消提现
  async cancelWithdraw(recordId: number): Promise<WithdrawRecord> {
    try {
      const response = await request({
        url: `/api/finance/withdraw/records/${recordId}/cancel`,
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('取消提现失败:', error);
      throw error;
    }
  }

  // 申请充值
  async requestRecharge(data: RechargeRequest): Promise<RechargeRecord> {
    try {
      const response = await request({
        url: '/api/finance/recharge',
        method: 'POST',
        data,
      });
      return response.data;
    } catch (error) {
      console.error('申请充值失败:', error);
      throw error;
    }
  }

  // 获取充值记录列表
  async getRechargeRecords(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    records: RechargeRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await request({
        url: '/api/finance/recharge/records',
        method: 'GET',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('获取充值记录失败:', error);
      throw error;
    }
  }

  // 获取充值记录详情
  async getRechargeRecord(recordId: number): Promise<RechargeRecord> {
    try {
      const response = await request({
        url: `/api/finance/recharge/records/${recordId}`,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('获取充值记录详情失败:', error);
      throw error;
    }
  }

  // 获取提现手续费
  async getWithdrawFee(amount: number): Promise<{
    fee: number;
    actualAmount: number;
    feeRate: number;
  }> {
    try {
      const response = await request({
        url: '/api/finance/withdraw/fee',
        method: 'GET',
        data: { amount },
        cache: {
          enabled: true,
          ttl: 2 * 60 * 1000, // 2分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取提现手续费失败:', error);
      throw error;
    }
  }

  // 获取收支统计
  async getIncomeExpenseStats(params: {
    period: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<{
    income: Array<{ date: string; amount: number }>;
    expense: Array<{ date: string; amount: number }>;
    categories: Array<{ category: string; amount: number; percentage: number }>;
  }> {
    try {
      const response = await request({
        url: '/api/finance/stats/income-expense',
        method: 'GET',
        data: params,
        cache: {
          enabled: true,
          ttl: 10 * 60 * 1000, // 10分钟缓存
        },
      });
      return response.data;
    } catch (error) {
      console.error('获取收支统计失败:', error);
      throw error;
    }
  }

  // 导出财务记录
  async exportFinancialRecords(params: {
    startDate: string;
    endDate: string;
    type?: string;
    format?: 'excel' | 'csv';
  }): Promise<{ downloadUrl: string }> {
    try {
      const response = await request({
        url: '/api/finance/export',
        method: 'POST',
        data: params,
      });
      return response.data;
    } catch (error) {
      console.error('导出财务记录失败:', error);
      throw error;
    }
  }
}

export const financeService = new FinanceService();
export default financeService;
