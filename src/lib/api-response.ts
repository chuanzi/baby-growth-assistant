import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiErrorResponse, ApiSuccessResponse, ErrorCode } from '@/types';

/**
 * 标准化API响应工具类
 */
export class ApiResponse {
  /**
   * 成功响应
   */
  static success<T>(data?: T, message?: string, status: number = 200): NextResponse {
    const response: ApiSuccessResponse<T> = {
      success: true,
      message,
      data,
    };
    
    return NextResponse.json(response, { status });
  }

  /**
   * 错误响应
   */
  static error(
    error: string,
    code: ErrorCode,
    status: number = 500,
    details?: Record<string, unknown>
  ): NextResponse {
    const response: ApiErrorResponse = {
      success: false,
      error,
      code,
      details,
    };
    
    // 记录错误日志（生产环境中可以发送到日志服务）
    if (status >= 500) {
      console.error('API Error:', { error, code, status, details });
    }
    
    return NextResponse.json(response, { status });
  }

  /**
   * 验证错误响应
   */
  static validationError(zodError: ZodError): NextResponse {
    const firstIssue = zodError.issues[0];
    return this.error(
      firstIssue?.message || '参数验证失败',
      'VALIDATION_ERROR',
      400,
      { issues: zodError.issues }
    );
  }

  /**
   * 未授权响应
   */
  static unauthorized(message: string = '请先登录'): NextResponse {
    return this.error(message, 'UNAUTHORIZED', 401);
  }

  /**
   * 权限不足响应
   */
  static forbidden(message: string = '权限不足'): NextResponse {
    return this.error(message, 'FORBIDDEN', 403);
  }

  /**
   * 资源不存在响应
   */
  static notFound(resource: string = '资源'): NextResponse {
    return this.error(`${resource}不存在`, 'NOT_FOUND', 404);
  }

  /**
   * 冲突响应（如资源重复）
   */
  static conflict(message: string): NextResponse {
    return this.error(message, 'CONFLICT', 409);
  }

  /**
   * 请求过于频繁响应
   */
  static tooManyRequests(message: string = '请求过于频繁，请稍后重试'): NextResponse {
    return this.error(message, 'RATE_LIMIT_EXCEEDED', 429);
  }

  /**
   * 分页数据响应
   */
  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): NextResponse {
    return this.success({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    }, message);
  }
}

/**
 * 错误处理中间件包装器
 * 用于统一处理API路由中的异常
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Handler Error:', error);

      // Zod验证错误
      if (error instanceof ZodError) {
        return ApiResponse.validationError(error);
      }

      // 认证错误
      if (error instanceof Error && error.message === 'Unauthorized') {
        return ApiResponse.unauthorized();
      }

      // 权限错误
      if (error instanceof Error && error.message === 'Forbidden') {
        return ApiResponse.forbidden();
      }

      // 其他错误
      return ApiResponse.error(
        '服务器内部错误，请稍后重试',
        'INTERNAL_ERROR',
        500
      );
    }
  };
}

/**
 * 验证请求参数的装饰器
 */
export function validateParams<T>(
  schema: { parse: (data: unknown) => T },
  dataExtractor: (request: Request) => Promise<unknown> | unknown
) {
  return function <F extends (validated: T, ...args: unknown[]) => Promise<NextResponse>>(
    handler: F
  ) {
    return async (request: Request, ...args: unknown[]): Promise<NextResponse> => {
      try {
        const rawData = await dataExtractor(request);
        const validatedData = schema.parse(rawData);
        return await handler(validatedData, ...args);
      } catch (error) {
        if (error instanceof ZodError) {
          return ApiResponse.validationError(error);
        }
        throw error;
      }
    };
  };
}

/**
 * 业务逻辑错误类
 * 用于在业务逻辑中抛出特定的业务错误
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BusinessError';
  }

  toResponse(): NextResponse {
    return ApiResponse.error(this.message, this.code, this.statusCode, this.details);
  }
}

/**
 * 常用的业务错误
 */
export const BusinessErrors = {
  BabyNotFound: () => new BusinessError('找不到宝宝档案', 'BABY_NOT_FOUND', 404),
  MilestoneNotFound: () => new BusinessError('找不到指定的里程碑', 'MILESTONE_NOT_FOUND', 404),
  RecordNotFound: () => new BusinessError('找不到指定的记录', 'RECORD_NOT_FOUND', 404),
  UserNotFound: () => new BusinessError('用户不存在', 'USER_NOT_FOUND', 404),
  InvalidCredentials: () => new BusinessError('用户名或密码错误', 'INVALID_CREDENTIALS', 401),
  DuplicateCredentials: (field: string) => new BusinessError(`${field}已被使用`, 'DUPLICATE_CREDENTIALS', 409),
  PermissionDenied: (action?: string) => new BusinessError(
    action ? `无权限执行${action}` : '权限不足', 
    'PERMISSION_DENIED', 
    403
  ),
} as const;

/**
 * 请求限流错误
 */
export class RateLimitError extends Error {
  constructor(
    message: string = '请求过于频繁，请稍后重试',
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }

  toResponse(): NextResponse {
    const headers: Record<string, string> = {};
    if (this.retryAfter) {
      headers['Retry-After'] = this.retryAfter.toString();
    }

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: this.message,
        code: 'RATE_LIMIT_EXCEEDED',
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        }
      }
    );
  }
}

/**
 * 异步操作的统一错误处理
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = '操作失败'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    if (error instanceof BusinessError || error instanceof RateLimitError) {
      throw error;
    }

    if (error instanceof ZodError) {
      throw error;
    }

    // 数据库错误处理
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new BusinessError('数据重复', 'DUPLICATE_ENTRY', 409);
    }

    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      throw new BusinessError('关联数据不存在', 'REFERENCE_NOT_FOUND', 400);
    }

    // 其他错误
    throw new BusinessError(errorMessage, 'INTERNAL_ERROR', 500);
  }
}