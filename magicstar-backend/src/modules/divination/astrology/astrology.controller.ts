import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AstrologyService } from './astrology.service';
import { CreateBirthChartDto } from './dto/create-birth-chart.dto';
import { QueryBirthChartDto } from './dto/query-birth-chart.dto';
import { ResponseDto } from '../../../common/dto/response.dto';

@ApiTags('星盘系统')
@Controller('astrology')
export class AstrologyController {
  constructor(private readonly astrologyService: AstrologyService) {}

  @Post('birth-chart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建星盘' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '星盘创建成功' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '请求参数错误' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '未授权访问' })
  async createBirthChart(
    @Request() req: any,
    @Body() createDto: CreateBirthChartDto,
  ): Promise<ResponseDto> {
    const result = await this.astrologyService.createBirthChart(req.user.id, createDto);
    return {
      code: HttpStatus.CREATED,
      message: '星盘创建成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Get('birth-chart/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的星盘列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'publicOnly', required: false, description: '只显示公开的' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getMyBirthCharts(
    @Request() req: any,
    @Query() queryDto: QueryBirthChartDto,
  ): Promise<ResponseDto> {
    const result = await this.astrologyService.getUserBirthCharts(req.user.id, queryDto);
    return {
      code: HttpStatus.OK,
      message: '获取成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Get('birth-chart/public')
  @ApiOperation({ summary: '获取公开的星盘列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getPublicBirthCharts(
    @Query() queryDto: QueryBirthChartDto,
  ): Promise<ResponseDto> {
    const result = await this.astrologyService.getPublicBirthCharts(queryDto);
    return {
      code: HttpStatus.OK,
      message: '获取成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Get('birth-chart/:identifier')
  @ApiOperation({ summary: '获取星盘详情' })
  @ApiParam({ name: 'identifier', description: '星盘ID或分享码' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '星盘不存在' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权访问' })
  async getBirthChartDetail(
    @Param('identifier') identifier: string,
    @Request() req: any,
  ): Promise<ResponseDto> {
    const userId = req.user?.id;
    const result = await this.astrologyService.getBirthChartDetail(identifier, userId);
    return {
      code: HttpStatus.OK,
      message: '获取成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Put('birth-chart/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新星盘' })
  @ApiParam({ name: 'id', description: '星盘ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '更新成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '星盘不存在' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '未授权访问' })
  async updateBirthChart(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() updateDto: Partial<CreateBirthChartDto>,
  ): Promise<ResponseDto> {
    const result = await this.astrologyService.updateBirthChart(id, req.user.id, updateDto);
    return {
      code: HttpStatus.OK,
      message: '更新成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Delete('birth-chart/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除星盘' })
  @ApiParam({ name: 'id', description: '星盘ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '删除成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '星盘不存在' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '未授权访问' })
  async deleteBirthChart(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<ResponseDto> {
    await this.astrologyService.deleteBirthChart(id, req.user.id);
    return {
      code: HttpStatus.OK,
      message: '删除成功',
      timestamp: Date.now(),
    };
  }

  @Post('birth-chart/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成分享链接' })
  @ApiParam({ name: 'id', description: '星盘ID' })
  @ApiQuery({ name: 'regenerate', required: false, description: '是否重新生成分享码' })
  @ApiResponse({ status: HttpStatus.OK, description: '生成成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '星盘不存在' })
  async generateShareLink(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Query('regenerate') regenerate?: string,
  ): Promise<ResponseDto> {
    const shouldRegenerate = regenerate === 'true';
    const result = await this.astrologyService.generateShareLink(id, req.user.id, shouldRegenerate);
    return {
      code: HttpStatus.OK,
      message: '生成成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Post('compatibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '计算星盘兼容性' })
  @ApiResponse({ status: HttpStatus.OK, description: '计算成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '星盘不存在' })
  async calculateCompatibility(
    @Request() req: any,
    @Body() body: { chart1Id: number; chart2Id: number },
  ): Promise<ResponseDto> {
    const result = await this.astrologyService.calculateCompatibility(
      body.chart1Id,
      body.chart2Id,
      req.user.id,
    );
    return {
      code: HttpStatus.OK,
      message: '计算成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  @Get('planets')
  @ApiOperation({ summary: '获取行星信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getPlanetsInfo(): Promise<ResponseDto> {
    const planets = [
      {
        name: '太阳',
        symbol: '☉',
        description: '代表自我、意志、生命力和创造力',
        keywords: ['自我', '意志', '生命力', '创造力', '父亲'],
      },
      {
        name: '月亮',
        symbol: '☽',
        description: '代表情感、直觉、潜意识和母性',
        keywords: ['情感', '直觉', '潜意识', '母性', '习惯'],
      },
      {
        name: '水星',
        symbol: '☿',
        description: '代表沟通、思维、学习和交流',
        keywords: ['沟通', '思维', '学习', '交流', '逻辑'],
      },
      {
        name: '金星',
        symbol: '♀',
        description: '代表爱情、美感、艺术和价值观',
        keywords: ['爱情', '美感', '艺术', '价值观', '和谐'],
      },
      {
        name: '火星',
        symbol: '♂',
        description: '代表行动、勇气、冲动和竞争',
        keywords: ['行动', '勇气', '冲动', '竞争', '欲望'],
      },
      {
        name: '木星',
        symbol: '♃',
        description: '代表扩张、智慧、幸运和哲学',
        keywords: ['扩张', '智慧', '幸运', '哲学', '成长'],
      },
      {
        name: '土星',
        symbol: '♄',
        description: '代表限制、责任、纪律和成熟',
        keywords: ['限制', '责任', '纪律', '成熟', '考验'],
      },
      {
        name: '天王星',
        symbol: '♅',
        description: '代表创新、独立、突变和革命',
        keywords: ['创新', '独立', '突变', '革命', '自由'],
      },
      {
        name: '海王星',
        symbol: '♆',
        description: '代表梦想、直觉、灵性和幻象',
        keywords: ['梦想', '直觉', '灵性', '幻象', '同情'],
      },
      {
        name: '冥王星',
        symbol: '♇',
        description: '代表转化、重生、深度和力量',
        keywords: ['转化', '重生', '深度', '力量', '神秘'],
      },
    ];

    return {
      code: HttpStatus.OK,
      message: '获取成功',
      data: planets,
      timestamp: Date.now(),
    };
  }

  @Get('signs')
  @ApiOperation({ summary: '获取星座信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getSignsInfo(): Promise<ResponseDto> {
    const signs = [
      {
        name: '白羊座',
        symbol: '♈',
        element: '火',
        quality: '基本',
        dates: '3月21日 - 4月19日',
        description: '充满活力和冒险精神，喜欢开创新事物',
        keywords: ['勇敢', '冲动', '领导力', '开创性'],
      },
      {
        name: '金牛座',
        symbol: '♉',
        element: '土',
        quality: '固定',
        dates: '4月20日 - 5月20日',
        description: '稳重踏实，重视安全感和物质享受',
        keywords: ['稳定', '固执', '实用', '享受'],
      },
      {
        name: '双子座',
        symbol: '♊',
        element: '风',
        quality: '变动',
        dates: '5月21日 - 6月20日',
        description: '聪明机智，好奇心强，善于沟通',
        keywords: ['聪明', '多变', '沟通', '好奇'],
      },
      {
        name: '巨蟹座',
        symbol: '♋',
        element: '水',
        quality: '基本',
        dates: '6月21日 - 7月22日',
        description: '感情丰富，重视家庭和情感安全',
        keywords: ['敏感', '保护', '家庭', '情感'],
      },
      {
        name: '狮子座',
        symbol: '♌',
        element: '火',
        quality: '固定',
        dates: '7月23日 - 8月22日',
        description: '自信大方，喜欢成为焦点，具有创造力',
        keywords: ['自信', '创造', '表演', '慷慨'],
      },
      {
        name: '处女座',
        symbol: '♍',
        element: '土',
        quality: '变动',
        dates: '8月23日 - 9月22日',
        description: '细致认真，追求完美，善于分析',
        keywords: ['完美', '分析', '服务', '细致'],
      },
      {
        name: '天秤座',
        symbol: '♎',
        element: '风',
        quality: '基本',
        dates: '9月23日 - 10月22日',
        description: '优雅和谐，重视平衡和美感',
        keywords: ['平衡', '和谐', '美感', '合作'],
      },
      {
        name: '天蝎座',
        symbol: '♏',
        element: '水',
        quality: '固定',
        dates: '10月23日 - 11月21日',
        description: '深沉神秘，感情强烈，具有洞察力',
        keywords: ['深刻', '神秘', '转化', '强烈'],
      },
      {
        name: '射手座',
        symbol: '♐',
        element: '火',
        quality: '变动',
        dates: '11月22日 - 12月21日',
        description: '乐观开朗，热爱自由和冒险',
        keywords: ['自由', '哲学', '冒险', '乐观'],
      },
      {
        name: '摩羯座',
        symbol: '♑',
        element: '土',
        quality: '基本',
        dates: '12月22日 - 1月19日',
        description: '务实进取，有强烈的责任感和事业心',
        keywords: ['责任', '成就', '实际', '耐心'],
      },
      {
        name: '水瓶座',
        symbol: '♒',
        element: '风',
        quality: '固定',
        dates: '1月20日 - 2月18日',
        description: '独立创新，思想前卫，重视友谊',
        keywords: ['独立', '创新', '友谊', '人道'],
      },
      {
        name: '双鱼座',
        symbol: '♓',
        element: '水',
        quality: '变动',
        dates: '2月19日 - 3月20日',
        description: '敏感浪漫，富有想象力和同情心',
        keywords: ['想象', '同情', '艺术', '直觉'],
      },
    ];

    return {
      code: HttpStatus.OK,
      message: '获取成功',
      data: signs,
      timestamp: Date.now(),
    };
  }

  @Get('houses')
  @ApiOperation({ summary: '获取宫位信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getHousesInfo(): Promise<ResponseDto> {
    const houses = [
      {
        number: 1,
        name: '第一宫（命宫）',
        description: '代表自我、外表、第一印象和个性',
        keywords: ['自我', '外表', '第一印象', '个性', '身体'],
      },
      {
        number: 2,
        name: '第二宫（财帛宫）',
        description: '代表金钱、价值观、物质资源和自我价值',
        keywords: ['金钱', '价值观', '物质', '资源', '才能'],
      },
      {
        number: 3,
        name: '第三宫（兄弟宫）',
        description: '代表沟通、学习、兄弟姐妹和短途旅行',
        keywords: ['沟通', '学习', '兄弟姐妹', '短途旅行', '思维'],
      },
      {
        number: 4,
        name: '第四宫（田宅宫）',
        description: '代表家庭、根基、内心安全和私人生活',
        keywords: ['家庭', '根基', '内心安全', '私人生活', '房产'],
      },
      {
        number: 5,
        name: '第五宫（子女宫）',
        description: '代表创造、恋爱、娱乐、子女和投机',
        keywords: ['创造', '恋爱', '娱乐', '子女', '投机'],
      },
      {
        number: 6,
        name: '第六宫（奴仆宫）',
        description: '代表工作、健康、日常生活和服务',
        keywords: ['工作', '健康', '日常生活', '服务', '宠物'],
      },
      {
        number: 7,
        name: '第七宫（夫妻宫）',
        description: '代表伙伴关系、婚姻、合作和公开敌人',
        keywords: ['伙伴关系', '婚姻', '合作', '公开敌人', '法律'],
      },
      {
        number: 8,
        name: '第八宫（疾厄宫）',
        description: '代表转化、共同资源、神秘学和生死',
        keywords: ['转化', '共同资源', '神秘学', '生死', '遗产'],
      },
      {
        number: 9,
        name: '第九宫（迁移宫）',
        description: '代表哲学、高等教育、远行和精神追求',
        keywords: ['哲学', '高等教育', '远行', '精神追求', '法律'],
      },
      {
        number: 10,
        name: '第十宫（官禄宫）',
        description: '代表事业、声誉、社会地位和权威',
        keywords: ['事业', '声誉', '社会地位', '权威', '成就'],
      },
      {
        number: 11,
        name: '第十一宫（福德宫）',
        description: '代表友谊、团体、理想和社会活动',
        keywords: ['友谊', '团体', '理想', '社会活动', '希望'],
      },
      {
        number: 12,
        name: '第十二宫（玄秘宫）',
        description: '代表潜意识、精神世界、隐藏和牺牲',
        keywords: ['潜意识', '精神世界', '隐藏', '牺牲', '业力'],
      },
    ];

    return {
      code: HttpStatus.OK,
      message: '获取成功',
      data: houses,
      timestamp: Date.now(),
    };
  }
}