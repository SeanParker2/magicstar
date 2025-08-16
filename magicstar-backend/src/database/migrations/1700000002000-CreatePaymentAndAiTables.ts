import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentAndAiTables1700000002000 implements MigrationInterface {
  name = 'CreatePaymentAndAiTables1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建支付表
    await queryRunner.query(`
      CREATE TABLE \`payments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`order_id\` int,
        \`payment_method\` enum('wechat','alipay','bank_transfer','credit_card','paypal') NOT NULL,
        \`payment_provider\` varchar(50) NOT NULL,
        \`transaction_id\` varchar(100),
        \`external_transaction_id\` varchar(100),
        \`amount\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`status\` enum('pending','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
        \`gateway_response\` json,
        \`failure_reason\` varchar(500),
        \`processed_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_payment_transaction\` (\`transaction_id\`),
        KEY \`IDX_payment_order\` (\`order_id\`),
        KEY \`IDX_payment_status\` (\`status\`),
        KEY \`IDX_payment_method\` (\`payment_method\`),
        CONSTRAINT \`FK_payment_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建支付记录表
    await queryRunner.query(`
      CREATE TABLE \`payment_records\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`order_id\` int,
        \`payment_id\` int,
        \`type\` enum('payment','refund','chargeback','adjustment') NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`status\` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
        \`description\` varchar(500),
        \`reference_number\` varchar(100),
        \`metadata\` json,
        \`processed_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_payment_record_user\` (\`user_id\`),
        KEY \`IDX_payment_record_order\` (\`order_id\`),
        KEY \`IDX_payment_record_payment\` (\`payment_id\`),
        KEY \`IDX_payment_record_type\` (\`type\`),
        CONSTRAINT \`FK_payment_record_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_payment_record_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_payment_record_payment\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建支付日志表
    await queryRunner.query(`
      CREATE TABLE \`payment_logs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`payment_id\` int,
        \`action\` varchar(50) NOT NULL,
        \`status\` varchar(50) NOT NULL,
        \`request_data\` json,
        \`response_data\` json,
        \`error_message\` text,
        \`processing_time\` int,
        \`ip_address\` varchar(45),
        \`user_agent\` varchar(500),
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_payment_log_payment\` (\`payment_id\`),
        KEY \`IDX_payment_log_action\` (\`action\`),
        KEY \`IDX_payment_log_status\` (\`status\`),
        CONSTRAINT \`FK_payment_log_payment\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建退款表
    await queryRunner.query(`
      CREATE TABLE \`refunds\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`payment_id\` int NOT NULL,
        \`order_id\` int,
        \`refund_number\` varchar(50) NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`reason\` varchar(500),
        \`status\` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
        \`external_refund_id\` varchar(100),
        \`gateway_response\` json,
        \`processed_by\` int,
        \`processed_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_refund_number\` (\`refund_number\`),
        KEY \`IDX_refund_payment\` (\`payment_id\`),
        KEY \`IDX_refund_order\` (\`order_id\`),
        KEY \`IDX_refund_status\` (\`status\`),
        CONSTRAINT \`FK_refund_payment\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_refund_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_refund_processed_by\` FOREIGN KEY (\`processed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建AI请求表
    await queryRunner.query(`
      CREATE TABLE \`ai_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int,
        \`session_id\` varchar(100),
        \`type\` enum('divination_interpretation','tarot_reading','fortune_analysis','personalized_advice','content_generation') NOT NULL,
        \`input_data\` json NOT NULL,
        \`prompt\` text NOT NULL,
        \`status\` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
        \`priority\` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
        \`model_name\` varchar(100),
        \`model_version\` varchar(50),
        \`tokens_used\` int,
        \`cost\` decimal(10,4),
        \`processing_time\` int,
        \`error_message\` text,
        \`retry_count\` int NOT NULL DEFAULT 0,
        \`max_retries\` int NOT NULL DEFAULT 3,
        \`scheduled_at\` datetime,
        \`started_at\` datetime,
        \`completed_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_ai_request_user\` (\`user_id\`),
        KEY \`IDX_ai_request_session\` (\`session_id\`),
        KEY \`IDX_ai_request_type\` (\`type\`),
        KEY \`IDX_ai_request_status\` (\`status\`),
        KEY \`IDX_ai_request_priority\` (\`priority\`),
        CONSTRAINT \`FK_ai_request_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建AI响应表
    await queryRunner.query(`
      CREATE TABLE \`ai_responses\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`request_id\` int NOT NULL,
        \`content\` text NOT NULL,
        \`metadata\` json,
        \`confidence_score\` decimal(5,4),
        \`quality_score\` decimal(5,4),
        \`tokens_used\` int,
        \`model_name\` varchar(100),
        \`model_version\` varchar(50),
        \`processing_time\` int,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_ai_response_request\` (\`request_id\`),
        CONSTRAINT \`FK_ai_response_request\` FOREIGN KEY (\`request_id\`) REFERENCES \`ai_requests\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建AI提示模板表
    await queryRunner.query(`
      CREATE TABLE \`prompt_templates\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`description\` text,
        \`category\` enum('divination','tarot','fortune','advice','content','system') NOT NULL,
        \`type\` enum('divination_interpretation','tarot_reading','fortune_analysis','personalized_advice','content_generation') NOT NULL,
        \`template\` text NOT NULL,
        \`variables\` json,
        \`status\` enum('active','inactive','testing','deprecated') NOT NULL DEFAULT 'active',
        \`version\` varchar(20) NOT NULL DEFAULT '1.0.0',
        \`usage_count\` int NOT NULL DEFAULT 0,
        \`success_rate\` decimal(5,4) NOT NULL DEFAULT 0,
        \`average_rating\` decimal(3,2) NOT NULL DEFAULT 0,
        \`created_by\` int,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_prompt_template_category\` (\`category\`),
        KEY \`IDX_prompt_template_type\` (\`type\`),
        KEY \`IDX_prompt_template_status\` (\`status\`),
        CONSTRAINT \`FK_prompt_template_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`prompt_templates\``);
    await queryRunner.query(`DROP TABLE \`ai_responses\``);
    await queryRunner.query(`DROP TABLE \`ai_requests\``);
    await queryRunner.query(`DROP TABLE \`refunds\``);
    await queryRunner.query(`DROP TABLE \`payment_logs\``);
    await queryRunner.query(`DROP TABLE \`payment_records\``);
    await queryRunner.query(`DROP TABLE \`payments\``);
  }
}