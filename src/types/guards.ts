/**
 * Type Guards and Utility Functions for Type Safety
 * 
 * This file contains type guards, type predicates, and utility functions
 * that help ensure type safety throughout the application.
 */

import type {
  User,
  Baby,
  FeedingRecord,
  SleepRecord,
  Milestone,
  BabyMilestone,
  FeedingType,
  MilestoneCategory,
  AuthMethod,
  ErrorCode,
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  FEEDING_TYPES,
  MILESTONE_CATEGORIES,
  AUTH_METHODS,
  ERROR_CODES,
} from './index';

// ========== Type Guards ==========

/**
 * Checks if a value is a valid FeedingType
 */
export function isFeedingType(value: unknown): value is FeedingType {
  return typeof value === 'string' && FEEDING_TYPES.includes(value as FeedingType);
}

/**
 * Checks if a value is a valid MilestoneCategory
 */
export function isMilestoneCategory(value: unknown): value is MilestoneCategory {
  return typeof value === 'string' && MILESTONE_CATEGORIES.includes(value as MilestoneCategory);
}

/**
 * Checks if a value is a valid AuthMethod
 */
export function isAuthMethod(value: unknown): value is AuthMethod {
  return typeof value === 'string' && AUTH_METHODS.includes(value as AuthMethod);
}

/**
 * Checks if a value is a valid ErrorCode
 */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.values(ERROR_CODES).includes(value as ErrorCode);
}

/**
 * Type guard for User objects
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    typeof (obj as User).id === 'string' &&
    (obj as User).createdAt instanceof Date &&
    (obj as User).updatedAt instanceof Date
  );
}

/**
 * Type guard for Baby objects
 */
export function isBaby(obj: unknown): obj is Baby {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'userId' in obj &&
    'name' in obj &&
    'birthDate' in obj &&
    'gestationalWeeks' in obj &&
    'gestationalDays' in obj &&
    typeof (obj as Baby).id === 'string' &&
    typeof (obj as Baby).userId === 'string' &&
    typeof (obj as Baby).name === 'string' &&
    (obj as Baby).birthDate instanceof Date &&
    typeof (obj as Baby).gestationalWeeks === 'number' &&
    typeof (obj as Baby).gestationalDays === 'number'
  );
}

/**
 * Type guard for FeedingRecord objects
 */
export function isFeedingRecord(obj: unknown): obj is FeedingRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'babyId' in obj &&
    'type' in obj &&
    'amountOrDuration' in obj &&
    'timestamp' in obj &&
    typeof (obj as FeedingRecord).id === 'string' &&
    typeof (obj as FeedingRecord).babyId === 'string' &&
    isFeedingType((obj as FeedingRecord).type) &&
    typeof (obj as FeedingRecord).amountOrDuration === 'string' &&
    (obj as FeedingRecord).timestamp instanceof Date
  );
}

/**
 * Type guard for SleepRecord objects
 */
export function isSleepRecord(obj: unknown): obj is SleepRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'babyId' in obj &&
    'startTime' in obj &&
    'endTime' in obj &&
    'durationMinutes' in obj &&
    'timestamp' in obj &&
    typeof (obj as SleepRecord).id === 'string' &&
    typeof (obj as SleepRecord).babyId === 'string' &&
    (obj as SleepRecord).startTime instanceof Date &&
    (obj as SleepRecord).endTime instanceof Date &&
    typeof (obj as SleepRecord).durationMinutes === 'number' &&
    (obj as SleepRecord).timestamp instanceof Date
  );
}

/**
 * Type guard for API success responses
 */
export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for API error responses
 */
export function isApiErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false;
}

// ========== Validation Utilities ==========

/**
 * Validates that a string is not empty
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Validates that a value is a non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}

/**
 * Validates that a date is in the past
 */
export function isPastDate(date: unknown): date is Date {
  return date instanceof Date && date < new Date();
}

/**
 * Validates that a date is valid
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates phone number format (Chinese mobile numbers)
 */
export function isValidPhoneNumber(phone: unknown): phone is string {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return typeof phone === 'string' && phoneRegex.test(phone);
}

/**
 * Validates email format
 */
export function isValidEmail(email: unknown): email is string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
}

/**
 * Validates gestational weeks (20-44 weeks)
 */
export function isValidGestationalWeeks(weeks: unknown): weeks is number {
  return typeof weeks === 'number' && weeks >= 20 && weeks <= 44;
}

/**
 * Validates gestational days (0-6 days)
 */
export function isValidGestationalDays(days: unknown): days is number {
  return typeof days === 'number' && days >= 0 && days <= 6;
}

// ========== Safe Type Conversion ==========

/**
 * Safely converts a value to a number
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Safely converts a value to a Date
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  return null;
}

/**
 * Safely converts a value to a string
 */
export function toString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

// ========== Error Handling Utilities ==========

/**
 * Creates a type-safe error object
 */
export function createError(code: ErrorCode, message: string, details?: Record<string, unknown>) {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks if an error has a specific error code
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

/**
 * Extracts error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return toString(error.message);
  }
  return '发生未知错误';
}

// ========== Array Utilities ==========

/**
 * Type-safe array filter that removes undefined/null values
 */
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item != null);
}

/**
 * Groups array items by a key
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = toString(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Type-safe array sorting
 */
export function sortBy<T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}