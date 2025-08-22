import type { 
  Baby, 
  PersonalizedContent, 
  BabyMilestone,
  FeedingRecord,
  SleepRecord
} from '@/types';
import { calculateAge, getAgeCategory } from '@/utils/age-calculator';
import { 
  CONTENT_TEMPLATES, 
  replacePromptVariables, 
  sanitizeContent, 
  getPrematureFocus 
} from './ai-prompts';

interface AIConfig {
  maxRetries: number;
  retryDelay: number;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

interface AIUsageMetrics {
  requestCount: number;
  tokensUsed: number;
  lastResetTime: number;
  errors: number;
}

interface CacheEntry {
  content: string;
  timestamp: number;
  expiresAt: number;
}

export class AIContentGenerator {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private config: AIConfig;
  private usage: AIUsageMetrics;
  private cache: Map<string, CacheEntry> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.baseURL = 'https://generativelanguage.googleapis.com';
    this.model = 'gemini-2.0-flash-exp';
    this.isEnabled = Boolean(this.apiKey);
    
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      maxTokens: 1000,
      temperature: 0.7,
      timeoutMs: 30000
    };

    this.usage = {
      requestCount: 0,
      tokensUsed: 0,
      lastResetTime: Date.now(),
      errors: 0
    };

    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60000); // Every minute
  }

  private generateCacheKey(prompt: string, context?: Record<string, unknown>): string {
    const content = prompt + (context ? JSON.stringify(context) : '');
    return Buffer.from(content).toString('base64').slice(0, 64);
  }

  private getCachedContent(key: string): string | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.content;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedContent(key: string, content: string, ttlMs: number = 3600000): void {
    this.cache.set(key, {
      content,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private async callGemini(prompt: string, context?: Record<string, unknown>): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('AI service is disabled - missing API key');
    }

    const cacheKey = this.generateCacheKey(prompt, context);
    const cached = this.getCachedContent(cacheKey);
    if (cached) {
      console.log('AI cache hit');
      return cached;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.usage.requestCount++;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(
          `${this.baseURL}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                maxOutputTokens: this.config.maxTokens,
                temperature: this.config.temperature,
              },
              safetySettings: [
                {
                  category: 'HARM_CATEGORY_HARASSMENT',
                  threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                  category: 'HARM_CATEGORY_HATE_SPEECH', 
                  threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                  category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                  threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
              ]
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error('Invalid response format from Gemini API');
        }

        const content = data.candidates[0].content.parts[0].text;
        
        // Update usage metrics
        if (data.usageMetadata) {
          this.usage.tokensUsed += (data.usageMetadata.totalTokenCount || 0);
        }

        // Cache successful result
        this.setCachedContent(cacheKey, content, 3600000); // 1 hour cache
        
        return content;
        
      } catch (error) {
        lastError = error as Error;
        this.usage.errors++;
        
        console.warn(`AI API attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('AI API calls failed after all retries');
  }

  public getUsageMetrics(): AIUsageMetrics {
    return { ...this.usage };
  }

  public resetUsageMetrics(): void {
    this.usage = {
      requestCount: 0,
      tokensUsed: 0,
      lastResetTime: Date.now(),
      errors: 0
    };
  }

  public isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  async generateDailyCard(
    baby: Baby,
    recentFeeding: FeedingRecord[],
    recentSleep: SleepRecord[],
    completedMilestones: BabyMilestone[]
  ): Promise<PersonalizedContent> {
    if (!this.isEnabled) {
      console.warn('AI service disabled, using fallback content');
      const ageInfo = calculateAge(baby);
      const ageCategory = getAgeCategory(ageInfo.correctedAgeInDays);
      return this.getDefaultContent(ageCategory, baby.name);
    }

    const ageInfo = calculateAge(baby);
    const ageCategory = getAgeCategory(ageInfo.correctedAgeInDays);
    const prematureWeeks = Math.max(0, 40 - baby.gestationalWeeks);
    const prematureFocus = getPrematureFocus(prematureWeeks);
    
    // 分析喂养模式
    const feedingAnalysis = this.analyzeFeedingPatterns(recentFeeding);
    const sleepAnalysis = this.analyzeSleepPatterns(recentSleep);
    const developmentAnalysis = this.analyzeDevelopmentProgress(completedMilestones, ageInfo.correctedAgeInDays);

    // 使用增强的提示模板
    const template = CONTENT_TEMPLATES.DAILY_GUIDANCE;
    const prompt = replacePromptVariables(template.user, {
      babyName: baby.name,
      gestationalWeeks: baby.gestationalWeeks.toString(),
      gestationalDays: baby.gestationalDays.toString(),
      prematureWeeks: prematureWeeks.toString(),
      prematureSeverity: `（${prematureFocus.severity}）`,
      correctedMonths: ageInfo.correctedAge.months.toString(),
      correctedDays: ageInfo.correctedAge.days.toString(),
      actualMonths: ageInfo.actualAge.months.toString(),
      actualDays: ageInfo.actualAge.days.toString(),
      ageCategory,
      feedingAnalysis: `${feedingAnalysis.summary}\n详细记录：${recentFeeding.map(f => `${this.formatFeedingType(f.type)} ${f.amountOrDuration} (${new Date(f.timestamp).toLocaleString()})`).join('; ') || '暂无记录'}`,
      sleepAnalysis: `${sleepAnalysis.summary}\n详细记录：${recentSleep.map(s => `${this.formatDuration(s.durationMinutes)}分钟 (${new Date(s.startTime).toLocaleString()})`).join('; ') || '暂无记录'}`,
      developmentAnalysis: `${developmentAnalysis.summary}\n已达成里程碑：${completedMilestones.map(m => m.milestone.title).join('、') || '暂无记录'}`
    });

    try {
      const text = await this.callGemini(prompt, {
        babyId: baby.id,
        correctedAge: ageInfo.correctedAgeInDays,
        feedingCount: recentFeeding.length,
        sleepCount: recentSleep.length,
        milestonesCount: completedMilestones.length
      });
      
      // 尝试解析JSON响应
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const content = JSON.parse(jsonMatch[0]);
        
        // 验证和清理内容
        const validatedContent = this.validateAndSanitizeContent({
          title: sanitizeContent(content.title || `${baby.name}今日成长小贴士`),
          content: sanitizeContent(content.content || '继续用爱和耐心陪伴宝宝的每一天成长！'),
          actionItems: Array.isArray(content.actionItems) 
            ? content.actionItems.slice(0, 3).map(item => sanitizeContent(item)) 
            : [],
          tags: Array.isArray(content.tags) ? content.tags.slice(0, 4) : [],
          urgencyLevel: ['low', 'medium', 'high'].includes(content.urgencyLevel) ? content.urgencyLevel : 'low'
        });
        
        return validatedContent;
      }
      
      // 如果JSON解析失败，返回默认内容
      return this.getDefaultContent(ageCategory, baby.name);
    } catch (error) {
      console.error('AI daily content generation failed:', error);
      return this.getDefaultContent(ageCategory, baby.name);
    }
  }

  private formatFeedingType(type: string): string {
    const typeMap = {
      'breast': '母乳',
      'formula': '配方奶',
      'solid': '辅食'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}` : `${hours}小时`;
  }

  private analyzeFeedingPatterns(records: FeedingRecord[]): { summary: string } {
    if (records.length === 0) {
      return { summary: '暂无24小时内喂养记录' };
    }

    const typeCount = records.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalFeeds = records.length;
    const mainType = Object.entries(typeCount).sort(([,a], [,b]) => b - a)[0];
    const avgInterval = records.length > 1 
      ? Math.round((new Date(records[0].timestamp).getTime() - new Date(records[records.length - 1].timestamp).getTime()) / (1000 * 60 * (records.length - 1)))
      : 0;

    return {
      summary: `24小时内${totalFeeds}次喂养，主要方式：${this.formatFeedingType(mainType[0])}(${mainType[1]}次)${
        avgInterval > 0 ? `，平均间隔${Math.round(avgInterval / 60)}小时` : ''
      }`
    };
  }

  private analyzeSleepPatterns(records: SleepRecord[]): { summary: string } {
    if (records.length === 0) {
      return { summary: '暂无24小时内睡眠记录' };
    }

    const totalSleepMinutes = records.reduce((sum, r) => sum + r.durationMinutes, 0);
    const avgSleepDuration = Math.round(totalSleepMinutes / records.length);
    const longestSleep = Math.max(...records.map(r => r.durationMinutes));

    return {
      summary: `24小时内${records.length}次睡眠，总时长${this.formatDuration(totalSleepMinutes)}，平均每次${this.formatDuration(avgSleepDuration)}，最长${this.formatDuration(longestSleep)}`
    };
  }

  private analyzeDevelopmentProgress(milestones: BabyMilestone[], _correctedAgeInDays: number): { summary: string } {
    if (milestones.length === 0) {
      return { summary: '尚未记录发育里程碑达成情况' };
    }

    const categoryCount = milestones.reduce((acc, m) => {
      acc[m.milestone.category] = (acc[m.milestone.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentAchievements = milestones
      .filter(m => m.achievedAt && (Date.now() - new Date(m.achievedAt).getTime()) < 7 * 24 * 60 * 60 * 1000)
      .length;

    const categoryNames = {
      motor: '大动作',
      cognitive: '认知',
      social: '社交',
      language: '语言'
    };

    const topCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      summary: `已达成${milestones.length}个里程碑，近7天新增${recentAchievements}个${topCategory ? `，${categoryNames[topCategory[0] as keyof typeof categoryNames]}发育表现突出` : ''}`
    };
  }

  private validateAndSanitizeContent(content: PersonalizedContent): PersonalizedContent {
    // 内容安全检查和清理
    const sanitizeText = (text: string): string => {
      return text
        .replace(/[<>"'&]/g, '') // 移除潜在的XSS字符
        .trim()
        .slice(0, 500); // 限制长度
    };

    return {
      title: sanitizeText(content.title),
      content: sanitizeText(content.content),
      actionItems: content.actionItems
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => sanitizeText(item))
        .slice(0, 3),
      tags: content.tags
        .filter(tag => typeof tag === 'string' && tag.startsWith('#'))
        .map(tag => sanitizeText(tag))
        .slice(0, 4),
      urgencyLevel: content.urgencyLevel
    };
  }

  async generateMilestoneRecommendation(
    baby: Baby,
    completedMilestones: BabyMilestone[]
  ): Promise<string> {
    if (!this.isEnabled) {
      return '继续观察宝宝的发育情况，每个宝宝都有自己的成长节奏，耐心陪伴是最好的支持。';
    }

    const ageInfo = calculateAge(baby);
    const prematureWeeks = Math.max(0, 40 - baby.gestationalWeeks);
    
    // 分析已完成里程碑的模式
    const categoryProgress = completedMilestones.reduce((acc, m) => {
      acc[m.milestone.category] = (acc[m.milestone.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentAchievements = completedMilestones
      .filter(m => m.achievedAt && (Date.now() - new Date(m.achievedAt).getTime()) < 14 * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.achievedAt!).getTime() - new Date(a.achievedAt!).getTime());

    // 使用增强的提示模板
    const template = CONTENT_TEMPLATES.MILESTONE_RECOMMENDATION;
    const prompt = replacePromptVariables(template.user, {
      babyName: baby.name,
      gestationalWeeks: baby.gestationalWeeks.toString(),
      gestationalDays: baby.gestationalDays.toString(),
      prematureWeeks: prematureWeeks.toString(),
      correctedMonths: ageInfo.correctedAge.months.toString(),
      correctedDays: ageInfo.correctedAge.days.toString(),
      actualMonths: ageInfo.actualAge.months.toString(),
      actualDays: ageInfo.actualAge.days.toString(),
      totalMilestones: completedMilestones.length.toString(),
      motorCount: (categoryProgress.motor || 0).toString(),
      cognitiveCount: (categoryProgress.cognitive || 0).toString(),
      socialCount: (categoryProgress.social || 0).toString(),
      languageCount: (categoryProgress.language || 0).toString(),
      recentMilestones: recentAchievements.slice(0, 3).map(m => m.milestone.title).join('、') || '暂无近期记录'
    });

    try {
      const text = await this.callGemini(prompt, {
        babyId: baby.id,
        correctedAge: ageInfo.correctedAgeInDays,
        completedCount: completedMilestones.length,
        categoryProgress
      });
      
      // 清理和验证回复内容
      const cleanText = sanitizeContent(text.trim().slice(0, 200));
      return cleanText || '继续观察宝宝的发育情况，每个宝宝都有自己的成长节奏，耐心陪伴是最好的支持。';
    } catch (error) {
      console.error('AI milestone recommendation failed:', error);
      return `根据${baby.name}当前的矫正月龄，建议重点关注${this.getAgeAppropriateRecommendation(ageInfo.correctedAgeInDays)}。记住，早产宝宝有自己的成长节奏，您的耐心陪伴是最珍贵的礼物。`;
    }
  }

  private generateDataAnalysis(
    feedingRecords: FeedingRecord[],
    sleepRecords: SleepRecord[],
    milestones: BabyMilestone[],
    _ageInfo: ReturnType<typeof calculateAge>
  ): string {
    const analysis = [];
    
    // 喂养模式分析
    if (feedingRecords.length > 0) {
      const feedingTypes = feedingRecords.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mainType = Object.entries(feedingTypes).sort(([,a], [,b]) => b - a)[0];
      analysis.push(`喂养模式：主要采用${this.formatFeedingType(mainType[0])}，占${Math.round((mainType[1] / feedingRecords.length) * 100)}%`);
    }
    
    // 睡眠模式分析
    if (sleepRecords.length > 0) {
      const avgSleepDuration = Math.round(
        sleepRecords.reduce((sum, r) => sum + r.durationMinutes, 0) / sleepRecords.length
      );
      const totalSleepHours = Math.round(
        sleepRecords.reduce((sum, r) => sum + r.durationMinutes, 0) / 60
      );
      analysis.push(`睡眠模式：平均每次睡眠${this.formatDuration(avgSleepDuration)}，近期总睡眠约${totalSleepHours}小时`);
    }
    
    // 发育进展分析
    if (milestones.length > 0) {
      const recentMilestones = milestones.filter(m => 
        m.achievedAt && (Date.now() - new Date(m.achievedAt).getTime()) < 30 * 24 * 60 * 60 * 1000
      );
      analysis.push(`发育进展：近30天达成${recentMilestones.length}个里程碑，总计${milestones.length}个`);
    }
    
    return analysis.join('；') || '数据记录较少，建议增加记录频率以获得更准确的分析';
  }

  private getAgeAppropriateRecommendation(correctedAgeInDays: number): string {
    if (correctedAgeInDays < 60) {
      return '视觉追踪和听觉刺激，通过黑白卡片和轻柔音乐促进感官发育';
    } else if (correctedAgeInDays < 120) {
      return '俯卧抬头和社交互动，每天进行俯卧时间练习并增加面对面交流';
    } else if (correctedAgeInDays < 180) {
      return '手眼协调和坐位平衡，提供抓握玩具并支撑坐位练习';
    } else if (correctedAgeInDays < 270) {
      return '爬行准备和语言启蒙，创造安全探索环境并丰富语言输入';
    } else if (correctedAgeInDays < 365) {
      return '站立平衡和词汇发展，支持站立练习并鼓励模仿发音';
    } else {
      return '行走技能和语言表达，提供安全行走空间并鼓励语言交流';
    }
  }

  // 新增：生成成长洞察分析
  async generateGrowthInsights(
    baby: Baby,
    feedingRecords: FeedingRecord[],
    sleepRecords: SleepRecord[],
    milestones: BabyMilestone[]
  ): Promise<{
    insights: string[];
    recommendations: string[];
    concerns: string[];
  }> {
    if (!this.isEnabled) {
      return {
        insights: ['AI分析功能暂时不可用，请联系技术支持'],
        recommendations: ['继续记录宝宝的日常活动'],
        concerns: []
      };
    }

    const ageInfo = calculateAge(baby);
    const recentFeeding = feedingRecords.slice(0, 20); // 最近20次
    const recentSleep = sleepRecords.slice(0, 15); // 最近15次
    
    // 分析数据模式
    const dataAnalysis = this.generateDataAnalysis(recentFeeding, recentSleep, milestones, ageInfo);
    
    // 使用增强的提示模板
    const template = CONTENT_TEMPLATES.GROWTH_INSIGHTS;
    const prompt = replacePromptVariables(template.user, {
      correctedMonths: ageInfo.correctedAge.months.toString(),
      correctedDays: ageInfo.correctedAge.days.toString(),
      prematureWeeks: Math.max(0, 40 - baby.gestationalWeeks).toString(),
      feedingCount: recentFeeding.length.toString(),
      sleepCount: recentSleep.length.toString(),
      milestonesCount: milestones.length.toString(),
      dataAnalysis
    });

    try {
      const text = await this.callGemini(prompt, {
        babyId: baby.id,
        dataPoints: recentFeeding.length + recentSleep.length + milestones.length
      });
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
          concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 2) : []
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('AI growth insights failed:', error);
      return {
        insights: ['数据显示宝宝在稳步发育中'],
        recommendations: ['继续保持规律的记录习惯', '确保充足的营养和睡眠'],
        concerns: []
      };
    }
  }

  // 新增：生成知识卡片推荐
  async generateKnowledgeCards(
    baby: Baby,
    limit: number = 5
  ): Promise<Array<{
    title: string;
    content: string;
    category: string;
    relevanceScore: number;
  }>> {
    if (!this.isEnabled) {
      return this.getDefaultKnowledgeCards(limit);
    }

    const ageInfo = calculateAge(baby);
    const ageCategory = getAgeCategory(ageInfo.correctedAgeInDays);
    
    const prematureWeeks = Math.max(0, 40 - baby.gestationalWeeks);
    
    // 使用增强的提示模板
    const template = CONTENT_TEMPLATES.KNOWLEDGE_CARDS;
    const prompt = replacePromptVariables(template.user, {
      ageCategory,
      cardCount: limit.toString(),
      correctedMonths: ageInfo.correctedAge.months.toString(),
      correctedDays: ageInfo.correctedAge.days.toString(),
      prematureWeeks: prematureWeeks.toString()
    });

    try {
      const text = await this.callGemini(prompt, {
        ageCategory,
        correctedAge: ageInfo.correctedAgeInDays
      });
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.cards)) {
          return parsed.cards.slice(0, limit);
        }
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('AI knowledge cards generation failed:', error);
      return this.getDefaultKnowledgeCards(limit);
    }
  }

  private getDefaultKnowledgeCards(limit: number) {
    const defaultCards = [
      {
        title: '早产宝宝的矫正月龄',
        content: '矫正月龄是早产宝宝发育评估的重要指标。它从预产期开始计算，更准确反映宝宝的发育水平。使用矫正月龄来判断里程碑达成情况，能减少不必要的担忧。',
        category: '发育指导',
        relevanceScore: 0.95
      },
      {
        title: '营养支持的重要性',
        content: '早产宝宝需要更丰富的营养来支持追赶性生长。母乳是最佳选择，含有丰富的抗体和营养成分。如需配方奶补充，建议选择早产儿专用配方。',
        category: '营养喂养', 
        relevanceScore: 0.9
      },
      {
        title: '睡眠环境的营造',
        content: '安静、温暖、光线适中的环境有助于宝宝睡眠质量。早产宝宝的睡眠模式可能与足月宝宝不同，需要更多耐心和理解。',
        category: '睡眠管理',
        relevanceScore: 0.85
      },
      {
        title: '感官刺激与发育',
        content: '适度的感官刺激有助于大脑发育。可以通过不同材质的玩具、轻柔的音乐、温和的按摩来提供丰富的感官体验。',
        category: '发育指导',
        relevanceScore: 0.8
      },
      {
        title: '情感连接的建立',
        content: '早产宝宝特别需要安全感的建立。通过肌肤接触、温柔的话语、稳定的作息来建立深厚的亲子情感连接。',
        category: '亲子互动',
        relevanceScore: 0.88
      }
    ];
    
    return defaultCards.slice(0, limit);
  }

  private getDefaultContent(ageCategory: string, babyName?: string): PersonalizedContent {
    const defaultContents: Record<string, PersonalizedContent> = {
      '0-2个月': {
        title: `${babyName ? babyName + '的' : ''}感官启蒙时光`,
        content: '早产宝宝在这个阶段需要温柔的感官刺激。黑白对比图案有助于视觉发育，轻柔的音乐和妈妈的声音能促进听觉发展。记住，每个宝宝都有自己的节奏，耐心陪伴是最好的礼物。',
        actionItems: ['每天15分钟黑白卡片视觉训练', '温柔地和宝宝说话唱歌', '增加肌肤接触，建立安全感'],
        tags: ['#认知启蒙', '#感官刺激', '#亲子互动'],
        urgencyLevel: 'low'
      },
      '2-4个月': {
        title: `${babyName ? babyName + '的' : ''}互动探索期`,
        content: '宝宝开始对周围世界更感兴趣啦！这是培养社交能力和大动作发育的关键时期。多给宝宝俯卧时间，鼓励抬头动作，同时通过游戏增进亲子感情。',
        actionItems: ['每天多次短时间俯卧练习', '用玩具引导视觉追踪', '回应宝宝的笑声和咿呀声'],
        tags: ['#大动作发育', '#社交情感', '#亲子互动'],
        urgencyLevel: 'low'
      },
      '4-6个月': {
        title: `${babyName ? babyName + '的' : ''}主动探索期`,
        content: '宝宝的手眼协调能力正在发展，喜欢抓握和探索物品。这个阶段要提供安全的探索环境，鼓励宝宝主动尝试，为翻身和坐立做准备。',
        actionItems: ['提供不同材质的安全玩具', '鼓励双手协调抓握动作', '支撑坐位，加强核心肌群'],
        tags: ['#精细动作', '#感官刺激', '#大动作发育'],
        urgencyLevel: 'low'
      },
      '6-9个月': {
        title: `${babyName ? babyName + '的' : ''}活跃成长期`,
        content: '宝宝可能已经会坐了，开始尝试爬行或移动。语言理解力也在快速发展，可以进行更复杂的互动游戏。记住给宝宝充分的鼓励和赞美。',
        actionItems: ['创造安全的爬行环境', '进行简单的手势游戏', '读图画书，丰富语言环境'],
        tags: ['#大动作发育', '#语言启蒙', '#认知启蒙'],
        urgencyLevel: 'low'
      },
      '9-12个月': {
        title: `${babyName ? babyName + '的' : ''}独立探索期`,
        content: '宝宝正在为站立和行走做准备，同时语言能力快速发展。这是培养独立性的重要时期，鼓励宝宝自己尝试，但要确保环境安全。',
        actionItems: ['支持站立和迈步练习', '鼓励模仿简单词汇', '提供机会自主进食'],
        tags: ['#大动作发育', '#语言发育', '#独立能力'],
        urgencyLevel: 'low'
      },
      '12-18个月': {
        title: `${babyName ? babyName + '的' : ''}语言爆发期`,
        content: '宝宝的语言能力进入快速发展期，开始说出更多词汇。同时大动作技能日益完善，可以独立行走。这个阶段要给予足够的语言刺激和运动机会。',
        actionItems: ['每天固定阅读时间', '鼓励户外活动和探索', '重复并扩展宝宝的话语'],
        tags: ['#语言发育', '#大动作发育', '#认知启蒙'],
        urgencyLevel: 'low'
      },
      '18-24个月': {
        title: `${babyName ? babyName + '的' : ''}小小社交家`,
        content: '宝宝开始表现出更强的社交意识和情感表达能力。可以进行更复杂的游戏和活动，也开始学会分享和合作的概念。',
        actionItems: ['安排与其他小朋友的互动', '教导简单的社交礼仪', '鼓励表达情感和需求'],
        tags: ['#社交情感', '#语言发育', '#情感表达'],
        urgencyLevel: 'low'
      }
    };

    return defaultContents[ageCategory] || defaultContents['0-2个月'];
  }
}

// 导出单例实例
export const aiContentGenerator = new AIContentGenerator();