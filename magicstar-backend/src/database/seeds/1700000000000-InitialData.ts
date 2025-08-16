import { DataSource } from 'typeorm';
import { Role, RoleType, Permission } from '../../modules/user/entities/role.entity';
import { User, UserStatus } from '../../modules/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

export class InitialData1700000000000 {
  public async run(dataSource: DataSource): Promise<any> {
    // 创建角色
    const roleRepository = dataSource.getRepository(Role);
    
    // 创建管理员角色
    const adminRoleExists = await roleRepository.findOne({ where: { name: 'admin' } });
    if (!adminRoleExists) {
      const adminRole = roleRepository.create({
        name: 'admin',
        description: '系统管理员',
        type: RoleType.ADMIN,
        permissions: [Permission.ADMIN_PANEL, Permission.ADMIN_USERS, Permission.ADMIN_ORDERS, Permission.ADMIN_CONTENT],
      });
      await roleRepository.save(adminRole);
    }

    // 创建普通用户角色
    const userRoleExists = await roleRepository.findOne({ where: { name: 'user' } });
    if (!userRoleExists) {
      const userRole = roleRepository.create({
        name: 'user',
        description: '普通用户',
        type: RoleType.USER,
        permissions: [Permission.SHOP_VIEW, Permission.SHOP_PURCHASE, Permission.DIVINATION_TAROT],
      });
      await roleRepository.save(userRole);
    }

    // 创建VIP用户角色
    const vipRoleExists = await roleRepository.findOne({ where: { name: 'vip' } });
    if (!vipRoleExists) {
      const vipRole = roleRepository.create({
        name: 'vip',
        description: 'VIP用户',
        type: RoleType.VIP,
        permissions: [
          Permission.SHOP_VIEW, 
          Permission.SHOP_PURCHASE, 
          Permission.DIVINATION_TAROT, 
          Permission.DIVINATION_ASTROLOGY, 
          Permission.DIVINATION_FORTUNE,
          Permission.DIVINATION_AI_ENHANCED
        ],
      });
      await roleRepository.save(vipRole);
    }

    // 创建管理员用户
    const userRepository = dataSource.getRepository(User);
    const adminRole = await roleRepository.findOne({ where: { name: 'admin' } });
    
    const adminExists = await userRepository.findOne({ where: { email: 'admin@magicstar.com' } });
    if (!adminExists && adminRole) {
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      const admin = userRepository.create({
        email: 'admin@magicstar.com',
        username: 'admin',
        password: hashedPassword,
        nickname: '系统管理员',
        phone: '13800138000',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        roles: [adminRole],
      });
      await userRepository.save(admin);
    }

    // 创建测试用户
    const userRole = await roleRepository.findOne({ where: { name: 'user' } });
    const testUserExists = await userRepository.findOne({ where: { email: 'test@magicstar.com' } });
    if (!testUserExists && userRole) {
      const hashedPassword = await bcrypt.hash('test123456', 10);
      const testUser = userRepository.create({
        email: 'test@magicstar.com',
        username: 'testuser',
        password: hashedPassword,
        nickname: '测试用户',
        phone: '13800138001',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
        roles: [userRole],
      });
      await userRepository.save(testUser);
    }

    console.log('✅ 基础用户和角色数据已创建');
    console.log('管理员账号: admin@magicstar.com / admin123456');
    console.log('测试账号: test@magicstar.com / test123456');
  }
}