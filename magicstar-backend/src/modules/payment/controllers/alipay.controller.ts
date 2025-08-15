import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { PaymentService } from '../services/payment.service';
import { PaymentMethod } from '../entities/payment.entity';

@ApiTags('支付宝支付')
@Controller('payment/alipay')
export class AlipayController {
  private readonly logger = new Logger(AlipayController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付宝支付异步通知' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async handleNotify(@Body() notifyData: any) {
    try {
      // 记录回调信息
      this.logger.log(`支付宝支付异步通知: ${JSON.stringify(notifyData)}`);

      // 处理回调
      const result = await this.paymentService.handleCallback(
        PaymentMethod.ALIPAY,
        notifyData
      );

      if (result.success) {
        this.logger.log(`支付宝支付回调处理成功: ${result.message}`);
        return 'success';
      } else {
        this.logger.error(`支付宝支付回调处理失败: ${result.message}`);
        return 'failure';
      }
    } catch (error) {
      this.logger.error(`支付宝支付回调异常: ${error.message}`, error.stack);
      return 'failure';
    }
  }

  @Get('return')
  @ApiOperation({ summary: '支付宝支付同步返回' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async handleReturn(@Query() returnData: any) {
    try {
      // 记录返回信息
      this.logger.log(`支付宝支付同步返回: ${JSON.stringify(returnData)}`);

      // 验证返回数据
      const result = await this.paymentService.handleCallback(
        PaymentMethod.ALIPAY,
        returnData
      );

      if (result.success) {
        // 重定向到支付成功页面
        return {
          code: 200,
          message: '支付成功',
          data: {
            paymentNo: returnData.out_trade_no,
            tradeNo: returnData.trade_no,
            totalAmount: returnData.total_amount,
          },
        };
      } else {
        // 重定向到支付失败页面
        return {
          code: 400,
          message: '支付失败',
          data: null,
        };
      }
    } catch (error) {
      this.logger.error(`支付宝支付返回处理异常: ${error.message}`, error.stack);
      return {
        code: 500,
        message: '系统异常',
        data: null,
      };
    }
  }

  @Post('refund-notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付宝退款异步通知' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async handleRefundNotify(@Body() notifyData: any) {
    try {
      // 记录退款回调信息
      this.logger.log(`支付宝退款异步通知: ${JSON.stringify(notifyData)}`);

      // 处理退款回调
      const result = await this.paymentService.handleRefundCallback(
        PaymentMethod.ALIPAY,
        notifyData
      );

      if (result.success) {
        this.logger.log(`支付宝退款回调处理成功: ${result.message}`);
        return 'success';
      } else {
        this.logger.error(`支付宝退款回调处理失败: ${result.message}`);
        return 'failure';
      }
    } catch (error) {
      this.logger.error(`支付宝退款回调异常: ${error.message}`, error.stack);
      return 'failure';
    }
  }
}