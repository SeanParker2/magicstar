import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../entities/cart-item.entity';
import { Product, ProductStatus } from '../entities/product.entity';
import { User } from '../../user/entities/user.entity';
import {
  AddToCartDto,
  UpdateCartItemDto,
  CartItemResponseDto,
  CartSummaryDto,
} from '../dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async addToCart(
    userId: number,
    addToCartDto: AddToCartDto,
  ): Promise<CartItemResponseDto> {
    const { product_id, quantity, product_options, notes } = addToCartDto;

    // Validate user
    const user = await this.userRepository.findOne({ where: { id: userId.toString() } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate product
    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: ['images'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available');
    }

    // Check stock availability
    if (product.track_inventory && product.stock_quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock_quantity}`,
      );
    }

    // Check if item already exists in cart
    let whereCondition: any = {
      user_id: userId,
      product_id,
    };
    
    if (product_options) {
      whereCondition.product_options = product_options;
    }
    
    const existingCartItem = await this.cartItemRepository.findOne({
      where: whereCondition,
    });

    let cartItem: CartItem;

    if (existingCartItem) {
      // Update existing cart item
      const newQuantity = existingCartItem.quantity + quantity;
      
      // Check stock for new quantity
      if (product.track_inventory && product.stock_quantity < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock_quantity}, In cart: ${existingCartItem.quantity}`,
        );
      }

      existingCartItem.quantity = newQuantity;
      existingCartItem.unit_price = product.price;
      existingCartItem.notes = notes || existingCartItem.notes;
      existingCartItem.updated_at = new Date();

      cartItem = await this.cartItemRepository.save(existingCartItem);
    } else {
      // Create new cart item
      cartItem = this.cartItemRepository.create({
        user_id: userId,
        product_id,
        quantity,
        unit_price: product.price,
        product_options,
        notes,
      });

      cartItem = await this.cartItemRepository.save(cartItem);
    }

    // Return cart item with product details
    return this.formatCartItemResponse(cartItem, product);
  }

  async getCartItems(userId: number): Promise<CartItemResponseDto[]> {
    const cartItems = await this.cartItemRepository.find({
      where: { user_id: userId },
      relations: ['product', 'product.images', 'product.category'],
      order: { created_at: 'DESC' },
    });

    return cartItems.map((item) => this.formatCartItemResponse(item, item.product));
  }

  async getCartSummary(userId: number): Promise<CartSummaryDto> {
    const cartItems = await this.getCartItems(userId);
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
    
    // Calculate estimated tax (8% for example)
    const estimatedTax = subtotal * 0.08;
    
    // Calculate estimated shipping (free for orders over $100)
    const estimatedShipping = subtotal >= 100 ? 0 : 10;
    
    const estimatedTotal = subtotal + estimatedTax + estimatedShipping;

    return {
      items: cartItems,
      total_items: totalItems,
      total_quantity: totalItems,
      subtotal,
      total_amount: estimatedTotal,
      has_unavailable_items: cartItems.some(item => !item.is_available),
      has_out_of_stock_items: cartItems.some(item => !item.is_in_stock),
    };
  }

  async updateCartItem(
    userId: number,
    cartItemId: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    const { quantity, notes } = updateCartItemDto;

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, user_id: userId },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    const product = cartItem.product;

    // Validate product availability
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is no longer available');
    }

    // Check stock availability
    if (product.track_inventory && product.stock_quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock_quantity}`,
      );
    }

    // Update cart item
    cartItem.quantity = quantity;
    cartItem.unit_price = product.price; // Update price in case it changed
    cartItem.notes = notes !== undefined ? notes : cartItem.notes;
    cartItem.updated_at = new Date();

    const updatedCartItem = await this.cartItemRepository.save(cartItem);

    return this.formatCartItemResponse(updatedCartItem, product);
  }

  async removeCartItem(userId: number, cartItemId: number): Promise<void> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, user_id: userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(cartItem);
  }

  async clearCart(userId: number): Promise<void> {
    await this.cartItemRepository.delete({ user_id: userId });
  }

  async validateCartItems(userId: number): Promise<{
    valid: boolean;
    issues: Array<{
      cart_item_id: number;
      product_id: number;
      issue: string;
      available_quantity?: number;
    }>;
  }> {
    const cartItems = await this.cartItemRepository.find({
      where: { user_id: userId },
      relations: ['product'],
    });

    const issues: Array<{
      cart_item_id: number;
      product_id: number;
      issue: string;
      available_quantity?: number;
    }> = [];

    for (const cartItem of cartItems) {
      const product = cartItem.product;

      // Check if product is still active
      if (product.status !== ProductStatus.ACTIVE) {
        issues.push({
          cart_item_id: cartItem.id,
          product_id: product.id,
          issue: 'Product is no longer available',
        });
        continue;
      }

      // Check stock availability
      if (product.track_inventory && product.stock_quantity < cartItem.quantity) {
        issues.push({
          cart_item_id: cartItem.id,
          product_id: product.id,
          issue: 'Insufficient stock',
          available_quantity: product.stock_quantity,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  async getCartItemCount(userId: number): Promise<number> {
    const result = await this.cartItemRepository
      .createQueryBuilder('cart_item')
      .select('SUM(cart_item.quantity)', 'total')
      .where('cart_item.user_id = :userId', { userId })
      .getRawOne();

    return parseInt(result.total) || 0;
  }

  async moveToWishlist(userId: number, cartItemId: number): Promise<void> {
    // This would require a wishlist implementation
    // For now, just remove from cart
    await this.removeCartItem(userId, cartItemId);
  }

  async syncCartFromGuest(
    userId: number,
    guestCartItems: AddToCartDto[],
  ): Promise<CartSummaryDto> {
    // Add guest cart items to user's cart
    for (const item of guestCartItems) {
      try {
        await this.addToCart(userId, item);
      } catch (error) {
        // Log error but continue with other items
        console.error(`Failed to sync cart item:`, error.message);
      }
    }

    return this.getCartSummary(userId);
  }

  private formatCartItemResponse(
    cartItem: CartItem,
    product: Product,
  ): CartItemResponseDto {
    const mainImage = product.images?.find(img => img.is_primary) || product.images?.[0];

    return {
      id: cartItem.id,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock_quantity: product.stock_quantity,
        is_available: product.status === ProductStatus.ACTIVE,
        images: product.images?.map(img => ({
          id: img.id,
          url: img.url,
          thumbnail_url: img.thumbnail_url,
          alt_text: img.alt_text,
          is_primary: img.is_primary,
        })),
      },
      quantity: cartItem.quantity,
      unit_price: cartItem.unit_price,
      total_price: cartItem.total_price,
      product_options: cartItem.product_options,
      notes: cartItem.notes,
      is_available: cartItem.is_available,
      is_in_stock: cartItem.is_in_stock,
      stock_status: cartItem.stock_status,
      max_quantity: cartItem.max_quantity,
      created_at: cartItem.created_at,
      updated_at: cartItem.updated_at,
    };
  }
}