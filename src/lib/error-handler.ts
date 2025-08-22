import { z } from 'zod';

// Error types and interfaces
export interface AppError extends Error {
  code: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
  }
}

export class NetworkError extends Error implements AppError {
  code = 'NETWORK_ERROR';
  statusCode = 0;
  context?: Record<string, unknown>;

  constructor(message: string = '网络连接失败，请检查网络设置', context?: Record<string, unknown>) {
    super(message);
    this.name = 'NetworkError';
    this.context = context;
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
  context?: Record<string, unknown>;

  constructor(message: string = '登录已过期，请重新登录', context?: Record<string, unknown>) {
    super(message);
    this.name = 'AuthenticationError';
    this.context = context;
  }
}

export class ServerError extends Error implements AppError {
  code = 'SERVER_ERROR';
  statusCode = 500;
  context?: Record<string, unknown>;

  constructor(message: string = '服务器暂时不可用，请稍后重试', context?: Record<string, unknown>) {
    super(message);
    this.name = 'ServerError';
    this.context = context;
  }
}

// Error handler utility functions
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '发生了未知错误';
}

export function getErrorDetails(error: unknown): AppError {
  if (error instanceof ValidationError || 
      error instanceof NetworkError || 
      error instanceof AuthenticationError || 
      error instanceof ServerError) {
    return error;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message);
    }
    
    // Validation errors (from zod or form validation)
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return new ValidationError(
        `${firstError.path.join('.')}: ${firstError.message}`,
        { zodError: error.errors }
      );
    }

    // Generic error
    return new ServerError(error.message);
  }

  return new ServerError();
}

export function handleApiError(response: Response): never {
  if (response.status === 401) {
    throw new AuthenticationError();
  }
  if (response.status === 400) {
    throw new ValidationError('请求参数错误');
  }
  if (response.status === 404) {
    throw new ServerError('请求的资源不存在');
  }
  if (response.status >= 500) {
    throw new ServerError();
  }
  throw new NetworkError(`请求失败 (${response.status})`);
}

// Retry utility for network requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry validation or authentication errors
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (i === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError;
}

// Form error handling
export function getFormErrorMessage(fieldName: string, errors: Record<string, string>): string | undefined {
  return errors[fieldName];
}

export function setFormError(
  errors: Record<string, string>,
  setErrors: (errors: Record<string, string>) => void,
  fieldName: string,
  message: string
): void {
  setErrors({
    ...errors,
    [fieldName]: message
  });
}

export function clearFormError(
  errors: Record<string, string>,
  setErrors: (errors: Record<string, string>) => void,
  fieldName: string
): void {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  setErrors(newErrors);
}

// Global error reporting (could integrate with error tracking service)
export function reportError(error: AppError, context?: Record<string, unknown>): void {
  const errorReport = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    context: { ...error.context, ...context },
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', errorReport);
  }

  // In production, send to error tracking service
  // Example: Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTrackingService(errorReport);
  }
}

// User-friendly error messages mapping
export const USER_ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接不稳定，请检查网络后重试',
  AUTHENTICATION_ERROR: '登录已过期，请重新登录',
  VALIDATION_ERROR: '输入信息有误，请检查后重试',
  SERVER_ERROR: '服务暂时不可用，请稍后重试',
  BABY_NOT_FOUND: '找不到宝宝信息，请确认宝宝档案是否存在',
  MILESTONE_NOT_FOUND: '找不到该里程碑信息',
  RECORD_NOT_FOUND: '找不到该记录',
  RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试',
  UNKNOWN_ERROR: '发生了意外错误，请重试'
} as const;

export function getUserFriendlyMessage(error: AppError): string {
  return USER_ERROR_MESSAGES[error.code as keyof typeof USER_ERROR_MESSAGES] || error.message || USER_ERROR_MESSAGES.UNKNOWN_ERROR;
}