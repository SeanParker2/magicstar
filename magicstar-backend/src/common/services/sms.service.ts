import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: {
    register: string;
    login: string;
    resetPassword: string;
  };
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly smsConfig: SmsConfig;

  constructor(private configService: ConfigService) {
    this.smsConfig = {
      accessKeyId: this.configService.get<string>('SMS_ACCESS_KEY_ID') || '',
      accessKeySecret: this.configService.get<string>('SMS_ACCESS_KEY_SECRET') || '',
      signName: this.configService.get<string>('SMS_SIGN_NAME') || '魔法星座',
      templateCode: {
        register: this.configService.get<string>('SMS_TEMPLATE_REGISTER') || 'SMS_123456789',
        login: this.configService.get<string>('SMS_TEMPLATE_LOGIN') || 'SMS_123456790',
        resetPassword: this.configService.get<string>('SMS_TEMPLATE_RESET') || 'SMS_123456791',
      },
    };
  }

  /**
   * 发送短信验证码
   * @param phone 手机号
   * @param code 验证码
   * @param type 短信类型
   */
  async sendSmsCode(
    phone: string,
    code: string,
    type: 'register' | 'login' | 'reset_password'
  ): Promise<boolean> {
    try {
      // 在开发环境下，直接返回成功，不实际发送短信
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`[开发模式] 发送短信验证码到 ${phone}: ${code}`);
        return true;
      }

      // 验证配置
      if (!this.smsConfig.accessKeyId || !this.smsConfig.accessKeySecret) {
        this.logger.error('短信服务配置不完整');
        throw new BadRequestException('短信服务暂时不可用');
      }

      // 这里应该集成实际的短信服务提供商（如阿里云、腾讯云等）
      // 以下是示例代码结构
      const templateCode = this.smsConfig.templateCode[type];
      const params = {
        PhoneNumbers: phone,
        SignName: this.smsConfig.signName,
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify({ code }),
      };

      this.logger.log(`发送短信验证码到 ${phone}, 类型: ${type}`);
      
      // TODO: 集成实际的短信服务
      // const result = await this.sendSmsRequest(params);
      // return result.Code === 'OK';
      
      // 临时返回成功
      return true;
    } catch (error) {
      this.logger.error(`发送短信失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 生成6位数字验证码
   */
  generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 验证短信验证码
   * @param phone 手机号
   * @param code 验证码
   */
  async validateSmsCode(phone: string, code: string): Promise<boolean> {
    // TODO: 实现基于Redis或数据库的验证码验证
    // 1. 检查验证码是否存在
    // 2. 检查验证码是否过期
    // 3. 验证成功后删除验证码
    
    // 开发环境下，简单验证
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(`[开发模式] 验证短信验证码: ${phone}, 验证码: ${code}`);
      // 开发环境下，验证码为 123456 时通过验证
      return code === '123456';
    }

    // 生产环境需要实现实际的验证逻辑
    this.logger.warn('短信验证码验证功能尚未完全实现');
    return false;
  }

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 检查短信发送频率限制
   * @param phone 手机号
   * @param type 短信类型
   */
  async checkSendLimit(phone: string, type: string): Promise<boolean> {
    // TODO: 实现基于Redis的频率限制
    // 1. 同一手机号1分钟内只能发送1条
    // 2. 同一手机号1小时内最多发送5条
    // 3. 同一手机号1天内最多发送10条
    
    this.logger.log(`检查短信发送限制: ${phone}, 类型: ${type}`);
    return true;
  }

  /**
   * 记录短信发送日志
   */
  async logSmsRecord(
    phone: string,
    code: string,
    type: string,
    success: boolean,
    ip?: string
  ): Promise<void> {
    // TODO: 将短信发送记录保存到数据库
    this.logger.log(
      `短信记录: ${phone}, 类型: ${type}, 成功: ${success}, IP: ${ip}`
    );
  }
}