import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 检查是否需要压缩
    if (this.shouldCompress(req, res)) {
      // 设置压缩相关的响应头
      const acceptEncoding = req.headers['accept-encoding'] as string;
      
      if (acceptEncoding && acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
      }
    }
    
    next();
  }

  private shouldCompress(req: Request, res: Response): boolean {
    // 如果客户端明确表示不接受压缩，则不压缩
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // 检查Content-Type
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      // 压缩文本类型的内容
      return /text|json|javascript|css|xml|svg/.test(contentType);
    }
    
    return false;
  }
}