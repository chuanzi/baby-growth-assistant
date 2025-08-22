export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          password: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          phone?: string | null
          email?: string | null
          password: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          password?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Baby: {
        Row: {
          id: string
          userId: string
          name: string
          birthDate: string
          gestationalWeeks: number
          gestationalDays: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId: string
          name: string
          birthDate: string
          gestationalWeeks: number
          gestationalDays?: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          name?: string
          birthDate?: string
          gestationalWeeks?: number
          gestationalDays?: number
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Baby_userId_fkey"
            columns: ["userId"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      FeedingRecord: {
        Row: {
          id: string
          babyId: string
          type: string
          amountOrDuration: string
          timestamp: string
          notes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          babyId: string
          type: string
          amountOrDuration: string
          timestamp?: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          babyId?: string
          type?: string
          amountOrDuration?: string
          timestamp?: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "FeedingRecord_babyId_fkey"
            columns: ["babyId"]
            referencedRelation: "Baby"
            referencedColumns: ["id"]
          }
        ]
      }
      SleepRecord: {
        Row: {
          id: string
          babyId: string
          startTime: string
          endTime: string
          timestamp: string
          notes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          babyId: string
          startTime: string
          endTime: string
          timestamp?: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          babyId?: string
          startTime?: string
          endTime?: string
          timestamp?: string
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "SleepRecord_babyId_fkey"
            columns: ["babyId"]
            referencedRelation: "Baby"
            referencedColumns: ["id"]
          }
        ]
      }
      Milestone: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          minAgeWeeks: number
          maxAgeWeeks: number | null
          correctedAge: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          minAgeWeeks: number
          maxAgeWeeks?: number | null
          correctedAge?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          minAgeWeeks?: number
          maxAgeWeeks?: number | null
          correctedAge?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      BabyMilestone: {
        Row: {
          id: string
          babyId: string
          milestoneId: string
          completed: boolean
          completedAt: string | null
          notes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          babyId: string
          milestoneId: string
          completed?: boolean
          completedAt?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          babyId?: string
          milestoneId?: string
          completed?: boolean
          completedAt?: string | null
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "BabyMilestone_babyId_fkey"
            columns: ["babyId"]
            referencedRelation: "Baby"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BabyMilestone_milestoneId_fkey"
            columns: ["milestoneId"]
            referencedRelation: "Milestone"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}