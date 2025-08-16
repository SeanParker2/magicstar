import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// 加载环境变量
config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 3306),
  username: configService.get('DB_USERNAME', 'root'),
  password: configService.get('DB_PASSWORD', ''),
  database: configService.get('DB_DATABASE', 'magicstar'),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false, // 生产环境应该设为 false
  logging: configService.get('NODE_ENV') === 'development',
  charset: 'utf8mb4',
  timezone: '+08:00',
  extra: {
    connectionLimit: 10,
  },
});

// 数据库连接函数
export async function connectDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');
    return AppDataSource;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

// 运行迁移
export async function runMigrations() {
  try {
    await AppDataSource.runMigrations();
    console.log('✅ 数据库迁移完成');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  }
}

// 运行种子数据
export async function runSeeds() {
  try {
    // 手动运行种子数据
    const { InitialData1700000000000 } = await import('./seeds/1700000000000-InitialData.js');
    const seeder = new InitialData1700000000000();
    await seeder.run(AppDataSource);
    console.log('✅ 种子数据创建完成');
  } catch (error) {
    console.error('❌ 种子数据创建失败:', error);
    throw error;
  }
}