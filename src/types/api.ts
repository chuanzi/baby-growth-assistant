/**
 * API Types and Schemas
 * 
 * This file contains all API-related types, request/response schemas,
 * and type-safe API client definitions.
 */

import type {
  User,
  Baby,
  FeedingRecord,
  SleepRecord,
  BabyMilestone,
  PersonalizedContent,
  AuthMethod,
  ErrorCode,
} from './index';

// ========== Base API Types ==========

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ========== Authentication API ==========

export namespace AuthAPI {
  export interface SendCodeRequest {
    target: string; // phone or email
    type: 'login' | 'register';
  }

  export interface SendCodeResponse {
    success: boolean;
    message: string;
    expiresIn: number; // seconds
    rateLimitReset?: number; // timestamp
  }

  export interface LoginRequest {
    method: AuthMethod;
    phone?: string;
    email?: string;
    password?: string;
    verificationCode?: string;
  }

  export interface LoginResponse {
    user: User;
    token: string;
    expiresAt: string;
    refreshToken?: string;
  }

  export interface RegisterRequest {
    method: AuthMethod;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    verificationCode?: string;
  }

  export interface RegisterResponse {
    user: User;
    token: string;
    expiresAt: string;
  }

  export interface LogoutRequest {
    everywhere?: boolean; // logout from all devices
  }

  export interface LogoutResponse {
    message: string;
  }

  export interface RefreshTokenRequest {
    refreshToken: string;
  }

  export interface RefreshTokenResponse {
    token: string;
    expiresAt: string;
    refreshToken: string;
  }

  export interface UserProfileResponse {
    user: User & {
      authMethod: AuthMethod;
      isVerified: boolean;
      lastLoginAt: string;
    };
  }
}

// ========== Baby Management API ==========

export namespace BabyAPI {
  export interface CreateBabyRequest {
    name: string;
    birthDate: string; // ISO date string
    gestationalWeeks: number;
    gestationalDays: number;
  }

  export interface CreateBabyResponse {
    baby: Baby;
    message: string;
  }

  export interface UpdateBabyRequest {
    name?: string;
    birthDate?: string;
    gestationalWeeks?: number;
    gestationalDays?: number;
  }

  export interface UpdateBabyResponse {
    baby: Baby;
    message: string;
  }

  export interface GetBabiesResponse {
    babies: Baby[];
  }

  export interface GetBabyResponse {
    baby: Baby;
  }

  export interface DeleteBabyResponse {
    message: string;
  }
}

// ========== Records API ==========

export namespace RecordsAPI {
  export interface CreateFeedingRecordRequest {
    babyId: string;
    type: 'breast' | 'formula' | 'solid';
    amountOrDuration: string;
    timestamp?: string;
    notes?: string;
  }

  export interface CreateFeedingRecordResponse {
    record: FeedingRecord;
    message: string;
  }

  export interface CreateSleepRecordRequest {
    babyId: string;
    startTime: string;
    endTime: string;
    timestamp?: string;
    notes?: string;
  }

  export interface CreateSleepRecordResponse {
    record: SleepRecord;
    message: string;
  }

  export interface GetRecordsRequest extends PaginatedRequest {
    babyId: string;
    type?: 'feeding' | 'sleep';
    startDate?: string;
    endDate?: string;
  }

  export interface GetFeedingRecordsResponse {
    records: FeedingRecord[];
    total: number;
    analytics?: {
      dailyAverage: number;
      weeklyTrend: 'increasing' | 'decreasing' | 'stable';
      mostCommonType: 'breast' | 'formula' | 'solid';
    };
  }

  export interface GetSleepRecordsResponse {
    records: SleepRecord[];
    total: number;
    analytics?: {
      averageDuration: number; // minutes
      sleepEfficiency: number; // percentage
      sleepPattern: 'regular' | 'irregular';
    };
  }

  export interface UpdateRecordRequest {
    amountOrDuration?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  }

  export interface DeleteRecordResponse {
    message: string;
  }
}

// ========== Milestones API ==========

export namespace MilestonesAPI {
  export interface GetMilestonesRequest {
    babyId: string;
    category?: 'motor' | 'cognitive' | 'social' | 'language';
    achieved?: boolean;
    ageRange?: {
      min: number;
      max: number;
    };
  }

