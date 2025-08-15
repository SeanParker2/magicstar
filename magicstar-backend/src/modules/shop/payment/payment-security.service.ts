import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentLogService } from './payment-log.service';

export interface SignatureVerificationResult {
  isValid: boolean;
  reason?: string;
}

export interface DuplicatePaymentCheckResult {
  isDuplicate: boolean;
  existingPayment?: Payment;
}

export interface PaymentSecurityContext {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}

@Injectable()
export class PaymentSecurityService {
  private readonly logger = new Logger(PaymentSecurityService.name);
  private readonly paymentAttempts = new Map<string, number>();
  private readonly suspiciousIPs = new Set<string>();

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly paymentLogService: PaymentLogService,
  ) {}

  /**
   * 验证微信支付签名
   */
  async verifyWechatSignature(
    data: Record<string, any>,
    signature: string,
    context: PaymentSecurityContext,
  ): Promise<SignatureVerificationResult> {
    try {
      const key = this.configService.get<string>('WECHAT_PAY_KEY');
      if (!key) {
        throw new Error('WeChat Pay key not configured');
      }

      // 构建签名字符串
      const signString = this.buildWechatSignString(data);
      const expectedSignature = crypto
        .createHash('md5')
        .update(signString + '&key=' + key)
        .digest('hex')
        .toUpperCase();

      const isValid = signature.toUpperCase() === expectedSignature;

      if (isValid) {
        await this.paymentLogService.logSignatureVerified(
          data.out_trade_no,
          'wechat',
          context.ipAddress,
        );
      } else {
        await this.paymentLogService.logSignatureFailed(
          data.out_trade_no,
          'wechat',
          'Signature mismatch',
          context.ipAddress,
        );
      }

      return { isValid };
    } catch (error) {
      this.logger.error('WeChat signature verification failed', error.stack);
      await this.paymentLogService.logSignatureFailed(
        data.out_trade_no,
        'wechat',
        error.message,
        context.ipAddress,
      );
      return { isValid: false, reason: error.message };
    }
  }

  /**
   * 验证支付宝签名
   */
  async verifyAlipaySignature(
    data: Record<string, any>,
    signature: string,
    context: PaymentSecurityContext,
  ): Promise<SignatureVerificationResult> {
    try {
      const publicKey = this.configService.get<string>('ALIPAY_PUBLIC_KEY');
      if (!publicKey) {
        throw new Error('Alipay public key not configured');
      }

      // 构建签名字符串
      const signString = this.buildAlipaySignString(data);
      
      // 使用RSA-SHA256验证签名
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signString, 'utf8');
      const isValid = verify.verify(publicKey, signature, 'base64');

      if (isValid) {
        await this.paymentLogService.logSignatureVerified(
          data.out_trade_no,
          'alipay',
          context.ipAddress,
        );
      } else {
        await this.paymentLogService.logSignatureFailed(
          data.out_trade_no,
          'alipay',
          'Signature verification failed',
          context.ipAddress,
        );
      }

      return { isValid };
    } catch (error) {
      this.logger.error('Alipay signature verification failed', error.stack);
      await this.paymentLogService.logSignatureFailed(
        data.out_trade_no,
        'alipay',
        error.message,
        context.ipAddress,
      );
      return { isValid: false, reason: error.message };
    }
  }

  /**
   * 检查重复支付
   */
  async checkDuplicatePayment(
    transactionId: string,
    context: PaymentSecurityContext,
  ): Promise<DuplicatePaymentCheckResult> {
    const existingPayment = await this.paymentRepository.findOne({
      where: { transaction_id: transactionId },
    });

    if (existingPayment) {
      await this.paymentLogService.logDuplicatePaymentBlocked(
        transactionId,
        context.userId,
        context.ipAddress,
      );

      return {
        isDuplicate: true,
        existingPayment,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * 检查支付频率限制
   */
  async checkPaymentRateLimit(
    userId: number,
    context: PaymentSecurityContext,
  ): Promise<boolean> {
    const key = `payment_rate_${userId}`;
    const maxAttempts = this.configService.get<number>('PAYMENT_MAX_ATTEMPTS_PER_MINUTE', 5);
    const windowMs = 60 * 1000; // 1分钟

    const now = Date.now();
    const attempts = this.paymentAttempts.get(key) || 0;

    if (attempts >= maxAttempts) {
      await this.paymentLogService.logRateLimitExceeded(
        userId,
        'payment_creation',
        context.ipAddress,
      );
      return false;
    }

    this.paymentAttempts.set(key, attempts + 1);

    // 清理过期的计数器
    setTimeout(() => {
      this.paymentAttempts.delete(key);
    }, windowMs);

    return true;
  }

  /**
   * 检测可疑支付活动
   */
  async detectSuspiciousActivity(
    payment: Payment,
    context: PaymentSecurityContext,
  ): Promise<boolean> {
    const suspiciousIndicators: string[] = [];

    // 检查异常金额
    if (payment.amount > 10000) {
      suspiciousIndicators.push('Large amount payment');
    }

    // 检查IP地址
    if (context.ipAddress && this.suspiciousIPs.has(context.ipAddress)) {
      suspiciousIndicators.push('Suspicious IP address');
    }

    // 检查短时间内多次支付
    const recentPayments = await this.getRecentPaymentsByUser(
      context.userId,
      5, // 5分钟内
    );

    if (recentPayments.length > 3) {
      suspiciousIndicators.push('Multiple payments in short time');
    }

    // 检查异常时间
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      suspiciousIndicators.push('Payment at unusual hours');
    }

    if (suspiciousIndicators.length > 0) {
      await this.paymentLogService.logSuspiciousActivity(
        context.userId,
        suspiciousIndicators.join(', '),
        {
          payment_id: payment.id,
          transaction_id: payment.transaction_id,
          amount: payment.amount,
          indicators: suspiciousIndicators,
        },
        context.ipAddress,
      );

      return true;
    }

    return false;
  }

  /**
   * 验证支付金额
   */
  validatePaymentAmount(amount: number): boolean {
    const minAmount = this.configService.get<number>('PAYMENT_MIN_AMOUNT', 0.01);
    const maxAmount = this.configService.get<number>('PAYMENT_MAX_AMOUNT', 50000);

    return amount >= minAmount && amount <= maxAmount;
  }

  /**
   * 生成安全的交易ID
   */
  generateSecureTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * 加密敏感数据
   */
  encryptSensitiveData(data: string): string {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密敏感数据
   */
  decryptSensitiveData(encryptedData: string): string {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('Encryption key not configured');
    }

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * 构建微信支付签名字符串
   */
  private buildWechatSignString(data: Record<string, any>): string {
    const keys = Object.keys(data)
      .filter(key => key !== 'sign' && data[key] !== '')
      .sort();

    return keys.map(key => `${key}=${data[key]}`).join('&');
  }

  /**
   * 构建支付宝签名字符串
   */
  private buildAlipaySignString(data: Record<string, any>): string {
    const keys = Object.keys(data)
      .filter(key => key !== 'sign' && key !== 'sign_type' && data[key] !== '')
      .sort();

    return keys.map(key => `${key}=${data[key]}`).join('&');
  }

  /**
   * 获取用户最近的支付记录
   */
  private async getRecentPaymentsByUser(
    userId: number,
    minutesAgo: number,
  ): Promise<Payment[]> {
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - minutesAgo);

    return await this.paymentRepository.find({
      where: {
        user_id: userId,
        created_at: MoreThan(startTime),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 添加可疑IP地址
   */
  addSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);
    this.logger.warn(`Added suspicious IP: ${ipAddress}`);
  }

  /**
   * 移除可疑IP地址
   */
  removeSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.delete(ipAddress);
    this.logger.log(`Removed suspicious IP: ${ipAddress}`);
  }
}