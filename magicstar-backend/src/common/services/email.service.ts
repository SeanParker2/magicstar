import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly emailConfig: EmailConfig;

  constructor(private configService: ConfigService) {
    this.emailConfig = {
      host: this.configService.get<string>('EMAIL_HOST') || 'smtp.qq.com',
      port: this.configService.get<number>('EMAIL_PORT') || 587,
      secure: this.configService.get<boolean>('EMAIL_SECURE') || false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER') || '',
        pass: this.configService.get<string>('EMAIL_PASS') || '',
      },
      from:
        this.configService.get<string>('EMAIL_FROM') || 'noreply@magicstar.com',
    };

    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (this.configService.get('NODE_ENV') === 'development') {
      // 开发环境使用测试账号
      this.logger.log('邮件服务运行在开发模式');
      return;
    }

    if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
      this.logger.warn('邮件服务配置不完整，将在发送时跳过');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: this.emailConfig.auth,
    });

    // 验证邮件服务配置
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('邮件服务配置验证失败:', error);
      } else {
        this.logger.log('邮件服务配置验证成功');
      }
    });
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendEmailVerification(
    email: string,
    username: string,
    verificationToken: string,
  ): Promise<boolean> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">魔法星座</h1>
          <p style="color: white; margin: 10px 0 0 0;">Magic Lightning</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">邮箱验证</h2>
          
          <p style="color: #666; line-height: 1.6;">亲爱的 ${username}，</p>
          
          <p style="color: #666; line-height: 1.6;">
            感谢您注册魔法星座！为了确保您的账号安全，请点击下面的按钮验证您的邮箱地址：
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      display: inline-block;
                      font-weight: bold;">
              验证邮箱
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
            <a href="${verificationUrl}" style="color: #667eea;">${verificationUrl}</a>
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            此链接将在24小时后失效。如果您没有注册魔法星座账号，请忽略此邮件。
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2024 魔法星座. 保留所有权利.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(email, '验证您的邮箱地址 - 魔法星座', html);
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordReset(
    email: string,
    username: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">魔法星座</h1>
          <p style="color: white; margin: 10px 0 0 0;">Magic Lightning</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">密码重置</h2>
          
          <p style="color: #666; line-height: 1.6;">亲爱的 ${username}，</p>
          
          <p style="color: #666; line-height: 1.6;">
            我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      display: inline-block;
                      font-weight: bold;">
              重置密码
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
            <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
          </p>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            此链接将在1小时后失效。如果您没有请求重置密码，请忽略此邮件。
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2024 魔法星座. 保留所有权利.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(email, '重置您的密码 - 魔法星座', html);
  }

  /**
   * 发送邮件的通用方法
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    try {
      // 开发环境下只记录日志
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`[开发模式] 发送邮件到 ${to}: ${subject}`);
        return true;
      }

      if (!this.transporter) {
        this.logger.warn('邮件服务未配置，跳过发送');
        return false;
      }

      const mailOptions = {
        from: this.emailConfig.from,
        to,
        subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`邮件发送成功: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 生成邮箱验证令牌
   */
  generateEmailToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }

  /**
   * 生成密码重置令牌
   */
  generateResetToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }
}
