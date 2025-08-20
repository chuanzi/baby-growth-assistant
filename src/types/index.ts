export interface User {
  id: string;
  phone: string;
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
  timestamp: Date;
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