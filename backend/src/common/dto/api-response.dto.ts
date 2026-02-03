/**
 * 统一 API 响应格式
 */
export class ApiResponse<T = unknown> {
  /**
   * 状态码
   * 200: 成功
   * 其他: 对应 HTTP 状态码
   */
  code: number;

  /**
   * 响应消息
   */
  message: string;

  /**
   * 响应数据
   */
  data: T | null;

  /**
   * 时间戳
   */
  timestamp: string;
}

/**
 * 分页响应数据
 */
export class PaginatedData<T> {
  /**
   * 数据列表
   */
  items: T[];

  /**
   * 总数量
   */
  total: number;

  /**
   * 当前页码
   */
  page: number;

  /**
   * 每页数量
   */
  pageSize: number;

  /**
   * 总页数
   */
  totalPages: number;
}

/**
 * 分页查询参数
 */
export class PaginationDto {
  /**
   * 页码，从1开始
   */
  page?: number = 1;

  /**
   * 每页数量
   */
  pageSize?: number = 10;
}
