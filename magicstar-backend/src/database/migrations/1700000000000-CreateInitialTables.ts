import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1700000000000 implements MigrationInterface {
  name = 'CreateInitialTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建用户相关表
    await queryRunner.query(`
      CREATE TABLE \`roles\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(50) NOT NULL,
        \`description\` text,
        \`permissions\` json NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_role_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(50) NOT NULL,
        \`email\` varchar(100) NOT NULL,
        \`phone\` varchar(20),
        \`password_hash\` varchar(255) NOT NULL,
        \`nickname\` varchar(50),
        \`avatar\` varchar(500),
        \`gender\` enum('male','female','other') DEFAULT 'other',
        \`birth_date\` date,
        \`birth_time\` time,
        \`birth_location\` varchar(200),
        \`timezone\` varchar(50) DEFAULT 'Asia/Shanghai',
        \`status\` enum('active','inactive','suspended','deleted') NOT NULL DEFAULT 'active',
        \`last_login_at\` datetime,
        \`email_verified\` tinyint NOT NULL DEFAULT 0,
        \`phone_verified\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_user_username\` (\`username\`),
        UNIQUE KEY \`IDX_user_email\` (\`email\`),
        KEY \`IDX_user_phone\` (\`phone\`),
        KEY \`IDX_user_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建塔罗牌相关表
    await queryRunner.query(`
      CREATE TABLE \`tarot_cards\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`name_cn\` varchar(100) NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`suit\` varchar(50),
        \`number\` int NOT NULL,
        \`upright_keywords\` text NOT NULL,
        \`reversed_keywords\` text NOT NULL,
        \`upright_meaning\` text NOT NULL,
        \`reversed_meaning\` text NOT NULL,
        \`description\` text NOT NULL,
        \`image_url\` varchar(500) NOT NULL,
        \`element\` varchar(50),
        \`astrology\` varchar(100),
        \`numerology_meaning\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tarot_card_type\` (\`type\`),
        KEY \`IDX_tarot_card_suit\` (\`suit\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE \`tarot_spreads\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`name_cn\` varchar(100) NOT NULL,
        \`description\` text NOT NULL,
        \`card_count\` int NOT NULL,
        \`difficulty\` varchar(50) NOT NULL,
        \`scenarios\` json NOT NULL,
        \`positions_config\` json NOT NULL,
        \`layout_image\` varchar(500),
        \`usage_count\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tarot_spread_difficulty\` (\`difficulty\`),
        KEY \`IDX_tarot_spread_active\` (\`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE \`tarot_readings\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`spread_id\` int NOT NULL,
        \`question\` text NOT NULL,
        \`drawn_cards\` json NOT NULL,
        \`overall_interpretation\` text NOT NULL,
        \`detailed_interpretation\` json NOT NULL,
        \`summary\` text NOT NULL,
        \`advice\` text,
        \`reading_time\` datetime NOT NULL,
        \`is_public\` tinyint NOT NULL DEFAULT 0,
        \`rating\` int,
        \`feedback\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tarot_reading_user\` (\`user_id\`),
        KEY \`IDX_tarot_reading_spread\` (\`spread_id\`),
        KEY \`IDX_tarot_reading_time\` (\`reading_time\`),
        CONSTRAINT \`FK_tarot_reading_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_tarot_reading_spread\` FOREIGN KEY (\`spread_id\`) REFERENCES \`tarot_spreads\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建占卜记录表
    await queryRunner.query(`
      CREATE TABLE \`divination_records\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`question\` text,
        \`result\` json NOT NULL,
        \`interpretation\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_divination_user\` (\`user_id\`),
        KEY \`IDX_divination_type\` (\`type\`),
        CONSTRAINT \`FK_divination_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`divination_records\``);
    await queryRunner.query(`DROP TABLE \`tarot_readings\``);
    await queryRunner.query(`DROP TABLE \`tarot_spreads\``);
    await queryRunner.query(`DROP TABLE \`tarot_cards\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`roles\``);
  }
}