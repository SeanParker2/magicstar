import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Exclude } from 'class-transformer';

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 50, unique: true, comment: '用户名' })
  @Index()
  username: string;

  @Column({ length: 100, unique: true, comment: '邮箱' })
  @Index()
  email: string;

  @Column({ length: 20, unique: true, nullable: true, comment: '手机号' })
  @Index()
  phone?: string;

  @Column({ comment: '密码' })
  @Exclude()
  password: string;

  @Column({ length: 50, nullable: true, comment: '昵称' })
  nickname?: string;

  @Column({ length: 500, nullable: true, comment: '头像URL' })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserGender,
    nullable: true,
    comment: '性别',
  })
  gender?: UserGender;

  @Column({ type: 'date', nullable: true, comment: '生日' })
  birthday?: Date;

  @Column({ length: 100, nullable: true, comment: '出生地' })
  birthPlace?: string;

  @Column({ type: 'time', nullable: true, comment: '出生时间' })
  birthTime?: string;

  @Column({ length: 500, nullable: true, comment: '个人简介' })
  bio?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    comment: '用户状态',
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false, comment: '是否为VIP用户' })
  isVip: boolean;

  @Column({ type: 'datetime', nullable: true, comment: 'VIP到期时间' })
  vipExpiredAt?: Date;

  @Column({ type: 'int', default: 0, comment: '积分' })
  points: number;

  @Column({ type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt?: Date;

  @Column({ length: 50, nullable: true, comment: '最后登录IP' })
  lastLoginIp?: string;

  @Column({ type: 'boolean', default: false, comment: '邮箱是否已验证' })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false, comment: '手机号是否已验证' })
  phoneVerified: boolean;

  @Column({ type: 'json', nullable: true, comment: '用户偏好设置' })
  preferences?: Record<string, any>;

  @Column({ type: 'json', nullable: true, comment: '第三方登录信息' })
  thirdPartyInfo?: Record<string, any>;
}