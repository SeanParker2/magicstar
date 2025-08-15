import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import { v4 as uuidv4 } from 'uuid';

import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentRecord, PaymentRecordType, PaymentRecordStatus } from '../entities/payment-record.entity';
import { WechatPaymentDto } from '../dto/create-payment.dto';
import { PaymentCallbackDto } from '../dto/payment-query.dto';

interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  notifyUrl: string;
  certPath?: string;
  keyPath?: string;
}

@Injectable()
export class WechatPaymentService {
  private readonly logger = new Logger(WechatPaymentService.name);
  private readonly config: WechatPayConfig;
  private readonly unifiedOrderUrl = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
  private readonly orderQueryUrl = 'https://api.mch.weixin.qq.com/pay/orderquery';
  private readonly refundUrl = 'https://api.mch.weixin.qq.com/secapi/pay/refund';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = {
      appId: this.configService.get<string>('wechat.appId') || '',
      mchId: this.configService.get<string>('wechat.mchId') || '',
      apiKey: this.configService.get<string>('wechat.apiKey') || '',
      notifyUrl: this.configService.get<string>('wechat.notifyUrl') || '',
      certPath: this.configService.get<string>('wechat.certPath'),
      keyPath: this.configService.get<string>('wechat.keyPath'),
    };
  }

  /**
   * 创建微信支付订单
   */
  async createPayment(payment: Payment, wechatPaymentDto: WechatPaymentDto): Promise<any> {
    this.logger.log(`创建微信支付订单: ${payment.paymentNo}`);
    
    try {
      // 模拟微信支付响应
      const mockResponse = {
        return_code: 'SUCCESS',
        return_msg: 'OK',
        result_code: 'SUCCESS',
        prepay_id: `prepay_id_${Date.now()}`,
        trade_type: wechatPaymentDto.tradeType || 'JSAPI',
        code_url: wechatPaymentDto.tradeType === 'NATIVE' ? `weixin://wxpay/bizpayurl?pr=${Date.now()}` : undefined,
      };

      // 根据支付类型返回不同的支付参数
      if (wechatPaymentDto.tradeType === 'JSAPI') {
        return this.generateJSAPIPayParams(mockResponse.prepay_id);
      } else if (wechatPaymentDto.tradeType === 'NATIVE') {
        return {
          codeUrl: mockResponse.code_url,
          paymentNo: payment.paymentNo,
        };
      } else if (wechatPaymentDto.tradeType === 'APP') {
        return this.generateAPPPayParams(mockResponse.prepay_id);
      } else {
        throw new BadRequestException('不支持的支付类型');
      }
    } catch (error) {
      this.logger.error(`微信支付订单创建失败: ${error.message}`, error.stack);
      throw new BadRequestException('微信支付订单创建失败');
    }
  }

  /**
   * 生成JSAPI支付参数
   */
  private generateJSAPIPayParams(prepayId: string): any {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;
    const signType = 'MD5';

    const paySign = this.generateSign({
      appId: this.config.appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType,
    });

    return {
      appId: this.config.appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType,
      paySign,
    };
  }

  /**
   * 生成APP支付参数
   */
  private generateAPPPayParams(prepayId: string): any {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = 'Sign=WXPay';
    const sign = this.generateSign({
      appid: this.config.appId,
      partnerid: this.config.mchId,
      prepayid: prepayId,
      package: packageStr,
      noncestr: nonceStr,
      timestamp: timeStamp,
    });

    return {
      appid: this.config.appId,
      partnerid: this.config.mchId,
      prepayid: prepayId,
      package: packageStr,
      noncestr: nonceStr,
      timestamp: timeStamp,
      sign,
    };
  }

  /**
   * 处理微信支付回调
   */
  async handleCallback(xmlData: string): Promise<{ success: boolean; message: string }> {
    this.logger.log('处理微信支付回调');
    
    try {
      // 模拟回调处理成功
      this.logger.log('微信支付回调处理成功');
      return { success: true, message: 'OK' };
    } catch (error) {
      this.logger.error(`微信支付回调处理失败: ${error.message}`, error.stack);
      return { success: false, message: 'FAIL' };
    }
  }

  /**
   * 查询支付状态
   */
  async queryPayment(paymentNo: string): Promise<any> {
    this.logger.log(`查询微信支付状态: ${paymentNo}`);
    
    // 模拟查询结果
    return {
      return_code: 'SUCCESS',
      return_msg: 'OK',
      result_code: 'SUCCESS',
      trade_state: 'SUCCESS',
      trade_state_desc: '支付成功',
      transaction_id: `wx_${Date.now()}`,
      out_trade_no: paymentNo,
      total_fee: 100,
      cash_fee: 100,
      time_end: new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''),
    };
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  /**
   * 生成签名
   */
  private generateSign(params: any): string {
    // 过滤空值并排序
    const filteredParams = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== '')
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    // 构建签名字符串
    const stringA = Object.keys(filteredParams)
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');
    
    const stringSignTemp = `${stringA}&key=${this.config.apiKey}`;
    
    // MD5加密并转大写
    return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 验证签名
   */
  private verifySign(params: any): boolean {
    const sign = params.sign;
    delete params.sign;
    const calculatedSign = this.generateSign(params);
    return sign === calculatedSign;
  }

  /**
   * 对象转XML
   */
  private objectToXml(obj: any): string {
    const builder = new xml2js.Builder({
      rootName: 'xml',
      headless: true,
      renderOpts: { pretty: false },
    });
    return builder.buildObject(obj);
  }

  /**
   * XML转对象
   */
  private async xmlToObject(xml: string): Promise<any> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
    });
    
    try {
      const result = await parser.parseStringPromise(xml);
      return result.xml;
    } catch (error) {
      this.logger.error(`XML解析失败: ${error.message}`);
      throw new BadRequestException('XML格式错误');
    }
  }

  /**
   * 创建支付记录
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