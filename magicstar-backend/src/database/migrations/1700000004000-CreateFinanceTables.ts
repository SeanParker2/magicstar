import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceTables1700000004000 implements MigrationInterface {
  name = 'CreateFinanceTables1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建财务记录表
    await queryRunner.query(`
      CREATE TABLE \`financial_records\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int,
        \`order_id\` int,
        \`payment_id\` int,
        \`type\` enum('income','expense','refund','commission','fee','adjustment') NOT NULL,
        \`category\` varchar(50) NOT NULL,
        \`amount\` decimal(15,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`description\` varchar(500),
        \`reference_number\` varchar(100),
        \`status\` enum('pending','confirmed','cancelled','reconciled') NOT NULL DEFAULT 'pending',
        \`transaction_date\` datetime NOT NULL,
        \`reconciled_at\` datetime,
        \`reconciled_by\` int,
        \`metadata\` json,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_financial_record_user\` (\`user_id\`),
        KEY \`IDX_financial_record_order\` (\`order_id\`),
        KEY \`IDX_financial_record_payment\` (\`payment_id\`),
        KEY \`IDX_financial_record_type\` (\`type\`),
        KEY \`IDX_financial_record_category\` (\`category\`),
        KEY \`IDX_financial_record_status\` (\`status\`),
        KEY \`IDX_financial_record_date\` (\`transaction_date\`),
        CONSTRAINT \`FK_financial_record_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_financial_record_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_financial_record_payment\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_financial_record_reconciled_by\` FOREIGN KEY (\`reconciled_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建退款记录表
    await queryRunner.query(`
      CREATE TABLE \`refund_records\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`refund_id\` int NOT NULL,
        \`original_payment_id\` int NOT NULL,
        \`order_id\` int,
        \`user_id\` int NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`reason\` varchar(500),
        \`status\` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
        \`refund_method\` varchar(50),
        \`external_refund_id\` varchar(100),
        \`gateway_response\` json,
        \`processed_by\` int,
        \`processed_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_refund_record_refund\` (\`refund_id\`),
        KEY \`IDX_refund_record_payment\` (\`original_payment_id\`),
        KEY \`IDX_refund_record_order\` (\`order_id\`),
        KEY \`IDX_refund_record_user\` (\`user_id\`),
        KEY \`IDX_refund_record_status\` (\`status\`),
        CONSTRAINT \`FK_refund_record_refund\` FOREIGN KEY (\`refund_id\`) REFERENCES \`refunds\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_refund_record_payment\` FOREIGN KEY (\`original_payment_id\`) REFERENCES \`payments\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_refund_record_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_refund_record_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_refund_record_processed_by\` FOREIGN KEY (\`processed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建对账记录表
    await queryRunner.query(`
      CREATE TABLE \`reconciliation_records\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reconciliation_date\` date NOT NULL,
        \`payment_provider\` varchar(50) NOT NULL,
        \`total_transactions\` int NOT NULL DEFAULT 0,
        \`total_amount\` decimal(15,2) NOT NULL DEFAULT 0,
        \`matched_transactions\` int NOT NULL DEFAULT 0,
        \`matched_amount\` decimal(15,2) NOT NULL DEFAULT 0,
        \`unmatched_transactions\` int NOT NULL DEFAULT 0,
        \`unmatched_amount\` decimal(15,2) NOT NULL DEFAULT 0,
        \`discrepancy_count\` int NOT NULL DEFAULT 0,
        \`discrepancy_amount\` decimal(15,2) NOT NULL DEFAULT 0,
        \`status\` enum('pending','in_progress','completed','failed','requires_review') NOT NULL DEFAULT 'pending',
        \`reconciliation_file\` varchar(500),
        \`summary_report\` json,
        \`discrepancies\` json,
        \`processed_by\` int,
        \`processed_at\` datetime,
        \`reviewed_by\` int,
        \`reviewed_at\` datetime,
        \`notes\` text,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_reconciliation_unique\` (\`reconciliation_date\`, \`payment_provider\`),
        KEY \`IDX_reconciliation_date\` (\`reconciliation_date\`),
        KEY \`IDX_reconciliation_provider\` (\`payment_provider\`),
        KEY \`IDX_reconciliation_status\` (\`status\`),
        CONSTRAINT \`FK_reconciliation_processed_by\` FOREIGN KEY (\`processed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_reconciliation_reviewed_by\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建财务报表表
    await queryRunner.query(`
      CREATE TABLE \`financial_reports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`report_type\` enum('daily','weekly','monthly','quarterly','yearly','custom') NOT NULL,
        \`report_name\` varchar(200) NOT NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
        \`total_revenue\` decimal(15,2) NOT NULL DEFAULT 0,
        \`total_expenses\` decimal(15,2) NOT NULL DEFAULT 0,
        \`total_refunds\` decimal(15,2) NOT NULL DEFAULT 0,
        \`net_income\` decimal(15,2) NOT NULL DEFAULT 0,
        \`transaction_count\` int NOT NULL DEFAULT 0,
        \`order_count\` int NOT NULL DEFAULT 0,
        \`refund_count\` int NOT NULL DEFAULT 0,
        \`average_order_value\` decimal(10,2) NOT NULL DEFAULT 0,
        \`refund_rate\` decimal(5,4) NOT NULL DEFAULT 0,
        \`detailed_data\` json,
        \`charts_data\` json,
        \`status\` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
        \`file_path\` varchar(500),
        \`generated_by\` int,
        \`generated_at\` datetime,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_financial_report_type\` (\`report_type\`),
        KEY \`IDX_financial_report_date_range\` (\`start_date\`, \`end_date\`),
        KEY \`IDX_financial_report_status\` (\`status\`),
        CONSTRAINT \`FK_financial_report_generated_by\` FOREIGN KEY (\`generated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建索引以优化查询性能
    await queryRunner.query(`CREATE INDEX \`IDX_financial_record_amount\` ON \`financial_records\` (\`amount\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_financial_record_currency\` ON \`financial_records\` (\`currency\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_refund_record_amount\` ON \`refund_records\` (\`amount\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_financial_report_revenue\` ON \`financial_reports\` (\`total_revenue\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_financial_report_revenue\` ON \`financial_reports\``);
    await queryRunner.query(`DROP INDEX \`IDX_refund_record_amount\` ON \`refund_records\``);
    await queryRunner.query(`DROP INDEX \`IDX_financial_record_currency\` ON \`financial_records\``);
    await queryRunner.query(`DROP INDEX \`IDX_financial_record_amount\` ON \`financial_records\``);
    await queryRunner.query(`DROP TABLE \`financial_reports\``);
    await queryRunner.query(`DROP TABLE \`reconciliation_records\``);
    await queryRunner.query(`DROP TABLE \`refund_records\``);
    await queryRunner.query(`DROP TABLE \`financial_records\``);
  }
}