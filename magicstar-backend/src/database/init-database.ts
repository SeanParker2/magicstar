#!/usr/bin/env ts-node

import { connectDatabase, runMigrations, runSeeds } from './database.config';

/**
 * 数据库初始化脚本
 * 用于创建数据库表结构和初始数据
 */
async function initDatabase() {
  console.log('🚀 开始初始化数据库...');
  
  try {
    // 1. 连接数据库
    console.log('📡 连接数据库...');
    await connectDatabase();
    
    // 2. 运行迁移
    console.log('🔄 运行数据库迁移...');
    await runMigrations();
    
    // 3. 运行种子数据
    console.log('🌱 创建种子数据...');
    await runSeeds();
    
    console.log('✅ 数据库初始化完成！');
    console.log('\n📋 创建的内容：');
    console.log('   - 用户和角色表');
    console.log('   - 塔罗牌相关表');
    console.log('   - 商城相关表');
    console.log('   - 支付相关表');
    console.log('   - AI服务相关表');
    console.log('   - 占星学相关表');
    console.log('   - 财务相关表');
    console.log('   - 基础用户数据');
    console.log('\n🔑 默认账号：');
    console.log('   管理员: admin@magicstar.com / admin123456');
    console.log('   测试用户: test@magicstar.com / test123456');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

export { initDatabase };