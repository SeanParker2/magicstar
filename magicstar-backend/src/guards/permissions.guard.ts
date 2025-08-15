import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ROLES_KEY,
  PERMISSIONS_KEY,
  PUBLIC_KEY,
  OPTIONAL_AUTH_KEY,
} from '../decorators/permissions.decorator';
import { Permission } from '../modules/user/entities/role.entity';
import { User } from '../modules/user/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 检查是否为可选认证接口
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // 如果是可选认证且没有用户，允许访问
    if (isOptionalAuth && !user) {
      return true;
    }

    // 如果不是可选认证且没有用户，拒绝访问
    if (!user) {
      throw new ForbiddenException('需要登录后访问');
    }

    // 检查用户账号状态
    if (user.isLocked) {
      throw new ForbiddenException('账号已被锁定');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('账号状态异常');
    }

    // 检查所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user.permissions || [];
      const hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException('权限不足');
      }
    }

    // 检查所需角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = user.roles?.map((role) => role.name) || [];
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException('角色权限不足');
      }
    }

    return true;
  }
}
