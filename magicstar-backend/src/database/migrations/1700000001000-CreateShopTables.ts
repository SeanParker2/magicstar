import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShopTables1700000001000 implements MigrationInterface {
  name = 'CreateShopTables1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建商品分类表
    await queryRunner.query(`
      CREATE TABLE \`product_categories\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`description\` text,
        \`parent_id\` int,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
        \`image_url\` varchar(500),
        \`seo_title\` varchar(200),
        \`seo_description\` varchar(500),
        \`seo_keywords\` varchar(300),
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_category_parent\` (\`parent_id\`),
        KEY \`IDX_category_status\` (\`status\`),
        KEY \`IDX_category_sort\` (\`sort_order\`),
        CONSTRAINT \`FK_category_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`product_categories\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建商品表
    await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(200) NOT NULL,
        \`description\` text,
        \`short_description\` varchar(500),
        \`sku\` varchar(100) NOT NULL,
        \`price\` decimal(10,2) NOT NULL,
        \`original_price\` decimal(10,2),
        \`cost_price\` decimal(10,2),
        \`stock_quantity\` int NOT NULL DEFAULT 0,
        \`min_stock_level\` int NOT NULL DEFAULT 0,
        \`weight\` decimal(8,3),
        \`dimensions\` varchar(100),
        \`category_id\` int,
        \`brand\` varchar(100),
        \`status\` enum('active','inactive','out_of_stock','discontinued') NOT NULL DEFAULT 'active',
        \`is_featured\` tinyint NOT NULL DEFAULT 0,
        \`is_digital\` tinyint NOT NULL DEFAULT 0,
        \`requires_shipping\` tinyint NOT NULL DEFAULT 1,
        \`meta_title\` varchar(200),
        \`meta_description\` varchar(500),
        \`meta_keywords\` varchar(300),
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`view_count\` int NOT NULL DEFAULT 0,
        \`sales_count\` int NOT NULL DEFAULT 0,
        \`rating_average\` decimal(3,2) NOT NULL DEFAULT 0,
        \`rating_count\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_product_sku\` (\`sku\`),
        KEY \`IDX_product_category\` (\`category_id\`),
        KEY \`IDX_product_status\` (\`status\`),
        KEY \`IDX_product_featured\` (\`is_featured\`),
        KEY \`IDX_product_price\` (\`price\`),
        CONSTRAINT \`FK_product_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`product_categories\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建商品图片表
    await queryRunner.query(`
      CREATE TABLE \`product_images\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`product_id\` int NOT NULL,
        \`image_url\` varchar(500) NOT NULL,
        \`alt_text\` varchar(200),
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_primary\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_product_image_product\` (\`product_id\`),
        KEY \`IDX_product_image_primary\` (\`is_primary\`),
        CONSTRAINT \`FK_product_image_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建购物车表
    await queryRunner.query(`
      CREATE TABLE \`cart_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`product_id\` int NOT NULL,
        \`quantity\` int NOT NULL DEFAULT 1,
        \`selected\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_cart_user_product\` (\`user_id\`, \`product_id\`),
        KEY \`IDX_cart_user\` (\`user_id\`),
        KEY \`IDX_cart_product\` (\`product_id\`),
        CONSTRAINT \`FK_cart_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_cart_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建订单地址表
    await queryRunner.query(`
      CREATE TABLE \`order_addresses\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`type\` enum('billing','shipping') NOT NULL,
        \`first_name\` varchar(50) NOT NULL,
        \`last_name\` varchar(50) NOT NULL,
        \`company\` varchar(100),
        \`address_line_1\` varchar(200) NOT NULL,
        \`address_line_2\` varchar(200),
        \`city\` varchar(100) NOT NULL,
        \`state\` varchar(100),
        \`postal_code\` varchar(20) NOT NULL,
        \`country\` varchar(100) NOT NULL,
        \`phone\` varchar(20),
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建订单表
    await queryRunner.query(`
      CREATE TABLE \`orders\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`order_number\` varchar(50) NOT NULL,
        \`user_id\` int NOT NULL,
        \`status\` enum('pending','confirmed','processing','shipped','delivered','cancelled','refunded','failed') NOT NULL DEFAULT 'pending',
        \`payment_status\` enum('pending','paid','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
        \`shipping_status\` enum('pending','preparing','shipped','in_transit','delivered','failed') NOT NULL DEFAULT 'pending',
        \`subtotal\` decimal(10,2) NOT NULL,
        \`tax_amount\` decimal(10,2) NOT NULL DEFAULT 0,
        \`shipping_amount\` decimal(10,2) NOT NULL DEFAULT 0,
        \`discount_amount\` decimal(10,2) NOT NULL DEFAULT 0,
        \`total_amount\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`billing_address_id\` int,
        \`shipping_address_id\` int,
        \`shipping_method\` varchar(100),
        \`tracking_number\` varchar(100),
        \`notes\` text,
        \`shipped_at\` datetime,
        \`delivered_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_order_number\` (\`order_number\`),
        KEY \`IDX_order_user\` (\`user_id\`),
        KEY \`IDX_order_status\` (\`status\`),
        KEY \`IDX_order_payment_status\` (\`payment_status\`),
        CONSTRAINT \`FK_order_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_order_billing_address\` FOREIGN KEY (\`billing_address_id\`) REFERENCES \`order_addresses\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_order_shipping_address\` FOREIGN KEY (\`shipping_address_id\`) REFERENCES \`order_addresses\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建订单项表
    await queryRunner.query(`
      CREATE TABLE \`order_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`order_id\` int NOT NULL,
        \`product_id\` int,
        \`quantity\` int NOT NULL,
        \`unit_price\` decimal(10,2) NOT NULL,
        \`total_price\` decimal(10,2) NOT NULL,
        \`product_name\` varchar(200) NOT NULL,
        \`product_sku\` varchar(100),
        \`product_image\` varchar(500),
        \`product_options\` json,
        \`product_snapshot\` json,
        \`notes\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_order_item_order\` (\`order_id\`),
        KEY \`IDX_order_item_product\` (\`product_id\`),
        CONSTRAINT \`FK_order_item_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_order_item_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`order_items\``);
    await queryRunner.query(`DROP TABLE \`orders\``);
    await queryRunner.query(`DROP TABLE \`order_addresses\``);
    await queryRunner.query(`DROP TABLE \`cart_items\``);
    await queryRunner.query(`DROP TABLE \`product_images\``);
    await queryRunner.query(`DROP TABLE \`products\``);
    await queryRunner.query(`DROP TABLE \`product_categories\``);
  }
}