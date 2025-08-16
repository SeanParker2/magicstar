import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SecurityService } from './security.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private securityService: SecurityService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 检查IP白名单
    if (!this.checkIPWhitelist(request)) {
      throw new ForbiddenException('Access denied from this IP address');
    }

    // 检查请求大小
    if (!this.checkRequestSize(request)) {
      throw new BadRequestException('Request payload too large');
    }

    // 检查请求头
    if (!this.checkRequestHeaders(request)) {
      throw new BadRequestException('Invalid request headers');
    }

    // 检查文件上传（如果有）
    if (!this.checkFileUpload(request)) {
      throw new BadRequestException('Invalid file upload');
    }

    return true;
  }

  private checkIPWhitelist(request: Request): boolean {
    const clientIP = this.getClientIP(request);
    return this.securityService.isIPWhitelisted(clientIP);
  }

  private checkRequestSize(request: Request): boolean {
    const maxSize = this.configService.get('security.maxRequestSize', 10 * 1024 * 1024); // 10MB
    const contentLength = parseInt(request.headers['content-length'] || '0');
    return contentLength <= maxSize;
  }

  private checkRequestHeaders(request: Request): boolean {
    // 检查必要的请求头
    const userAgent = request.headers['user-agent'];
    if (!userAgent || userAgent.length < 5) {
      return false;
    }

    // 检查可疑的请求头
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-cluster-client-ip',
      'x-forwarded-server',
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers[header]) {
        // 记录可疑请求但不阻止
        console.warn(`Suspicious header detected: ${header}`);
      }
    }

    return true;
  }

  private checkFileUpload(request: Request): boolean {
    // 检查是否为文件上传请求
    const contentType = request.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return true; // 不是文件上传请求
    }

    // 这里可以添加更多文件上传验证逻辑
    // 例如：文件类型、文件大小等
    
    return true;
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      '127.0.0.1'
    );
  }
}