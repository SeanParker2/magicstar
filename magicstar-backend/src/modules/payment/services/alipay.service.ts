import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
// import * as moment from 'moment';

import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentRecord, PaymentRecordType, PaymentRecordStatus } from '../entities/payment-record.entity';
import { AlipayDto } from '../dto/create-payment.dto';

interface AlipayConfig {
  appId: string;
  privateKey: string;
  publicKey: string;
  alipayPublicKey: string;
  notifyUrl: string;
  returnUrl: string;
  gatewayUrl: string;
}

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private readonly config: AlipayConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = {
      appId: this.configService.get<string>('alipay.appId') || '',
      privateKey: this.configService.get<string>('alipay.privateKey') || '',
      publicKey: this.configService.get<string>('alipay.publicKey') || '',
      alipayPublicKey: this.configService.get<string>('alipay.alipayPublicKey') || '',
      notifyUrl: this.configService.get<string>('alipay.notifyUrl') || '',
      returnUrl: this.configService.get<string>('alipay.returnUrl') || '',
      gatewayUrl: this.configService.get<string>('alipay.gatewayUrl') || 'https://openapi.alipay.com/gateway.do',
    };
  }

  /**
   * 获取支付方法
   */
  private getPaymentMethod(productCode: string): string {
    const methodMap = {
      'QUICK_MSECURITY_PAY': 'alipay.trade.app.pay', // APP支付
      'FAST_INSTANT_TRADE_PAY': 'alipay.trade.page.pay', // 网页支付
      'FACE_TO_FACE_PAYMENT': 'alipay.trade.precreate', // 扫码支付
    };
    return methodMap[productCode] || 'alipay.trade.app.pay';
  }

  /**
   * 调用支付宝API
   */
  private async callAlipayAPI(params: any): Promise<any> {
    try {
      // 模拟API调用
      return {
        qr_code: `https://qr.alipay.com/${Date.now()}`,
        trade_no: `2024${Date.now()}`,
        out_trade_no: params.out_trade_no,
      };
    } catch (error) {
      throw new Error(`支付宝API调用失败: ${error.message}`);
    }
  }

  /**
   * 创建支付宝支付订单
   */
  async createPayment(payment: Payment, alipayDto: AlipayDto): Promise<any> {
    this.logger.log(`创建支付宝支付订单: ${payment.paymentNo}`);
    
    try {
      // 构建支付参数
      const bizContent = {
        out_trade_no: payment.paymentNo,
        total_amount: payment.amount.toFixed(2),
        subject: payment.description || '商品支付',
        body: payment.description || '商品支付',
        timeout_express: '30m',
        product_code: alipayDto.productCode || 'QUICK_MSECURITY_PAY',
      };

      // 添加可选参数
      if (alipayDto.quitUrl) {
        bizContent['quit_url'] = alipayDto.quitUrl;
      }
      if (alipayDto.passbackParams) {
        bizContent['passback_params'] = alipayDto.passbackParams;
      }

      const params = {
        app_id: this.config.appId,
        method: this.getPaymentMethod(alipayDto.productCode || 'QUICK_MSECURITY_PAY'),
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        version: '1.0',
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify(bizContent),
      };

      // 添加return_url（仅网页支付需要）
      if (alipayDto.productCode === 'FAST_INSTANT_TRADE_PAY') {
        params['return_url'] = this.config.returnUrl;
      }

      // 生成签名
      params['sign'] = this.generateSign(params);

      // 根据支付类型返回不同的支付参数
      if (alipayDto.productCode === 'QUICK_MSECURITY_PAY') {
        // APP支付 - 返回订单字符串
        return {
          orderString: this.buildPaymentString(params),
          paymentNo: payment.paymentNo,
          method: 'app',
        };
      } else if (alipayDto.productCode === 'FAST_INSTANT_TRADE_PAY') {
        // 网页支付 - 返回支付URL
        return {
          payUrl: `${this.config.gatewayUrl}?${this.buildPaymentString(params)}`,
          paymentNo: payment.paymentNo,
          method: 'web',
        };
      } else if (alipayDto.productCode === 'FACE_TO_FACE_PAYMENT') {
        // 扫码支付 - 调用API获取二维码
        const response = await this.callAlipayAPI(params);
        return {
          qrCode: response?.qr_code || `https://qr.alipay.com/${Date.now()}`,
          paymentNo: payment.paymentNo,
          method: 'qrcode',
        };
      } else {
        throw new BadRequestException('不支持的支付类型');
      }
    } catch (error) {
      this.logger.error(`支付宝支付订单创建失败: ${error.message}`, error.stack);
      throw new BadRequestException('支付宝支付订单创建失败');
    }
  }

  /**
   * 处理支付宝回调
   */
  async handleCallback(params: any): Promise<{ success: boolean; message: string }> {
    this.logger.log('处理支付宝回调');
    
    try {
      // 验证签名
      if (!this.verifySign(params)) {
        this.logger.error('支付宝回调签名验证失败');
        return { success: false, message: 'fail' };
      }

      // 验证支付状态
      const tradeStatus = params.trade_status;
      if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
        // 支付成功，更新订单状态
        const paymentNo = params.out_trade_no;
        const tradeNo = params.trade_no;
        const totalAmount = parseFloat(params.total_amount);
        
        this.logger.log(`支付成功: 订单号=${paymentNo}, 交易号=${tradeNo}, 金额=${totalAmount}`);
        
        // 记录支付记录
        await this.createPaymentRecord(
          paymentNo,
          PaymentRecordType.NOTIFY,
          '支付宝支付成功回调',
          params,
          { success: true },
          PaymentRecordStatus.SUCCESS,
          undefined,
          tradeNo
        );
        
        return { success: true, message: 'success' };
      } else {
        this.logger.warn(`支付状态异常: ${tradeStatus}`);
        return { success: false, message: 'fail' };
      }
    } catch (error) {
      this.logger.error(`支付宝回调处理失败: ${error.message}`, error.stack);
      
      // 记录错误
      await this.createPaymentRecord(
        params.out_trade_no || 'unknown',
        PaymentRecordType.NOTIFY,
        '支付宝回调处理失败',
        params,
        { error: error.message },
        PaymentRecordStatus.FAILED,
        error.message
      );
      
      return { success: false, message: 'fail' };
    }
  }

  /**
   * 查询支付状态
   */
  async queryPayment(paymentNo: string): Promise<any> {
    this.logger.log(`查询支付宝支付状态: ${paymentNo}`);
    
    // 模拟查询结果
    return {
      code: '10000',
      msg: 'Success',
      out_trade_no: paymentNo,
      trade_no: `alipay_${Date.now()}`,
      trade_status: 'TRADE_SUCCESS',
      total_amount: '100.00',
      receipt_amount: '100.00',
      buyer_pay_amount: '100.00',
      point_amount: '0.00',
      invoice_amount: '100.00',
      send_pay_date: new Date().toISOString(),
      buyer_user_id: '2088000000000001',
      buyer_logon_id: '138****0000',
    };
  }

  /**
   * 退款
   */
  async refund(paymentNo: string, refundAmount: number, refundReason?: string): Promise<any> {
    this.logger.log(`支付宝退款: ${paymentNo}, 金额: ${refundAmount}`);
    
    // 模拟退款结果
    return {
      code: '10000',
      msg: 'Success',
      out_trade_no: paymentNo,
      trade_no: `alipay_${Date.now()}`,
      out_refund_no: `refund_${Date.now()}`,
      refund_fee: refundAmount.toString(),
      gmt_refund_pay: new Date().toISOString(),
      fund_change: 'Y',
    };
  }

  /**
   * 生成订单字符串
   */
  private generateOrderString(payment: Payment, alipayDto: AlipayDto): string {
    const params = {
      app_id: this.config.appId,
      method: 'alipay.trade.app.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatDateTime(new Date()),
      version: '1.0',
      notify_url: this.config.notifyUrl,
      biz_content: JSON.stringify({
        out_trade_no: payment.paymentNo,
        total_amount: payment.amount.toString(),
        subject: payment.description || '商品支付',
        product_code: alipayDto.productCode,
        timeout_express: '30m',
      }),
    };

    // 生成签名
    const sign = this.generateSign(params);
    params['sign'] = sign;

    // 构建参数字符串
    return this.buildPaymentString(params);
  }

  /**
   * 生成签名
   */
  private generateSign(params: any): string {
    // 过滤空值并排序
    const filteredParams = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== '' && key !== 'sign')
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    // 构建签名字符串
    const signString = Object.keys(filteredParams)
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    // RSA签名（模拟）
    return this.rsaSign(signString);
  }

  /**
   * 验证签名
   */
  private verifySign(params: any): boolean {
    const sign = params.sign;
    delete params.sign;
    const calculatedSign = this.generateSign(params);
    return this.rsaVerify(calculatedSign, sign);
  }

  /**
   * RSA签名（模拟）
   */
  private rsaSign(data: string): string {
    // 模拟RSA签名
    return Buffer.from(data).toString('base64');
  }

  /**
   * RSA验签（模拟）
   */
  private rsaVerify(data: string, sign: string): boolean {
    // 模拟RSA验签
    return Buffer.from(data).toString('base64') === sign;
  }

  /**
   * 构建支付参数字符串
   */
  private buildPaymentString(params: any): string {
    return Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  /**
   * 创建支付记录（模拟）
   */
  private async createPaymentRecord(
    paymentId: string,
    type: PaymentRecordType,
    description: string,
    requestData?: any,
    responseData?: any,
    status: PaymentRecordStatus = PaymentRecordStatus.SUCCESS,
    errorMessage?: string,
    thirdPartyTransactionId?: string,
    processingTime: number = 0
  ): Promise<void> {
    // 模拟记录创建
    this.logger.log(`Payment record created: ${type} - ${description}`);
  }
}