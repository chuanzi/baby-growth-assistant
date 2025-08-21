/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// 演示用内存数据库
// 仅用于Vercel部署演示，生产环境应使用真实数据库

interface User {
  id: string;
  phone?: string;
  email?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Baby {
  id: string;
  userId: string;
  name: string;
  birthDate: Date;
  gestationalWeeks: number;
  gestationalDays: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FeedingRecord {
  id: string;
  babyId: string;
  type: string;
  amountOrDuration: string;
  timestamp: Date;
  notes?: string;
}

interface SleepRecord {
  id: string;
  babyId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  timestamp: Date;
  notes?: string;
}

interface BabyMilestone {
  id: string;
  babyId: string;
  milestoneId: string;
  achievedAt?: Date;
  correctedAgeAtAchievement?: number;
  createdAt: Date;
}

interface Milestone {
  id: string;
  ageRangeMin: number;
  ageRangeMax: number;
  title: string;
  description: string;
  category: string;
}

// 内存存储
const memoryStore = {
  users: new Map<string, User>(),
  babies: new Map<string, Baby>(),
  feedingRecords: new Map<string, FeedingRecord>(),
  sleepRecords: new Map<string, SleepRecord>(),
  milestones: new Map<string, Milestone>(),
  babyMilestones: new Map<string, BabyMilestone>(),
  verificationCodes: new Map<string, { code: string; expiresAt: Date }>(),
};

// 生成ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 初始化里程碑数据
function initializeMilestones() {
  if (memoryStore.milestones.size > 0) return;

  const milestones = [
    { ageRangeMin: 0, ageRangeMax: 30, title: '抬头', description: '宝宝能够短暂抬起头部', category: 'motor' },
    { ageRangeMin: 30, ageRangeMax: 60, title: '微笑', description: '宝宝开始对人微笑', category: 'social' },
    { ageRangeMin: 60, ageRangeMax: 90, title: '翻身', description: '宝宝能够从仰卧翻到俯卧', category: 'motor' },
    { ageRangeMin: 90, ageRangeMax: 120, title: '坐立', description: '宝宝能够独立坐着', category: 'motor' },
    { ageRangeMin: 30, ageRangeMax: 90, title: '咿呀学语', description: '宝宝开始发出各种声音', category: 'language' },
    { ageRangeMin: 60, ageRangeMax: 120, title: '认识熟人', description: '宝宝能够识别熟悉的面孔', category: 'cognitive' },
  ];

  milestones.forEach((milestone) => {
    const id = generateId();
    memoryStore.milestones.set(id, {
      id,
      ...milestone,
    });
  });
}

// 演示数据库操作
export const demoDb = {
  // 初始化
  init() {
    initializeMilestones();
  },

  // 用户操作
  user: {
    async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
      const id = generateId();
      const now = new Date();
      const user: User = {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.users.set(id, user);
      return user;
    },

    async findUnique(where: { phone?: string; email?: string }, include?: { babies?: boolean }) {
      for (const [_, user] of memoryStore.users) {
        if ((where.phone && user.phone === where.phone) || 
            (where.email && user.email && user.email.toLowerCase() === where.email.toLowerCase())) {
          
          if (include?.babies) {
            const babies = Array.from(memoryStore.babies.values())
              .filter(baby => baby.userId === user.id);
            return { ...user, babies };
          }
          return user;
        }
      }
      return null;
    },

    async findFirst(where: { id: string }) {
      return memoryStore.users.get(where.id) || null;
    },
  },

  // 宝宝操作
  baby: {
    async create(data: Omit<Baby, 'id' | 'createdAt' | 'updatedAt'>) {
      const id = generateId();
      const now = new Date();
      const baby: Baby = {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.babies.set(id, baby);
      return baby;
    },

    async findFirst(where: { id: string; userId: string }, include?: unknown) {
      const baby = memoryStore.babies.get(where.id);
      if (!baby || baby.userId !== where.userId) return null;
      
      // 如果需要包含关联数据
      if (include) {
        const result: Record<string, unknown> = { ...baby };
        
        if ((include as Record<string, unknown>).feedingRecords) {
          result.feedingRecords = Array.from(memoryStore.feedingRecords.values())
            .filter(r => r.babyId === baby.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, (include as any).feedingRecords?.take || 10);
        }
        
        if ((include as any).sleepRecords) {
          result.sleepRecords = Array.from(memoryStore.sleepRecords.values())
            .filter(r => r.babyId === baby.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, (include as any).sleepRecords?.take || 10);
        }
        
        if ((include as any).milestoneRecords) {
          result.milestoneRecords = Array.from(memoryStore.babyMilestones.values())
            .filter(bm => bm.babyId === baby.id)
            .map(bm => {
              const milestone = memoryStore.milestones.get(bm.milestoneId);
              return {
                ...bm,
                milestone: milestone || null
              };
            })
            .filter(bm => bm.milestone)
            .sort((a, b) => (b.achievedAt?.getTime() || 0) - (a.achievedAt?.getTime() || 0))
            .slice(0, (include as any).milestoneRecords?.take || 10);
        }
        
        return result;
      }
      
      return baby;
    },

    async findMany(where: { userId: string }) {
      const babies = Array.from(memoryStore.babies.values())
        .filter(baby => baby.userId === where.userId);
      return babies;
    },

    async update(where: { id: string }, data: Partial<Baby>) {
      const baby = memoryStore.babies.get(where.id);
      if (!baby) return null;
      
      const updated = { ...baby, ...data, updatedAt: new Date() };
      memoryStore.babies.set(where.id, updated);
      return updated;
    },

    async delete(where: { id: string }) {
      return memoryStore.babies.delete(where.id);
    },
  },

  // 喂养记录操作
  feedingRecord: {
    async create(data: Omit<FeedingRecord, 'id'>) {
      const id = generateId();
      const record: FeedingRecord = { id, ...data };
      memoryStore.feedingRecords.set(id, record);
      return record;
    },

    async findMany(where: Record<string, unknown>) {
      let records = Array.from(memoryStore.feedingRecords.values());
      
      if (where.babyId) {
        records = records.filter(r => r.babyId === where.babyId);
      }
      
      if ((where as any).timestamp) {
        records = records.filter(r => {
          if ((where as any).timestamp.gte && r.timestamp < (where as any).timestamp.gte) return false;
          if ((where as any).timestamp.lte && r.timestamp > (where as any).timestamp.lte) return false;
          return true;
        });
      }

      return records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
    },
  },

  // 睡眠记录操作
  sleepRecord: {
    async create(data: Omit<SleepRecord, 'id'>) {
      const id = generateId();
      const record: SleepRecord = { id, ...data };
      memoryStore.sleepRecords.set(id, record);
      return record;
    },

    async findMany(where: Record<string, unknown>) {
      let records = Array.from(memoryStore.sleepRecords.values());
      
      if (where.babyId) {
        records = records.filter(r => r.babyId === where.babyId);
      }
      
      if ((where as any).timestamp) {
        records = records.filter(r => {
          if ((where as any).timestamp.gte && r.timestamp < (where as any).timestamp.gte) return false;
          if ((where as any).timestamp.lte && r.timestamp > (where as any).timestamp.lte) return false;
          return true;
        });
      }

      return records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
    },
  },

  // 里程碑操作
  milestone: {
    async findMany(where?: any) {
      let milestones = Array.from(memoryStore.milestones.values());
      
      if (where?.AND) {
        milestones = milestones.filter(m => {
          for (const condition of where.AND) {
            if (condition.ageRangeMin && condition.ageRangeMin.lte !== undefined) {
              if (m.ageRangeMin > condition.ageRangeMin.lte) return false;
            }
            if (condition.ageRangeMax && condition.ageRangeMax.gte !== undefined) {
              if (m.ageRangeMax < condition.ageRangeMax.gte) return false;
            }
            if (condition.ageRangeMin && condition.ageRangeMin.gt !== undefined) {
              if (m.ageRangeMin <= condition.ageRangeMin.gt) return false;
            }
            if (condition.ageRangeMin && condition.ageRangeMin.lte !== undefined) {
              if (m.ageRangeMin > condition.ageRangeMin.lte) return false;
            }
          }
          return true;
        });
      }

      return milestones.map(m => ({
        ...m,
        babyMilestones: Array.from(memoryStore.babyMilestones.values())
          .filter(bm => bm.milestoneId === m.id)
      }));
    },
  },

  // 宝宝里程碑操作
  babyMilestone: {
    async create(data: Omit<BabyMilestone, 'id' | 'createdAt'>) {
      const id = generateId();
      const record: BabyMilestone = {
        id,
        ...data,
        createdAt: new Date(),
      };
      memoryStore.babyMilestones.set(id, record);
      return record;
    },

    async findFirst(where: { babyId: string; milestoneId: string }) {
      for (const [_, record] of memoryStore.babyMilestones) {
        if (record.babyId === where.babyId && record.milestoneId === where.milestoneId) {
          return record;
        }
      }
      return null;
    },

    async update(where: { id: string }, data: Partial<BabyMilestone>) {
      const record = memoryStore.babyMilestones.get(where.id);
      if (!record) return null;
      
      const updated = { ...record, ...data };
      memoryStore.babyMilestones.set(where.id, updated);
      return updated;
    },
  },

  // 验证码存储
  verificationCode: {
    store(phone: string, code: string) {
      memoryStore.verificationCodes.set(phone, {
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟过期
      });
    },

    verify(phone: string, code: string): boolean {
      const stored = memoryStore.verificationCodes.get(phone);
      if (!stored) return false;
      if (stored.expiresAt < new Date()) {
        memoryStore.verificationCodes.delete(phone);
        return false;
      }
      return stored.code === code;
    },
  },
};

// 初始化
demoDb.init();