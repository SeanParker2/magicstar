import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';

import { PaymentService } from '../services/payment.service';
import { PaymentMethod } from '../entities/payment.entity';

@ApiTags('微信支付')
@Controller('payment/wechat')
export class WechatPaymentController {
  private readonly logger = new Logger(WechatPaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信支付回调通知' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async handleNotify(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: any,
  ) {
    try {
      // 获取原始请求体
      const rawBody = req.rawBody;
      
      if (!rawBody) {
        this.logger.error('微信支付回调: 请求体为空');
        return this.buildWechatResponse(false, '请求体为空');
      }

      // 记录回调信息
      this.logger.log(`微信支付回调通知: ${rawBody.toString()}`);
      this.logger.log(`微信支付回调头部: ${JSON.stringify(headers)}`);

      // 解析XML数据
      const callbackData = this.parseXmlToObject(rawBody.toString());
      
      // 处理回调
      const result = await this.paymentService.handleCallback(
        PaymentMethod.WECHAT_PAY,
        callbackData
      );

      if (result.success) {
        this.logger.log(`微信支付回调处理成功: ${result.message}`);
        return this.buildWechatResponse(true, 'OK');
      } else {
        this.logger.error(`微信支付回调处理失败: ${result.message}`);
        return this.buildWechatResponse(false, result.message);
      }
    } catch (error) {
      this.logger.error(`微信支付回调异常: ${error.message}`, error.stack);
      return this.buildWechatResponse(false, '系统异常');
    }
  }

  @Post('refund-notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信支付退款回调通知' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async handleRefundNotify(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: any,
  ) {
    try {
      // 获取原始请求体
      const rawBody = req.rawBody;
      
      if (!rawBody) {
        this.logger.error('微信退款回调: 请求体为空');
        return this.buildWechatResponse(false, '请求体为空');
      }

      // 记录回调信息
      this.logger.log(`微信退款回调通知: ${rawBody.toString()}`);
      this.logger.log(`微信退款回调头部: ${JSON.stringify(headers)}`);

      // 解析XML数据
      const callbackData = this.parseXmlToObject(rawBody.toString());
      
      // TODO: 处理退款回调逻辑
      this.logger.log('微信退款回调处理完成');
      
      return this.buildWechatResponse(true, 'OK');
    } catch (error) {
      this.logger.error(`微信退款回调异常: ${error.message}`, error.stack);
      return this.buildWechatResponse(false, '系统异常');
    }
  }

  /**
   * 构建微信支付回调响应
   */
  private buildWechatResponse(success: boolean, message: string): string {
    const returnCode = success ? 'SUCCESS' : 'FAIL';
    const returnMsg = message;

    return `<xml>
  <return_code><![CDATA[${returnCode}]]></return_code>
  <return_msg><![CDATA[${returnMsg}]]></return_msg>
</xml>`;
  }

  /**
   * 简化的XML解析 (临时实现)
   */
  private parseXmlToObject(xml: string): any {
    const result: any = {};
    
    // 简单的XML解析，实际项目中应使用xml2js库
    const regex = /<(\w+)><!\[CDATA\[([^\]]+)\]\]><\/\1>|<(\w+)>([^<]+)<\/\3>/g;
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      if (key && value) {
        result[key] = value;
      }
    }
    
    return result;
  }
}