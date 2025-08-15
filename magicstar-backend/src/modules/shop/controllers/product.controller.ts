import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import {
  ProductQueryDto,
  ProductSearchDto,
} from '../dto/product-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('商品管理')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建商品' })
  @ApiResponse({ status: 201, description: '商品创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: 'SKU已存在' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: '获取商品列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'category_id', required: false, description: '分类ID' })
  @ApiQuery({ name: 'status', required: false, description: '商品状态' })
  @ApiQuery({ name: 'type', required: false, description: '商品类型' })
  @ApiQuery({ name: 'is_featured', required: false, description: '是否特色商品' })
  @ApiQuery({ name: 'in_stock', required: false, description: '是否有库存' })
  @ApiQuery({ name: 'min_price', required: false, description: '最低价格' })
  @ApiQuery({ name: 'max_price', required: false, description: '最高价格' })
  @ApiQuery({ name: 'tags', required: false, description: '标签' })
  @ApiQuery({ name: 'sort_by', required: false, description: '排序字段' })
  @ApiQuery({ name: 'sort_order', required: false, description: '排序方向' })
  async findAll(@Query() queryDto: ProductQueryDto) {
    return this.productService.findAll(queryDto);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索商品' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'category_id', required: false, description: '分类ID' })
  @ApiQuery({ name: 'min_price', required: false, description: '最低价格' })
  @ApiQuery({ name: 'max_price', required: false, description: '最高价格' })
  async search(@Query() searchDto: ProductSearchDto) {
    return this.productService.search(searchDto);
  }

  @Get('featured')
  @ApiOperation({ summary: '获取特色商品' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'limit', required: false, description: '数量限制' })
  async getFeatured(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.productService.getFeaturedProducts(limit);
  }

  @Get('recommended')
  @ApiOperation({ summary: '获取推荐商品' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'product_id', required: false, description: '基于商品ID推荐' })
  @ApiQuery({ name: 'limit', required: false, description: '数量限制' })
  async getRecommended(
    @Query('product_id', ParseIntPipe) productId?: number,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.productService.getRecommendedProducts(productId, limit);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: '根据SKU获取商品' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  @ApiParam({ name: 'sku', description: '商品SKU' })
  async findBySku(@Param('sku') sku: string) {
    return this.productService.findBySku(sku);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取商品详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商品' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  @ApiResponse({ status: 409, description: 'SKU已存在' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商品库存' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '库存不足或商品不跟踪库存' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.productService.updateStock(id, quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除商品' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}