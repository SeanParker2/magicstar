import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderService } from '../services/order.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderQueryDto,
  CancelOrderDto,
} from '../dto/order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('订单管理')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  @ApiResponse({ status: 400, description: '商品库存不足或其他业务错误' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async createOrder(
    @Request() req: any,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const userId = parseInt(req.user.id);
    return this.orderService.createOrder(userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表（管理员）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'status', required: false, description: '订单状态' })
  @ApiQuery({ name: 'payment_status', required: false, description: '支付状态' })
  @ApiQuery({ name: 'shipping_status', required: false, description: '配送状态' })
  @ApiQuery({ name: 'user_id', required: false, description: '用户ID' })
  @ApiQuery({ name: 'start_date', required: false, description: '开始日期' })
  @ApiQuery({ name: 'end_date', required: false, description: '结束日期' })
  async findAll(@Query() queryDto: OrderQueryDto) {
    return this.orderService.findAll(queryDto);
  }

  @Get('my')
  @ApiOperation({ summary: '获取当前用户订单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  async getMyOrders(
    @Request() req: any,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const userId = parseInt(req.user.id);
    return this.orderService.getUserOrders(userId, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取订单统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'user_id', required: false, description: '用户ID（管理员可查看指定用户）' })
  async getOrderStats(
    @Request() req: any,
    @Query('user_id', ParseIntPipe) userId?: number,
  ) {
    // 如果是普通用户，只能查看自己的统计
    const targetUserId = userId || parseInt(req.user.id);
    return this.orderService.getOrderStats(targetUserId);
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: '根据订单号获取订单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'orderNumber', description: '订单号' })
  async findByOrderNumber(
    @Request() req: any,
    @Param('orderNumber') orderNumber: string,
  ) {
    const userId = parseInt(req.user.id);
    return this.orderService.findByOrderNumber(orderNumber, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async findOne(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = parseInt(req.user.id);
    return this.orderService.findOne(id, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新订单状态（管理员）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '状态转换无效' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 400, description: '订单无法取消' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async cancelOrder(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelOrderDto,
  ) {
    const userId = parseInt(req.user.id);
    return this.orderService.cancelOrder(id, userId, cancelDto);
  }
}