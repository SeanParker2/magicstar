import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FortuneService } from './fortune.service';
import { CreateFortuneTemplateDto } from './dto/create-fortune-template.dto';
import { UpdateFortuneTemplateDto } from './dto/update-fortune-template.dto';
import { GetFortuneDto } from './dto/get-fortune.dto';
import { GetFortuneHistoryDto } from './dto/get-fortune-history.dto';
import { CreateFortuneSubscriptionDto, UpdateFortuneSubscriptionDto, GetFortuneSubscriptionsDto } from './dto/fortune-subscription.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('fortune')
@UseGuards(JwtAuthGuard)
export class FortuneController {
  constructor(private readonly fortuneService: FortuneService) {}

  /**
   * 获取用户运势
   */
  @Get()
  async getUserFortune(@Request() req, @Query() dto: GetFortuneDto) {
    return this.fortuneService.getUserFortune(req.user.id, dto);
  }

  /**
   * 获取用户运势历史
   */
  @Get('history')
  async getUserFortuneHistory(@Request() req, @Query() dto: GetFortuneHistoryDto) {
    return this.fortuneService.getUserFortuneHistory(req.user.id, dto);
  }

  /**
   * 获取运势统计
   */
  @Get('stats')
  async getFortuneStats(@Request() req) {
    return this.fortuneService.getFortuneStats(req.user.id);
  }

  /**
   * 获取运势详情
   */
  @Get(':id')
  async getFortuneDetail(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.fortuneService.getFortuneDetail(req.user.id, id);
  }

  /**
   * 分享运势
   */
  @Post(':id/share')
  async shareFortune(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.fortuneService.shareFortune(req.user.id, id);
  }

  /**
   * 删除运势记录
   */
  @Delete(':id')
  async deleteFortune(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.fortuneService.deleteFortune(req.user.id, id);
  }

  // 管理员功能
  /**
   * 创建运势模板（管理员）
   */
  @Post('templates')
  async createFortuneTemplate(@Body() dto: CreateFortuneTemplateDto) {
    return this.fortuneService.createFortuneTemplate(dto);
  }

  /**
   * 更新运势模板（管理员）
   */
  @Put('templates/:id')
  async updateFortuneTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFortuneTemplateDto
  ) {
    return this.fortuneService.updateFortuneTemplate(id, dto);
  }

  /**
   * 删除运势模板（管理员）
   */
  @Delete('templates/:id')
  async deleteFortuneTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.fortuneService.deleteFortuneTemplate(id);
  }

  /**
   * 获取运势模板列表（管理员）
   */
  @Get('templates')
  async getFortuneTemplates(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('type') type?: string
  ) {
    return this.fortuneService.getFortuneTemplates(page, limit, type as any);
  }

  // 运势订阅功能
  /**
   * 创建运势订阅
   */
  @Post('subscriptions')
  async createFortuneSubscription(
    @Request() req,
    @Body() dto: CreateFortuneSubscriptionDto
  ) {
    return this.fortuneService.createFortuneSubscription(req.user.id, dto);
  }

  /**
   * 获取用户运势订阅列表
   */
  @Get('subscriptions')
  async getFortuneSubscriptions(
    @Request() req,
    @Query() dto: GetFortuneSubscriptionsDto
  ) {
    return this.fortuneService.getFortuneSubscriptions(req.user.id, dto);
  }

  /**
   * 更新运势订阅
   */
  @Put('subscriptions/:id')
  async updateFortuneSubscription(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFortuneSubscriptionDto
  ) {
    return this.fortuneService.updateFortuneSubscription(req.user.id, id, dto);
  }

  /**
   * 删除运势订阅
   */
  @Delete('subscriptions/:id')
  async deleteFortuneSubscription(
    @Request() req,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.fortuneService.deleteFortuneSubscription(req.user.id, id);
  }

  /**
   * 获取运势订阅设置
   */
  @Get('reminder/settings')
  async getReminderSettings(@Request() req) {
    return this.fortuneService.getFortuneReminderSettings(req.user.id);
  }

  /**
   * 保存运势提醒设置
   */
  @Post('reminder/settings')
  async saveReminderSettings(
    @Request() req,
    @Body() settings: any
  ) {
    return this.fortuneService.saveFortuneReminderSettings(req.user.id, settings);
  }

  /**
   * 发送测试提醒
   */
  @Post('reminder/test')
  async sendTestReminder(
    @Request() req,
    @Body() body: { fortuneType: string }
  ) {
    return this.fortuneService.sendTestReminder(req.user.id, body.fortuneType as any);
  }
}