import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import {
  AddToCartDto,
  UpdateCartItemDto,
} from '../dto/cart.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('购物车管理')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  @ApiOperation({ summary: '添加商品到购物车' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 400, description: '商品不可用或库存不足' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async addToCart(
    @Request() req: any,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const userId = parseInt(req.user.id);
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Get('items')
  @ApiOperation({ summary: '获取购物车商品列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCartItems(@Request() req: any) {
    const userId = parseInt(req.user.id);
    return this.cartService.getCartItems(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: '获取购物车汇总信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCartSummary(@Request() req: any) {
    const userId = parseInt(req.user.id);
    return this.cartService.getCartSummary(userId);
  }

  @Get('count')
  @ApiOperation({ summary: '获取购物车商品数量' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCartItemCount(@Request() req: any) {
    const userId = parseInt(req.user.id);
    const count = await this.cartService.getCartItemCount(userId);
    return { count };
  }

  @Patch('items/:id')
  @ApiOperation({ summary: '更新购物车商品' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '库存不足' })
  @ApiResponse({ status: 404, description: '购物车商品不存在' })
  @ApiParam({ name: 'id', description: '购物车商品ID' })
  async updateCartItem(
    @Request() req: any,
    @Param('id', ParseIntPipe) cartItemId: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const userId = parseInt(req.user.id);
    return this.cartService.updateCartItem(userId, cartItemId, updateCartItemDto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除购物车商品' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '购物车商品不存在' })
  @ApiParam({ name: 'id', description: '购物车商品ID' })
  async removeCartItem(
    @Request() req: any,
    @Param('id', ParseIntPipe) cartItemId: number,
  ) {
    const userId = parseInt(req.user.id);
    return this.cartService.removeCartItem(userId, cartItemId);
  }

  @Delete('items')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '清空购物车' })
  @ApiResponse({ status: 204, description: '清空成功' })
  async clearCart(@Request() req: any) {
    const userId = parseInt(req.user.id);
    return this.cartService.clearCart(userId);
  }

  @Get('validate')
  @ApiOperation({ summary: '验证购物车商品可用性' })
  @ApiResponse({ status: 200, description: '验证完成' })
  async validateCartItems(@Request() req: any) {
    const userId = parseInt(req.user.id);
    return this.cartService.validateCartItems(userId);
  }

  @Post('sync')
  @ApiOperation({ summary: '同步游客购物车到用户账户' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncCartFromGuest(
    @Request() req: any,
    @Body() guestCartItems: AddToCartDto[],
  ) {
    const userId = parseInt(req.user.id);
    return this.cartService.syncCartFromGuest(userId, guestCartItems);
  }

  @Post('items/:id/move-to-wishlist')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '移动商品到心愿单' })
  @ApiResponse({ status: 204, description: '移动成功' })
  @ApiResponse({ status: 404, description: '购物车商品不存在' })
  @ApiParam({ name: 'id', description: '购物车商品ID' })
  async moveToWishlist(
    @Request() req: any,
    @Param('id', ParseIntPipe) cartItemId: number,
  ) {
    const userId = parseInt(req.user.id);
    return this.cartService.moveToWishlist(userId, cartItemId);
  }
}