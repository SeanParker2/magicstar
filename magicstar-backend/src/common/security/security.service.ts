import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  constructor(private configService: ConfigService) {}

  /**
   * 生成安全的随机字符串
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 哈希敏感数据
   */
  hashSensitiveData(data: string): string {
    const salt = this.configService.get('security.salt', 'default-salt');
    return crypto.createHash('sha256').update(data + salt).digest('hex');
  }

  /**
   * 验证IP地址是否在白名单中
   */
  isIPWhitelisted(ip: string): boolean {
    const whitelist = this.configService.get<string[]>('security.ipWhitelist', []);
    if (whitelist.length === 0) return true; // 如果没有配置白名单，则允许所有IP
    
    return whitelist.includes(ip) || this.isLocalIP(ip);
  }

  /**
   * 检查是否为本地IP
   */
  private isLocalIP(ip: string): boolean {
    const localPatterns = [
      /^127\./,
      /^::1$/,
      /^localhost$/i,
    ];
    
    return localPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * 验证请求签名
   */
  verifyRequestSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get('security.apiSecret', 'default-secret');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * 检查请求频率
   */
  checkRequestFrequency(identifier: string, maxRequests: number, windowMs: number): boolean {
    // 这里可以集成Redis来实现分布式限流
    // 目前返回true，实际项目中需要实现具体逻辑
    return true;
  }

  /**
   * 清理和验证输入数据
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    // 移除潜在的恶意字符
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * 验证文件类型
   */
  isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }
}