import type { Baby, PersonalizedContent, BabyMilestone } from '@/types';
import { calculateAge, getAgeCategory } from '@/utils/age-calculator';

export class AIContentGenerator {
  private apiKey = process.env.AI_API_KEY || '';
  private baseURL = process.env.AI_BASE_URL || '';
  private model = process.env.AI_MODEL || 'gemini-2.5-pro';

  private async callAI(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API call failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI API call error:', error);
      throw error;
    }
  }

  async generateDailyCard(
    baby: Baby,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentFeeding: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentSleep: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completedMilestones: any[]
  ): Promise<PersonalizedContent> {
    const ageInfo = calculateAge(baby);
    const ageCategory = getAgeCategory(ageInfo.correctedAgeInDays);
    
    const prompt = `
你是一位专业的早产儿育儿顾问。请为以下宝宝生成今日个性化育儿建议：

宝宝信息：
- 姓名：${baby.name}
- 矫正月龄：${ageInfo.correctedAge.months}个月${ageInfo.correctedAge.days}天
- 实际月龄：${ageInfo.actualAge.months}个月${ageInfo.actualAge.days}天
- 年龄分类：${ageCategory}

最近记录（最近24小时）：
喂养记录：${recentFeeding.map(f => `${f.type} - ${f.amountOrDuration} - ${f.notes || ''}`).join(', ') || '无记录'}
睡眠记录：${recentSleep.map(s => `${new Date(s.startTime).toLocaleTimeString()} - ${new Date(s.endTime).toLocaleTimeString()}`).join(', ') || '无记录'}

已完成里程碑：${completedMilestones.map(m => m.milestone.title).join(', ') || '无'}

请生成一个温暖、实用的育儿建议，包含：
1. 一个温馨的标题
2. 针对当前矫正月龄的发育指导（100-150字）
3. 2-3个具体可操作的建议
4. 相关标签（从以下选择：#大动作 #精细动作 #认知发育 #社交情感 #喂养 #睡眠 #游戏互动）

请用以下JSON格式回复：
{
  "title": "温馨标题",
  "content": "育儿指导内容",
  "actionItems": ["建议1", "建议2", "建议3"],
  "tags": ["#标签1", "#标签2"],
  "urgencyLevel": "low"
}

注意：
- 内容要温暖鼓励，避免焦虑
- 重点关注矫正月龄对应的发育特点
- 考虑早产儿的特殊需求
- 语言要亲切、专业但不生硬
`;

    try {
      const text = await this.callAI(prompt);
      
      // 尝试解析JSON响应
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const content = JSON.parse(jsonMatch[0]);
        return {
          title: content.title || '今日育儿小贴士',
          content: content.content || '继续关注宝宝的健康成长！',
          actionItems: content.actionItems || [],
          tags: content.tags || [],
          urgencyLevel: content.urgencyLevel || 'low'
        };
      }
      
      // 如果JSON解析失败，返回默认内容
      return this.getDefaultContent(ageCategory);
    } catch (error) {
      console.error('AI content generation failed:', error);
      return this.getDefaultContent(ageCategory);
    }
  }

  async generateMilestoneRecommendation(
    baby: Baby,
    completedMilestones: BabyMilestone[]
  ): Promise<string> {
    const ageInfo = calculateAge(baby);
    
    const prompt = `
基于宝宝 ${baby.name} 的矫正月龄（${ageInfo.correctedAge.months}个月${ageInfo.correctedAge.days}天）和已完成的里程碑，
推荐下一个重点关注的发育里程碑，并提供2-3个促进达成的小游戏或方法。

已完成里程碑：${completedMilestones.map(m => m.milestone.title).join(', ') || '无'}

请简洁回复（50-80字），包含具体可行的建议。
`;

    try {
      const text = await this.callAI(prompt);
      return text || '继续观察宝宝的发育情况，每个宝宝的发育节奏都不同，耐心陪伴最重要。';
    } catch (error) {
      console.error('AI milestone recommendation failed:', error);
      return '继续观察宝宝的发育情况，每个宝宝的发育节奏都不同，耐心陪伴最重要。';
    }
  }

  private getDefaultContent(ageCategory: string): PersonalizedContent {
    const defaultContents: Record<string, PersonalizedContent> = {
      '0-2个月': {
        title: '专注感官发育',
        content: '这个阶段的宝宝正在适应外界环境，感官发育是重点。黑白对比的图案能够吸引宝宝的注意力，促进视觉发育。',
        actionItems: ['每天进行黑白卡片游戏', '多和宝宝说话，促进听觉发育', '适当的肌肤接触增强安全感'],
        tags: ['#认知发育', '#感官发育'],
        urgencyLevel: 'low'
      },
      '2-4个月': {
        title: '互动游戏时光',
        content: '宝宝开始对周围世界表现出更多兴趣，可以进行简单的互动游戏，促进大运动和社交发育。',
        actionItems: ['练习俯卧抬头', '制造不同声音吸引注意', '多进行眼神交流和微笑'],
        tags: ['#大动作', '#社交情感'],
        urgencyLevel: 'low'
      }
    };

    return defaultContents[ageCategory] || defaultContents['0-2个月'];
  }
}