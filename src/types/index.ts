export interface User {
  id: string;
  phone?: string | null; // 可选，支持邮箱注册用户
  email?: string | null; // 邮箱登录
  createdAt: Date;
  updatedAt: Date;
}

export interface Baby {
  id: string;
  userId: string;
  name: string;
  birthDate: Date;
  gestationalWeeks: number;
  gestationalDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedingRecord {
  id: string;
  babyId: string;
  type: 'breast' | 'formula' | 'solid';
  amountOrDuration: string;
  timestamp: Date;
  notes?: string;
}

export interface SleepRecord {
  id: string;
  babyId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  timestamp: Date;
  notes?: string;
}

export interface Milestone {
  id: string;
  ageRangeMin: number;
  ageRangeMax: number;
  title: string;
  description: string;
  category: 'motor' | 'cognitive' | 'social' | 'language';
}

export interface BabyMilestone {
  id: string;
  babyId: string;
  milestoneId: string;
  achievedAt?: Date;
  correctedAgeAtAchievement?: number;
  createdAt: Date;
  milestone: Milestone;
}

export interface AgeInfo {
  actualAge: {
    months: number;
    days: number;
  };
  correctedAge: {
    months: number;
    days: number;
  };
  correctedAgeInDays: number;
}

export interface PersonalizedContent {
  title: string;
  content: string;
  actionItems: string[];
  tags: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
}

// ========== API Response Types ==========

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiSuccessResponse<T> extends ApiResponse {
  success: true;
  data?: T;
}

export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: ErrorCode;
  details?: Record<string, unknown>;
}

// Authentication API responses
export type AuthResponse = ApiSuccessResponse<{
  user: User;
  token: string;
}>;

export type UserProfileResponseData = ApiSuccessResponse<{
  user: User;
}>;

// Baby API responses
export type BabyResponse = ApiSuccessResponse<{
  baby: Baby;
}>;

export type BabiesListResponse = ApiSuccessResponse<{
  babies: Baby[];
}>;

// Records API responses
export type FeedingRecordResponse = ApiSuccessResponse<{
  record: FeedingRecord;
}>;

export type SleepRecordResponse = ApiSuccessResponse<{
  record: SleepRecord;
}>;

export type RecordsListResponse<T> = ApiSuccessResponse<{
  records: T[];
  total: number;
  page?: number;
  limit?: number;
}>;

// Milestones API responses
export type MilestonesResponse = ApiSuccessResponse<{
  milestones: BabyMilestone[];
}>;

export type MilestoneUpdateResponse = ApiSuccessResponse<{
  milestone: BabyMilestone;
}>;

// AI Content API responses
export type DailyContentResponse = ApiSuccessResponse<{
  content: PersonalizedContent;
}>;

export type MilestoneRecommendationResponse = ApiSuccessResponse<{
  recommendation: string;
}>;

// New API Response Types for Enhanced Endpoints

// Milestone Progress API responses
export type MilestoneProgressResponse = ApiSuccessResponse<{
  baby: {
    id: string;
    name: string;
    correctedAge: AgeInfo['correctedAge'];
    correctedAgeInDays: number;
  };
  progress: {
    overall: {
      percentage: number;
      completed: number;
      total: number;
      inProgress: number;
      upcoming: number;
      overdue: number;
    };
    byCategory: Array<{
      category: string;
      total: number;
      completed: number;
      percentage: number;
    }>;
    milestonesByStatus: {
      completed: BabyMilestone[];
      inProgress: BabyMilestone[];
      upcoming: BabyMilestone[];
      overdue: BabyMilestone[];
    };
    recentlyCompleted: BabyMilestone[];
    nextMilestones: BabyMilestone[];
  };
}>;

// Records Summary API responses
export type RecordsSummaryResponse = ApiSuccessResponse<{
  baby: { id: string; name: string };
  period: string;
  dateRange: { start: string; end: string };
  summary: {
    feeding: {
      totalSessions: number;
      averageAmount: number;
      commonType: FeedingType;
      lastFeedingTime: string;
    };
    sleep: {
      totalHours: number;
      averageDuration: number;
      sleepQuality: string;
      lastSleepTime: string;
    };
    milestones: {
      completed: number;
      total: number;
      recentAchievements: string[];
    };
    activityFrequency: {
      daily: number;
      weekly: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    healthIndicators: {
      feedingRegularity: 'good' | 'fair' | 'poor';
      sleepPattern: 'regular' | 'irregular';
      developmentProgress: 'on-track' | 'ahead' | 'behind';
    };
  };
  totals: { records: number; activities: number };
}>;

// Records Trends API responses
export type RecordsTrendsResponse = ApiSuccessResponse<{
  baby: { id: string; name: string };
  period: number;
  type: string;
  dateRange: { start: string; end: string };
  dailyStats: Array<{
    date: string;
    feeding: { count: number; totalAmount: number };
    sleep: { count: number; totalDuration: number };
    milestones: { count: number };
  }>;
  trends: {
    feeding: {
      direction: 'up' | 'down' | 'stable';
      percentage: number;
      insight: string;
    };
    sleep: {
      direction: 'up' | 'down' | 'stable';
      percentage: number;
      insight: string;
    };
  };
  summary: {
    totalRecords: number;
    averagePerDay: number;
    bestDay: string;
    improvementAreas: string[];
  };
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }>;
  };
  insights: {
    feedingPattern: string;
    sleepPattern: string;
    recommendations: string[];
  };
}>;

