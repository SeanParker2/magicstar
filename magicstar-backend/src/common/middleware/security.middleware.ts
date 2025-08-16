import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 移除敏感的服务器信息
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // 添加安全响应头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // 检查User-Agent（防止简单的爬虫）
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length < 10) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid User-Agent',
      });
    }

    // 检查可疑的请求头
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
    for (const header of suspiciousHeaders) {
      const value = req.get(header);
      if (value && this.isSuspiciousIP(value)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }
    }

    // 检查请求方法
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'HTTP method not allowed',
      });
    }

    // 检查Content-Type（对于POST/PUT/PATCH请求）
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (contentType && !this.isAllowedContentType(contentType)) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          message: 'Content-Type not supported',
        });
      }
    }

    next();
  }

  private isSuspiciousIP(ip: string): boolean {
    // 检查是否为内网IP或可疑IP
    const suspiciousPatterns = [
      /^127\./, // localhost
      /^10\./, // 私有网络
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 私有网络
      /^192\.168\./, // 私有网络
      /^169\.254\./, // 链路本地地址
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ip));
  }

  private isAllowedContentType(contentType: string): boolean {
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ];

    return allowedTypes.some(type => contentType.toLowerCase().includes(type));
  }
}