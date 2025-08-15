import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard'
import { TarotService } from './tarot.service'
import { CreateDivinationDto } from './dto/create-divination.dto'
import { DivinationHistoryQueryDto } from './dto/divination-history-query.dto'
import { ShareResultDto } from './dto/share-result.dto'

@ApiTags('塔罗牌占卜')
@Controller('api/tarot')
export class TarotController {
  constructor(private readonly tarotService: TarotService) {}

  @Get('spreads')
  @ApiOperation({ summary: '获取牌阵列表' })
  @ApiResponse({ status: 200, description: '成功获取牌阵列表' })
  async getSpreads() {
    try {
      const spreads = await this.tarotService.getSpreads()
      return {
        code: 200,
        message: '获取牌阵列表成功',
        data: spreads
      }
    } catch (error) {
      throw new HttpException(
        {
          code: 500,
          message: '获取牌阵列表失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('cards')
  @ApiOperation({ summary: '获取塔罗牌卡片列表' })
  @ApiResponse({ status: 200, description: '成功获取卡片列表' })
  async getCards() {
    try {
      const cards = await this.tarotService.getCards()
      return {
        code: 200,
        message: '获取卡片列表成功',
        data: cards
      }
    } catch (error) {
      throw new HttpException(
        {
          code: 500,
          message: '获取卡片列表失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post('divination')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '执行塔罗牌占卜' })
  @ApiResponse({ status: 201, description: '占卜成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async createDivination(
    @Body() createDivinationDto: CreateDivinationDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id
      const result = await this.tarotService.performDivination(
        userId,
        createDivinationDto
      )
      
      return {
        code: 201,
        message: '占卜成功',
        data: result
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      
      throw new HttpException(
        {
          code: 500,
          message: '占卜失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取占卜历史记录' })
  @ApiResponse({ status: 200, description: '成功获取历史记录' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async getDivinationHistory(
    @Query() query: DivinationHistoryQueryDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id
      const result = await this.tarotService.getDivinationHistory(
        userId,
        query
      )
      
      return {
        code: 200,
        message: '获取历史记录成功',
        data: result
      }
    } catch (error) {
      throw new HttpException(
        {
          code: 500,
          message: '获取历史记录失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('history/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取占卜记录详情' })
  @ApiResponse({ status: 200, description: '成功获取记录详情' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async getDivinationDetail(
    @Param('id') id: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id
      const result = await this.tarotService.getDivinationDetail(userId, id)
      
      if (!result) {
        throw new HttpException(
          {
            code: 404,
            message: '占卜记录不存在'
          },
          HttpStatus.NOT_FOUND
        )
      }
      
      return {
        code: 200,
        message: '获取记录详情成功',
        data: result
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      
      throw new HttpException(
        {
          code: 500,
          message: '获取记录详情失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post('share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '分享占卜结果' })
  @ApiResponse({ status: 201, description: '分享成功' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async shareResult(
    @Body() shareResultDto: ShareResultDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id
      const result = await this.tarotService.shareResult(
        userId,
        shareResultDto
      )
      
      return {
        code: 201,
        message: '分享成功',
        data: result
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      
      throw new HttpException(
        {
          code: 500,
          message: '分享失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post('history/:id/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除占卜记录' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async deleteDivinationRecord(
    @Param('id') id: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id
      await this.tarotService.deleteDivinationRecord(userId, id)
      
      return {
        code: 200,
        message: '删除成功'
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      
      throw new HttpException(
        {
          code: 500,
          message: '删除失败',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }
}