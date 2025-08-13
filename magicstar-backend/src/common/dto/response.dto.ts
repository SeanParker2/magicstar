import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T = any> {
  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiProperty({ description: '响应消息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '时间戳', example: 1640995200000 })
  timestamp: number;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.timestamp = Date.now();
  }

  static success<T>(data?: T, message = '操作成功'): ResponseDto<T> {
    return new ResponseDto(200, message, data);
  }

  static error(code = 500, message = '操作失败'): ResponseDto {
    return new ResponseDto(code, message);
  }
}

export class PaginationDto {
  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit: number;

  @ApiProperty({ description: '总数量', example: 100 })
  total: number;

  @ApiProperty({ description: '总页数', example: 10 })
  totalPages: number;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class PaginatedResponseDto<T> extends ResponseDto<T[]> {
  @ApiProperty({ description: '分页信息' })
  pagination: PaginationDto;

  constructor(
    data: T[],
    pagination: PaginationDto,
    message = '查询成功',
  ) {
    super(200, message, data);
    this.pagination = pagination;
  }
}