import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  Like,
  Between,
  In,
  SelectQueryBuilder,
} from 'typeorm';
import { Product, ProductStatus } from '../entities/product.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductImage } from '../entities/product-image.entity';
import {
  CreateProductDto,
  CreateProductImageDto,
} from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import {
  ProductQueryDto,
  ProductSearchDto,
  SortBy,
  SortOrder,
} from '../dto/product-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepository: Repository<ProductCategory>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Check if SKU already exists
    const existingProduct = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this SKU already exists');
    }

    // Validate category if provided
    if (createProductDto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: createProductDto.category_id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Create product
    const { images, ...productData } = createProductDto;
    const product = this.productRepository.create({
      ...productData,
      status: createProductDto.status || ProductStatus.DRAFT,
    });

    const savedProduct = await this.productRepository.save(product);

    // Create images if provided
    if (images && images.length > 0) {
      await this.createProductImages(savedProduct.id, images);
    }

    return this.findOne(savedProduct.id);
  }

  async findAll(queryDto: ProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category_id,
      status,
      type,
      is_featured,
      in_stock,
      min_price,
      max_price,
      tags,
      sort_by = SortBy.CREATED_AT,
      sort_order = SortOrder.DESC,
      include_images = false,
      include_category = false,
    } = queryDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images');

    // Apply filters
    this.applyFilters(queryBuilder, {
      search,
      category_id,
      status,
      type,
      is_featured,
      in_stock,
      min_price,
      max_price,
      tags,
    });

    // Apply sorting
    this.applySorting(queryBuilder, sort_by, sort_order);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'images'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.productRepository.increment({ id }, 'view_count', 1);

    return product;
  }

  async findBySku(sku: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { sku },
      relations: ['category', 'images'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    // Check SKU uniqueness if being updated
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // Validate category if being updated
    if (updateProductDto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.category_id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Update product
    const { images, ...productData } = updateProductDto;
    await this.productRepository.update(id, productData);

    // Update images if provided
    if (images) {
      await this.updateProductImages(id, images);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async search(searchDto: ProductSearchDto) {
    const {
      q,
      page = 1,
      limit = 10,
      category_id,
      min_price,
      max_price,
    } = searchDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    // Search in name, description, and tags
    if (q) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search OR product.short_description LIKE :search OR JSON_SEARCH(product.tags, "one", :searchTag) IS NOT NULL)',
        {
          search: `%${q}%`,
          searchTag: `%${q}%`,
        },
      );
    }

    // Apply additional filters
    this.applyFilters(queryBuilder, {
      category_id,
      min_price,
      max_price,
    });

    // Sort by relevance (sold_count and rating)
    queryBuilder.orderBy('product.sold_count', 'DESC')
      .addOrderBy('product.rating', 'DESC')
      .addOrderBy('product.created_at', 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    return this.productRepository.find({
      where: {
        status: ProductStatus.ACTIVE,
        is_featured: true,
      },
      relations: ['category', 'images'],
      order: {
        sort_order: 'ASC',
        created_at: 'DESC',
      },
      take: limit,
    });
  }

  async getRecommendedProducts(
    productId?: number,
    limit: number = 10,
  ): Promise<Product[]> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    if (productId) {
      queryBuilder.andWhere('product.id != :productId', { productId });
      
      // Get the current product's category for better recommendations
      const currentProduct = await this.productRepository.findOne({
        where: { id: productId },
        select: ['category_id'],
      });

      if (currentProduct?.category_id) {
        queryBuilder.andWhere('product.category_id = :categoryId', {
          categoryId: currentProduct.category_id,
        });
      }
    }

    return queryBuilder
      .orderBy('product.sold_count', 'DESC')
      .addOrderBy('product.rating', 'DESC')
      .addOrderBy('product.view_count', 'DESC')
      .take(limit)
      .getMany();
  }

  async updateStock(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    
    if (!product.track_inventory) {
      throw new BadRequestException('This product does not track inventory');
    }

    const newQuantity = product.stock_quantity + quantity;
    
    if (newQuantity < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    await this.productRepository.update(id, {
      stock_quantity: newQuantity,
    });

    return this.findOne(id);
  }

  async incrementSoldCount(id: number, quantity: number = 1): Promise<void> {
    await this.productRepository.increment({ id }, 'sold_count', quantity);
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Product>,
    filters: any,
  ): void {
    const {
      search,
      category_id,
      status,
      type,
      is_featured,
      in_stock,
      min_price,
      max_price,
      tags,
    } = filters;

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category_id) {
      queryBuilder.andWhere('product.category_id = :categoryId', {
        categoryId: category_id,
      });
    }

    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('product.type = :type', { type });
    }

    if (typeof is_featured === 'boolean') {
      queryBuilder.andWhere('product.is_featured = :isFeatured', {
        isFeatured: is_featured,
      });
    }

    if (typeof in_stock === 'boolean' && in_stock) {
      queryBuilder.andWhere(
        '(product.track_inventory = false OR product.stock_quantity > 0)',
      );
    }

    if (min_price !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', {
        minPrice: min_price,
      });
    }

    if (max_price !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', {
        maxPrice: max_price,
      });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere(
        'JSON_OVERLAPS(product.tags, :tags)',
        { tags: JSON.stringify(tags) },
      );
    }
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<Product>,
    sortBy: SortBy,
    sortOrder: SortOrder,
  ): void {
    const orderMap = {
      [SortBy.CREATED_AT]: 'product.created_at',
      [SortBy.UPDATED_AT]: 'product.updated_at',
      [SortBy.NAME]: 'product.name',
      [SortBy.PRICE]: 'product.price',
      [SortBy.SOLD_COUNT]: 'product.sold_count',
      [SortBy.VIEW_COUNT]: 'product.view_count',
      [SortBy.RATING]: 'product.rating',
      [SortBy.SORT_ORDER]: 'product.sort_order',
    };

    const orderField = orderMap[sortBy] || 'product.created_at';
    queryBuilder.orderBy(orderField, sortOrder);
  }

  private async createProductImages(
    productId: number,
    images: CreateProductImageDto[],
  ): Promise<void> {
    const imageEntities = images.map((imageDto, index) => {
      return this.imageRepository.create({
        ...imageDto,
        product_id: productId,
        sort_order: imageDto.sort_order || index,
      });
    });

    await this.imageRepository.save(imageEntities);
  }

  private async updateProductImages(
    productId: number,
    images: CreateProductImageDto[],
  ): Promise<void> {
    // Remove existing images
    await this.imageRepository.delete({ product_id: productId });

    // Create new images
    if (images.length > 0) {
      await this.createProductImages(productId, images);
    }
  }
}