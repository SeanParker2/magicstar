import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TarotService } from '../services/tarot.service';
import { CreateTarotReadingDto, TarotReadingResultDto } from '../dto/create-tarot-reading.dto';
import { QueryTarotCardsDto, QueryTarotSpreadsDto, QueryTarotReadingsDto } from '../dto/query-tarot.dto';
import { TarotCard } from '../entities/tarot-card.entity';
import { TarotSpread } from '../entities/tarot-spread.entity';
import { TarotReading } from '../entities/tarot-reading.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';

@ApiTags('塔罗牌')
@Controller('tarot')
export class TarotController {
  constructor(private readonly tarotService: TarotService) {}

  @Get('cards')
  @ApiOperation({ summary: '获取塔罗牌列表' })
  @ApiResponse({ status: 200, description: '成功获取塔罗牌列表', type: [TarotCard] })
  async getAllCards(@Query(ValidationPipe) queryDto: QueryTarotCardsDto) {
    return this.tarotService.getAllCards(queryDto);
  }

  @Get('cards/:id')
  @ApiOperation({ summary: '根据ID获取塔罗牌详情' })
  @ApiParam({ name: 'id', description: '塔罗牌ID' })
  @ApiResponse({ status: 200, description: '成功获取塔罗牌详情', type: TarotCard })
  @ApiResponse({ status: 404, description: '塔罗牌不存在' })
  async getCardById(@Param('id', ParseIntPipe) id: number) {
    return this.tarotService.getCardById(id);
  }

  @Get('spreads')
  @ApiOperation({ summary: '获取塔罗牌阵列表' })
  @ApiResponse({ status: 200, description: '成功获取牌阵列表', type: [TarotSpread] })
  async getAllSpreads(@Query(ValidationPipe) queryDto: QueryTarotSpreadsDto) {
    return this.tarotService.getAllSpreads(queryDto);
  }

  @Get('spreads/recommended')
  @ApiOperation({ summary: '获取推荐牌阵' })
  @ApiQuery({ name: 'difficulty', required: false, description: '难度等级' })
  @ApiResponse({ status: 200, description: '成功获取推荐牌阵', type: [TarotSpread] })
  async getRecommendedSpreads(@Query('difficulty') difficulty?: string) {
    return this.tarotService.getRecommendedSpreads(difficulty);
  }

  @Get('spreads/:id')
  @ApiOperation({ summary: '根据ID获取牌阵详情' })
  @ApiParam({ name: 'id', description: '牌阵ID' })
  @ApiResponse({ status: 200, description: '成功获取牌阵详情', type: TarotSpread })
  @ApiResponse({ status: 404, description: '牌阵不存在' })
  async getSpreadById(@Param('id', ParseIntPipe) id: number) {
    return this.tarotService.getSpreadById(id);
  }

  @Post('reading')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '进行塔罗占卜' })
  @ApiResponse({ status: 201, description: '占卜成功', type: TarotReadingResultDto })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async performReading(
    @Request() req,
    @Body(ValidationPipe) createDto: CreateTarotReadingDto,
  ) {
    return this.tarotService.performReading(req.user.id, createDto);
  }

  @Get('readings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户占卜历史' })
  @ApiResponse({ status: 200, description: '成功获取占卜历史', type: [TarotReading] })
  @ApiResponse({ status: 401, description: '未授权' })
  async getUserReadings(
    @Request() req,
    @Query(ValidationPipe) queryDto: QueryTarotReadingsDto,
  ) {
    return this.tarotService.getUserReadings(req.user.id, queryDto);
  }

  @Get('readings/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户占卜统计' })
  @ApiResponse({ status: 200, description: '成功获取占卜统计' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getReadingStats(@Request() req) {
    return this.tarotService.getReadingStats(req.user.id);
  }

  @Get('readings/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '根据ID获取占卜记录详情' })
  @ApiParam({ name: 'id', description: '占卜记录ID' })
  @ApiResponse({ status: 200, description: '成功获取占卜记录', type: TarotReading })
  @ApiResponse({ status: 404, description: '占卜记录不存在或无权访问' })
  async getReadingById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.tarotService.getReadingById(id, userId);
  }

  @Post('readings/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '分享占卜记录' })
  @ApiParam({ name: 'id', description: '占卜记录ID' })
  @ApiResponse({ status: 200, description: '分享成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '占卜记录不存在' })
  async shareReading(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    await this.tarotService.shareReading(id, req.user.id);
    return { message: '分享成功' };
  }

  @Post('readings/:id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '评价占卜记录' })
  @ApiParam({ name: 'id', description: '占卜记录ID' })
  @ApiResponse({ status: 200, description: '评价成功' })
  @ApiResponse({ status: 400, description: '评分参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '占卜记录不存在' })
  async rateReading(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() body: { rating: number; feedback?: string },
  ) {
    await this.tarotService.rateReading(id, req.user.id, body.rating, body.feedback);
    return { message: '评价成功' };
  }
}