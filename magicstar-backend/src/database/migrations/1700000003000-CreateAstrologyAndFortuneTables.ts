import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAstrologyAndFortuneTables1700000003000 implements MigrationInterface {
  name = 'CreateAstrologyAndFortuneTables1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建星盘表
    await queryRunner.query(`
      CREATE TABLE \`birth_charts\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`birth_date\` date NOT NULL,
        \`birth_time\` time NOT NULL,
        \`birth_location\` varchar(200) NOT NULL,
        \`latitude\` decimal(10,7) NOT NULL,
        \`longitude\` decimal(10,7) NOT NULL,
        \`timezone\` varchar(50) NOT NULL,
        \`chart_data\` json NOT NULL,
        \`is_public\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_birth_chart_user\` (\`user_id\`),
        KEY \`IDX_birth_chart_public\` (\`is_public\`),
        CONSTRAINT \`FK_birth_chart_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建行星表
    await queryRunner.query(`
      CREATE TABLE \`planets\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`birth_chart_id\` int NOT NULL,
        \`name\` varchar(50) NOT NULL,
        \`sign\` varchar(50) NOT NULL,
        \`house\` int NOT NULL,
        \`degree\` decimal(8,5) NOT NULL,
        \`minute\` int NOT NULL,
        \`second\` int NOT NULL,
        \`retrograde\` tinyint NOT NULL DEFAULT 0,
        \`dignity\` varchar(50),
        \`element\` varchar(20),
        \`modality\` varchar(20),
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_planet_chart\` (\`birth_chart_id\`),
        KEY \`IDX_planet_name\` (\`name\`),
        KEY \`IDX_planet_sign\` (\`sign\`),
        CONSTRAINT \`FK_planet_chart\` FOREIGN KEY (\`birth_chart_id\`) REFERENCES \`birth_charts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建宫位表
    await queryRunner.query(`
      CREATE TABLE \`houses\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`birth_chart_id\` int NOT NULL,
        \`house_number\` int NOT NULL,
        \`name\` varchar(50) NOT NULL,
        \`cusp_sign\` varchar(50) NOT NULL,
        \`cusp_degree\` decimal(8,5) NOT NULL,
        \`size\` decimal(8,5),
        \`description\` text,
        \`keywords\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_house_chart\` (\`birth_chart_id\`),
        KEY \`IDX_house_number\` (\`house_number\`),
        CONSTRAINT \`FK_house_chart\` FOREIGN KEY (\`birth_chart_id\`) REFERENCES \`birth_charts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建相位表
    await queryRunner.query(`
      CREATE TABLE \`aspects\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`birth_chart_id\` int NOT NULL,
        \`planet1_id\` int NOT NULL,
        \`planet2_id\` int NOT NULL,
        \`aspect_type\` varchar(50) NOT NULL,
        \`orb\` decimal(6,3) NOT NULL,
        \`exact_degree\` decimal(8,5) NOT NULL,
        \`is_applying\` tinyint NOT NULL DEFAULT 0,
        \`strength\` decimal(5,2),
        \`interpretation\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_aspect_chart\` (\`birth_chart_id\`),
        KEY \`IDX_aspect_planet1\` (\`planet1_id\`),
        KEY \`IDX_aspect_planet2\` (\`planet2_id\`),
        KEY \`IDX_aspect_type\` (\`aspect_type\`),
        CONSTRAINT \`FK_aspect_chart\` FOREIGN KEY (\`birth_chart_id\`) REFERENCES \`birth_charts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_aspect_planet1\` FOREIGN KEY (\`planet1_id\`) REFERENCES \`planets\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_aspect_planet2\` FOREIGN KEY (\`planet2_id\`) REFERENCES \`planets\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建星盘解读表
    await queryRunner.query(`
      CREATE TABLE \`chart_interpretations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`birth_chart_id\` int NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`content\` text NOT NULL,
        \`category\` varchar(50),
        \`priority\` int NOT NULL DEFAULT 0,
        \`accuracy_score\` decimal(5,4),
        \`generated_by\` enum('ai','astrologer','system') NOT NULL DEFAULT 'system',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_chart_interpretation_chart\` (\`birth_chart_id\`),
        KEY \`IDX_chart_interpretation_type\` (\`type\`),
        CONSTRAINT \`FK_chart_interpretation_chart\` FOREIGN KEY (\`birth_chart_id\`) REFERENCES \`birth_charts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建运势模板表
    await queryRunner.query(`
      CREATE TABLE \`fortune_templates\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`description\` text,
        \`category\` enum('daily','weekly','monthly','yearly','love','career','health','finance') NOT NULL,
        \`target_audience\` enum('general','zodiac_sign','birth_chart','premium') NOT NULL DEFAULT 'general',
        \`content_template\` text NOT NULL,
        \`variables\` json,
        \`status\` enum('active','inactive','draft') NOT NULL DEFAULT 'active',
        \`priority\` int NOT NULL DEFAULT 0,
        \`usage_count\` int NOT NULL DEFAULT 0,
        \`rating\` decimal(3,2) NOT NULL DEFAULT 0,
        \`created_by\` int,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_fortune_template_category\` (\`category\`),
        KEY \`IDX_fortune_template_audience\` (\`target_audience\`),
        KEY \`IDX_fortune_template_status\` (\`status\`),
        CONSTRAINT \`FK_fortune_template_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建用户运势表
    await queryRunner.query(`
      CREATE TABLE \`user_fortunes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`template_id\` int,
        \`date\` date NOT NULL,
        \`category\` enum('daily','weekly','monthly','yearly','love','career','health','finance') NOT NULL,
        \`zodiac_sign\` varchar(20),
        \`content\` text NOT NULL,
        \`lucky_numbers\` json,
        \`lucky_colors\` json,
        \`lucky_directions\` json,
        \`overall_score\` int,
        \`love_score\` int,
        \`career_score\` int,
        \`health_score\` int,
        \`finance_score\` int,
        \`is_read\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_user_fortune_unique\` (\`user_id\`, \`date\`, \`category\`),
        KEY \`IDX_user_fortune_user\` (\`user_id\`),
        KEY \`IDX_user_fortune_date\` (\`date\`),
        KEY \`IDX_user_fortune_category\` (\`category\`),
        CONSTRAINT \`FK_user_fortune_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_fortune_template\` FOREIGN KEY (\`template_id\`) REFERENCES \`fortune_templates\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建运势历史表
    await queryRunner.query(`
      CREATE TABLE \`fortune_histories\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`fortune_id\` int NOT NULL,
        \`action\` enum('view','share','favorite','rate') NOT NULL,
        \`rating\` int,
        \`feedback\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_fortune_history_user\` (\`user_id\`),
        KEY \`IDX_fortune_history_fortune\` (\`fortune_id\`),
        KEY \`IDX_fortune_history_action\` (\`action\`),
        CONSTRAINT \`FK_fortune_history_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_fortune_history_fortune\` FOREIGN KEY (\`fortune_id\`) REFERENCES \`user_fortunes\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建运势订阅表
    await queryRunner.query(`
      CREATE TABLE \`fortune_subscriptions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`category\` enum('daily','weekly','monthly','yearly','love','career','health','finance') NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`notification_time\` time DEFAULT '08:00:00',
        \`timezone\` varchar(50) DEFAULT 'Asia/Shanghai',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_fortune_subscription_unique\` (\`user_id\`, \`category\`),
        KEY \`IDX_fortune_subscription_user\` (\`user_id\`),
        KEY \`IDX_fortune_subscription_category\` (\`category\`),
        CONSTRAINT \`FK_fortune_subscription_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`fortune_subscriptions\``);
    await queryRunner.query(`DROP TABLE \`fortune_histories\``);
    await queryRunner.query(`DROP TABLE \`user_fortunes\``);
    await queryRunner.query(`DROP TABLE \`fortune_templates\``);
    await queryRunner.query(`DROP TABLE \`chart_interpretations\``);
    await queryRunner.query(`DROP TABLE \`aspects\``);
    await queryRunner.query(`DROP TABLE \`houses\``);
    await queryRunner.query(`DROP TABLE \`planets\``);
    await queryRunner.query(`DROP TABLE \`birth_charts\``);
  }
}