// Timeline API responses
export type TimelineResponse = ApiSuccessResponse<{
  baby: { id: string; name: string };
  timeline: Array<{
    id: string;
    type: 'feeding' | 'sleep' | 'milestone';
    subtype: string;
    timestamp: string;
    title: string;
    description: string;
    details: Record<string, string | number | boolean>;
    icon: string;
    priority: 'low' | 'normal' | 'high';
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: { date?: string; type: string };
  summary: {
    totalItems: number;
    feedingCount: number;
    sleepCount: number;
    milestoneCount: number;
  };
}>;

// User Profile API responses
export type UserProfileResponse = ApiSuccessResponse<{
  user: {
    id: string;
    phone?: string;
    email?: string;
    createdAt: string;
    updatedAt: string;
    hasPassword: boolean;
    authMethod: 'phone' | 'email';
  };
  babies: Array<{
    id: string;
    name: string;
    birthDate: string;
    gestationalWeeks: number;
    gestationalDays: number;
    createdAt: string;
  }>;
  statistics: {
    totalBabies: number;
    totalRecords: number;
    completedMilestones: number;
    memberSince: string;
  };
}>;

// Avatar Upload API responses
export type AvatarUploadResponse = ApiSuccessResponse<{
  avatarUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}>;

export type AvatarDeleteResponse = ApiSuccessResponse<{
  deletedFile: string;
  deletedAt: string;
}>;

// ========== Enhanced Data Types ==========

export interface FeedingRecordWithRelations extends FeedingRecord {
  baby: Baby;
}

export interface SleepRecordWithRelations extends SleepRecord {
  baby: Baby;
}

export interface BabyMilestoneWithRelations extends BabyMilestone {
  baby: Baby;
  milestone: Milestone;
}

// ========== Enums and Constants ==========

export const FEEDING_TYPES = ['breast', 'formula', 'solid'] as const;
export type FeedingType = typeof FEEDING_TYPES[number];

export const MILESTONE_CATEGORIES = ['motor', 'cognitive', 'social', 'language'] as const;
export type MilestoneCategory = typeof MILESTONE_CATEGORIES[number];

export const URGENCY_LEVELS = ['low', 'medium', 'high'] as const;
export type UrgencyLevel = typeof URGENCY_LEVELS[number];

export const AGE_CATEGORIES = [
  '0-2个月',
  '2-4个月', 
  '4-6个月',
  '6-9个月',
  '9-12个月',
  '12-18个月',
  '18-24个月'
] as const;
export type AgeCategory = typeof AGE_CATEGORIES[number];

// ========== Enhanced Business Logic Types ==========

export interface AgeCalculationInput {
  birthDate: Date;
  gestationalWeeks: number;
  gestationalDays: number;
  referenceDate?: Date;
}

export interface DetailedAgeInfo extends AgeInfo {
  prematureWeeks: number;
  prematureDays: number;
  ageCategory: AgeCategory;
  isFullTerm: boolean;
}

export interface FeedingSession {
  id: string;
  type: FeedingType;
  amount?: number; // for formula/solid foods (ml/g)
  duration?: number; // for breastfeeding (minutes)
  timestamp: Date;
  notes?: string;
  nutritionalValue?: {
    calories?: number;
    volume?: number;
  };
}

export interface SleepSession {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string;
  interruptionCount?: number;
}

export interface MilestoneProgress {
  milestoneId: string;
  title: string;
  category: MilestoneCategory;
  targetAgeRange: {
    minDays: number;
    maxDays: number;
  };
  isAchieved: boolean;
  achievedAt?: Date;
  correctedAgeAtAchievement?: number;
  progressNotes?: string;
  isOverdue: boolean;
}

export interface DevelopmentSummary {
  correctedAge: DetailedAgeInfo;
  totalMilestones: number;
  achievedMilestones: number;
  overdueMilestones: number;
  nextMilestones: MilestoneProgress[];
  developmentPercentile?: number;
  categoryProgress: Record<MilestoneCategory, {
    total: number;
    achieved: number;
    percentage: number;
  }>;
}

// ========== Form State Types ==========

export interface FeedingFormState {
  babyId: string;
  type: FeedingType;
  amountOrDuration: string;
  timestamp: string;
  notes: string;
  isSubmitting: boolean;
  errors: Partial<Record<keyof Omit<FeedingFormState, 'isSubmitting' | 'errors'>, string>>;
}

export interface SleepFormState {
  babyId: string;
  startTime: string;
  endTime: string;
  timestamp: string;
  notes: string;
  isSubmitting: boolean;
  errors: Partial<Record<keyof Omit<SleepFormState, 'isSubmitting' | 'errors'>, string>>;
}

export interface BabyProfileFormState {
  name: string;
  birthDate: string;
  gestationalWeeks: number;
  gestationalDays: number;
  isSubmitting: boolean;
  errors: Partial<Record<keyof Omit<BabyProfileFormState, 'isSubmitting' | 'errors'>, string>>;
}

// ========== Analytics and Insights Types ==========

export interface FeedingAnalytics {
  dailyAverage: number;
  weeklyTrend: 'increasing' | 'decreasing' | 'stable';
  lastFeedingTime: Date;
  timeBetweenFeedings: number; // in minutes
  mostCommonType: FeedingType;
  totalVolume24h?: number;
}

export interface SleepAnalytics {
  averageSleepDuration: number; // in minutes
  sleepEfficiency: number; // percentage
  lastSleepTime: Date;
  nightSleepDuration?: number;
  daySleepDuration?: number;
  sleepPattern: 'regular' | 'irregular';
}

export interface GrowthTrackingData {
  weight?: {
    value: number;
    unit: 'kg' | 'g';
    percentile?: number;
    recordDate: Date;
  };
  height?: {
    value: number;
    unit: 'cm';
    percentile?: number;
    recordDate: Date;
  };
  headCircumference?: {
    value: number;
    unit: 'cm';
    percentile?: number;
    recordDate: Date;
  };
}

// ========== Authentication & Session Types ==========

export const AUTH_METHODS = ['phone', 'email'] as const;
export type AuthMethod = typeof AUTH_METHODS[number];

export interface AuthSession {
  userId: string;
  method: AuthMethod;
  issuedAt: number;
  expiresAt: number;
  deviceId?: string;
  lastActivity: number;
}

export interface UserWithAuth extends User {
  authMethod: AuthMethod;
  isVerified: boolean;
  lastLoginAt?: Date;
  deviceTokens?: string[]; // for push notifications
}

export interface LoginCredentials {
  phone?: string;
  email?: string;
  password?: string;
  verificationCode?: string;
}

export interface RegistrationData extends LoginCredentials {
  confirmPassword?: string;
  acceptTerms: boolean;
}

export interface VerificationRequest {
  target: string; // phone or email
  type: 'login' | 'register' | 'password_reset';
  code?: string;
}

export interface TokenPayload {
  userId: string;
  method: AuthMethod;
  iat: number;
  exp: number;
}

// ========== Error Types ==========

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
}