  export interface GetMilestonesResponse {
    milestones: BabyMilestone[];
    summary: {
      total: number;
      achieved: number;
      overdue: number;
      upcoming: number;
    };
  }

  export interface UpdateMilestoneRequest {
    achieved: boolean;
    achievedAt?: string;
    notes?: string;
  }

  export interface UpdateMilestoneResponse {
    milestone: BabyMilestone;
    message: string;
  }

  export interface GetMilestoneRecommendationsRequest {
    babyId: string;
    category?: 'motor' | 'cognitive' | 'social' | 'language';
  }

  export interface GetMilestoneRecommendationsResponse {
    recommendations: Array<{
      milestoneId: string;
      title: string;
      category: string;
      priority: 'high' | 'medium' | 'low';
      activities: string[];
      expectedAge: number; // days
    }>;
  }
}

// ========== AI Content API ==========

export namespace AIAPI {
  export interface GenerateDailyContentRequest {
    babyId: string;
    includeAnalytics?: boolean;
  }

  export interface GenerateDailyContentResponse {
    content: PersonalizedContent;
    generatedAt: string;
    metadata: {
      correctedAge: number; // days
      ageCategory: string;
      dataPoints: number; // number of records used
    };
  }

  export interface GenerateMilestoneRecommendationRequest {
    babyId: string;
    focus?: 'motor' | 'cognitive' | 'social' | 'language';
  }

  export interface GenerateMilestoneRecommendationResponse {
    recommendation: string;
    activities: string[];
    priority: 'high' | 'medium' | 'low';
    estimatedDuration: string; // e.g., "2-3 weeks"
  }
}

// ========== Analytics API ==========

export namespace AnalyticsAPI {
  export interface GetDashboardDataRequest {
    babyId: string;
    period?: 'day' | 'week' | 'month';
  }

  export interface GetDashboardDataResponse {
    baby: Baby;
    ageInfo: {
      actualAge: { months: number; days: number };
      correctedAge: { months: number; days: number };
      correctedAgeInDays: number;
    };
    recentFeeding: FeedingRecord[];
    recentSleep: SleepRecord[];
    milestoneProgress: {
      total: number;
      achieved: number;
      percentage: number;
    };
    insights: {
      feedingPattern: string;
      sleepPattern: string;
      developmentStatus: string;
    };
  }

  export interface GetTrendsRequest {
    babyId: string;
    metric: 'feeding' | 'sleep' | 'milestones';
    period: 'week' | 'month' | 'quarter';
  }

  export interface GetTrendsResponse {
    data: Array<{
      date: string;
      value: number;
      label?: string;
    }>;
    trend: 'improving' | 'stable' | 'declining';
    insights: string[];
  }
}

// ========== Error Response Types ==========

export interface ValidationErrorResponse {
  success: false;
  error: 'VALIDATION_ERROR';
  details: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

export interface AuthErrorResponse {
  success: false;
  error: ErrorCode;
  message: string;
  details?: {
    remainingAttempts?: number;
    lockoutDuration?: number;
    nextAttemptAt?: string;
  };
}

export interface NotFoundErrorResponse {
  success: false;
  error: 'NOT_FOUND';
  message: string;
  resource: string;
  resourceId?: string;
}

export interface RateLimitErrorResponse {
  success: false;
  error: 'RATE_LIMIT_EXCEEDED';
  message: string;
  details: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}

// ========== API Client Types ==========

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint<TRequest = void, TResponse = unknown> {
  method: ApiMethod;
  path: string;
  requestSchema?: (data: TRequest) => boolean;
  responseSchema?: (data: unknown) => data is TResponse;
}

// ========== Type Helpers ==========

export type ApiRequestType<T> = T extends ApiEndpoint<infer R, unknown> ? R : never;
export type ApiResponseType<T> = T extends ApiEndpoint<unknown, infer R> ? R : never;

export type WithPagination<T> = T & PaginatedRequest;
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;

// ========== Status Types ==========

export const API_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type ApiStatus = typeof API_STATUS[keyof typeof API_STATUS];

export interface ApiState<T = unknown> {
  status: ApiStatus;
  data: T | null;
  error: string | null;
  lastFetch: number | null;
}