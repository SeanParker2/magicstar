import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT认证守卫
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}