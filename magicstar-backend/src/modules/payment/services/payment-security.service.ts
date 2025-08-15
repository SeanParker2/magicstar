import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentRecord, PaymentRecordType, PaymentRecordStatus } from '../entities/payment-record.entity';
import { Payment, PaymentMethod } from '../entities/payment.entity';

@Injectable()
export class PaymentSecurityService {
  private readonly logger = new Logger(PaymentSecurityService.name);
  private readonly duplicatePaymentCache = new Map<string, number>();
  private readonly signatureSecrets: Map<PaymentMethod, string> = new Map();

  constructor(private readonly configService: ConfigService) {
    // 初始化签名密钥
    this.signatureSecrets.set(
      PaymentMethod.WECHAT_PAY,
      this.configService.get<string>('wechat.apiKey') || 'default_wechat_key'
    );
    this.signatureSecrets.set(
      PaymentMethod.ALIPAY,
      this.configService.get<string>('alipay.privateKey') || 'default_alipay_key'
    );
  }

  /**
   * 验证支付签名
   */
  verifyPaymentSignature(
    paymentMethod: PaymentMethod,
    data: any,
    signature: string
  ): boolean {
    try {
      const secret = this.signatureSecrets.get(paymentMethod);
      if (!secret) {
        this.logger.error(`未找到支付方式 ${paymentMethod} 的签名密钥`);
        return false;
      }

      let expectedSignature: string;
      
      if (paymentMethod === PaymentMethod.WECHAT_PAY) {
        expectedSignature = this.generateWechatSignature(data, secret);
      } else if (paymentMethod === PaymentMethod.ALIPAY) {
        expectedSignature = this.generateAlipaySignature(data, secret);
      } else {
        this.logger.error(`不支持的支付方式: ${paymentMethod}`);
        return false;
      }

      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        this.logger.warn(`签名验证失败: ${paymentMethod}`, {
          expected: expectedSignature,
          received: signature,
          data: JSON.stringify(data)
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error(`签名验证异常: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 检查重复支付
   */
  checkDuplicatePayment(paymentNo: string, amount: number): boolean {
    const key = `${paymentNo}_${amount}`;
    const now = Date.now();
    const lastPaymentTime = this.duplicatePaymentCache.get(key);

    // 5分钟内的重复支付视为重复
    const duplicateWindow = 5 * 60 * 1000;
    
    if (lastPaymentTime && (now - lastPaymentTime) < duplicateWindow) {
      this.logger.warn(`检测到重复支付: ${paymentNo}, 金额: ${amount}`);
      return true;
    }

    // 记录本次支付时间
    this.duplicatePaymentCache.set(key, now);
    
    // 清理过期缓存
    this.cleanupExpiredCache();
    
    return false;
  }

  /**
   * 验证支付金额
   */
  validatePaymentAmount(originalAmount: number, callbackAmount: number): boolean {
    // 允许1分钱的误差
    const tolerance = 0.01;
    const difference = Math.abs(originalAmount - callbackAmount);
    
    if (difference > tolerance) {
      this.logger.warn(`支付金额不匹配`, {
        original: originalAmount,
        callback: callbackAmount,
        difference
      });
      return false;
    }
    
    return true;
  }

  /**
   * 验证支付时间窗口
   */
  validatePaymentTimeWindow(paymentTime: Date, callbackTime: Date): boolean {
    // 支付回调应在支付创建后24小时内
    const maxWindow = 24 * 60 * 60 * 1000; // 24小时
    const timeDiff = callbackTime.getTime() - paymentTime.getTime();
    
    if (timeDiff < 0 || timeDiff > maxWindow) {
      this.logger.warn(`支付时间窗口验证失败`, {
        paymentTime: paymentTime.toISOString(),
        callbackTime: callbackTime.toISOString(),
        timeDiff
      });
      return false;
    }
    
    return true;
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(
    eventType: string,
    paymentNo: string,
    details: any,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const logData = {
      eventType,
      paymentNo,
      details,
      severity,
      timestamp: new Date().toISOString(),
      ip: details.clientIp || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };

    this.logger.warn(`安全事件: ${eventType}`, logData);

    // TODO: 可以集成到专门的安全日志系统
    // await this.securityLogService.log(logData);
  }

  /**
   * 生成微信支付签名
   */
  private generateWechatSignature(data: any, secret: string): string {
    // 微信支付签名算法
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys
      .filter(key => data[key] !== '' && key !== 'sign')
      .map(key => `${key}=${data[key]}`)
      .join('&') + `&key=${secret}`;
    
    return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 生成支付宝签名
   */
  private generateAlipaySignature(data: any, privateKey: string): string {
    // 支付宝RSA2签名算法
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys
      .filter(key => data[key] !== '' && key !== 'sign' && key !== 'sign_type')
      .map(key => `${key}=${data[key]}`)
      .join('&');
    
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signString, 'utf8');
      return sign.sign(privateKey, 'base64');
    } catch (error) {
      this.logger.error(`支付宝签名生成失败: ${error.message}`);
      throw new BadRequestException('签名生成失败');
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10分钟过期
    
    for (const [key, timestamp] of this.duplicatePaymentCache.entries()) {
      if (now - timestamp > expireTime) {
        this.duplicatePaymentCache.delete(key);
      }
    }
  }

  /**
   * 验证IP白名单（可选）
   */
  validateIpWhitelist(clientIp: string, paymentMethod: PaymentMethod): boolean {
    // 获取支付平台的IP白名单
    const whitelist = this.getIpWhitelist(paymentMethod);
    
    if (whitelist.length === 0) {
      // 如果没有配置白名单，则允许所有IP
      return true;
    }
    
    const isAllowed = whitelist.some(allowedIp => {
      if (allowedIp.includes('/')) {
        // CIDR格式的IP段
        return this.isIpInCidr(clientIp, allowedIp);
      } else {
        // 单个IP地址
        return clientIp === allowedIp;
      }
    });
    
    if (!isAllowed) {
      this.logger.warn(`IP地址不在白名单中: ${clientIp}, 支付方式: ${paymentMethod}`);
    }
    
    return isAllowed;
  }

  /**
   * 获取IP白名单
   */
  private getIpWhitelist(paymentMethod: PaymentMethod): string[] {
    const configKey = paymentMethod === PaymentMethod.WECHAT_PAY 
      ? 'wechat.ipWhitelist' 
      : 'alipay.ipWhitelist';
    
    const whitelist = this.configService.get<string>(configKey);
    return whitelist ? whitelist.split(',').map(ip => ip.trim()) : [];
  }

  /**
   * 检查IP是否在CIDR范围内
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    // 简单的CIDR检查实现
    // 生产环境建议使用专门的IP处理库
    try {
      const [network, prefixLength] = cidr.split('/');
      const ipInt = this.ipToInt(ip);
      const networkInt = this.ipToInt(network);
      const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
      
      return (ipInt & mask) === (networkInt & mask);
    } catch (error) {
      this.logger.error(`CIDR检查失败: ${error.message}`);
      return false;
    }
  }

  /**
   * IP地址转整数
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}