export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_PERIOD: 'INVALID_PERIOD',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  
  // Business logic errors
  BABY_NOT_FOUND: 'BABY_NOT_FOUND',
  MILESTONE_NOT_FOUND: 'MILESTONE_NOT_FOUND',
  MILESTONE_NOT_COMPLETED: 'MILESTONE_NOT_COMPLETED',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Data conflicts
  DUPLICATE_CREDENTIALS: 'DUPLICATE_CREDENTIALS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONFLICT: 'CONFLICT',
  REFERENCE_NOT_FOUND: 'REFERENCE_NOT_FOUND',
  
  // File operations
  NO_FILE_PROVIDED: 'NO_FILE_PROVIDED',
  FILE_SAVE_ERROR: 'FILE_SAVE_ERROR',
  FILE_DELETE_ERROR: 'FILE_DELETE_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  MISSING_FILENAME: 'MISSING_FILENAME',
  
  // User profile
  NO_PASSWORD_SET: 'NO_PASSWORD_SET',
  INVALID_CURRENT_PASSWORD: 'INVALID_CURRENT_PASSWORD',
  NO_UPDATE_DATA: 'NO_UPDATE_DATA',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ========== Context Types ==========

export interface AuthContextValue {
  user: UserWithAuth | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export interface BabyContextValue {
  currentBaby: Baby | null;
  babies: Baby[];
  isLoading: boolean;
  createBaby: (data: BabyProfileFormState) => Promise<Baby>;
  updateBaby: (id: string, data: Partial<Baby>) => Promise<Baby>;
  deleteBaby: (id: string) => Promise<void>;
  switchBaby: (babyId: string) => void;
}

// ========== Utility Types ==========

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type CreateType<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateType<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

export type FeedingRecordCreate = CreateType<FeedingRecord>;
export type FeedingRecordUpdate = UpdateType<FeedingRecord>;

export type SleepRecordCreate = CreateType<SleepRecord>;
export type SleepRecordUpdate = UpdateType<SleepRecord>;

export type BabyCreate = CreateType<Baby>;
export type BabyUpdate = UpdateType<Baby>;

// ========== Component Props Types ==========

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
  }>;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}