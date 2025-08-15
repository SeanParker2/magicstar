import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 可选JWT认证守卫
 * 允许未认证的用户访问，但如果提供了token则会验证
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * 重写canActivate方法，使认证变为可选
   */
  canActivate(context: ExecutionContext) {
    // 调用父类的canActivate方法
    return super.canActivate(context);
  }

  /**
   * 重写handleRequest方法，处理认证失败的情况
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 如果没有错误且有用户信息，返回用户
    if (!err && user) {
      return user;
    }
    
    // 如果有错误或没有用户信息，返回null（允许未认证访问）
    return null;
  }
}