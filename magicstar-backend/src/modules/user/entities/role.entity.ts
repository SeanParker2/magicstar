import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

export enum RoleType {
  ADMIN = 'admin',
  USER = 'user',
  VIP = 'vip',
  MODERATOR = 'moderator',
}

export enum Permission {
  // 用户管理权限
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // 占卜功能权限
  DIVINATION_TAROT = 'divination:tarot',
  DIVINATION_ASTROLOGY = 'divination:astrology',
  DIVINATION_FORTUNE = 'divination:fortune',
  DIVINATION_AI_ENHANCED = 'divination:ai_enhanced',

  // 商城权限
  SHOP_VIEW = 'shop:view',
  SHOP_PURCHASE = 'shop:purchase',
  SHOP_MANAGE = 'shop:manage',

  // 管理员权限
  ADMIN_PANEL = 'admin:panel',
  ADMIN_USERS = 'admin:users',
  ADMIN_ORDERS = 'admin:orders',
  ADMIN_CONTENT = 'admin:content',
}

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 50, unique: true, comment: '角色名称' })
  name: string;

  @Column({ length: 200, nullable: true, comment: '角色描述' })
  description?: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '角色类型',
  })
  type: RoleType;

  @Column({
    type: 'json',
    comment: '权限列表',
    default: () => "'[]'",
  })
  permissions: Permission[];

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '角色优先级，数字越大优先级越高',
  })
  priority: number;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
