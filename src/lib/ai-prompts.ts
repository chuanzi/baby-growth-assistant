/**
 * AI Prompt Templates for Personalized Content Generation
 * 
 * This file contains carefully crafted prompts for generating high-quality,
 * personalized content for premature baby development guidance.
 */

export interface PromptTemplate {
  system: string;
  user: string;
  variables: string[];
  example?: string;
}

export interface PromptConfig {
  temperature: number;
  maxTokens: number;
  requirements: string[];
}

// 专业的早产儿发育专家系统提示
export const SYSTEM_PROMPTS = {
  EXPERT_NEONATOLOGIST: `你是一位具有20年临床经验的新生儿科主任医师，专门从事早产儿发育指导工作。你的专业特长包括：

核心专业领域：
- 早产儿发育里程碑评估和矫正月龄计算
- 个性化喂养和睡眠指导
- 家庭护理和发育促进方案
- 早产儿追赶性生长支持

沟通原则：
- 始终使用温暖、专业、易懂的语言
- 强调每个宝宝发育节奏的个体差异
- 提供具体可操作的建议，避免空泛的理论
- 重点关注矫正月龄而非实际月龄
- 绝不提供医疗诊断，鼓励必要时咨询医生

特殊关注：
- 理解早产儿家长的焦虑心理，给予情感支持
- 强调正面成长，避免引起不必要的担忧
- 基于循证医学提供建议，但用家长能理解的语言表达`,

  CARING_CONSULTANT: `你是一位温暖的早产儿家庭顾问，同时具备专业的儿童发育知识。你深刻理解早产儿家长的心理状态，能够：

情感支持特长：
- 理解初为人父母特别是早产儿家长的焦虑
- 提供情感安抚的同时给出实用指导
- 用鼓励和温暖的语调传达专业知识
- 强调家长陪伴的重要性和价值

专业能力：
- 熟知早产儿各发育阶段的特点
- 能够解读发育数据并转化为家长指导
- 提供适合家庭环境的练习方法
- 识别需要专业医疗关注的情况并适当建议`
};

// 个性化内容生成模板
export const CONTENT_TEMPLATES = {
  DAILY_GUIDANCE: {
    system: SYSTEM_PROMPTS.EXPERT_NEONATOLOGIST,
    user: `请为以下早产宝宝生成今日个性化育儿指导：

【宝宝档案】
- 姓名：{{babyName}}
- 出生胎龄：{{gestationalWeeks}}周+{{gestationalDays}}天
- 早产程度：{{prematureWeeks}}周早产{{prematureSeverity}}
- 矫正月龄：{{correctedMonths}}个月{{correctedDays}}天
- 实际月龄：{{actualMonths}}个月{{actualDays}}天
- 发育阶段：{{ageCategory}}

【近期照护数据分析】
喂养情况：
{{feedingAnalysis}}

睡眠情况：
{{sleepAnalysis}}

发育进展：
{{developmentAnalysis}}

【专业要求】
请基于早产儿的特殊发育需求，生成温暖而专业的个性化指导。必须：
1. 强调矫正月龄的重要性，安抚家长焦虑
2. 提供针对当前发育阶段的具体指导
3. 考虑早产儿追赶性生长的特点
4. 给出2-3个可操作的具体建议
5. 语言温暖鼓励，避免医疗建议或诊断

请严格按照以下JSON格式回复：
{
  "title": "今日专属指导标题（温馨且个性化）",
  "content": "100-150字的发育指导内容，体现专业性和温暖感",
  "actionItems": ["具体可操作的建议1", "具体可操作的建议2", "具体可操作的建议3"],
  "tags": ["#相关标签1", "#相关标签2"],
  "urgencyLevel": "low"
}

标签选择范围：#大动作发育 #精细动作 #认知启蒙 #社交情感 #感官刺激 #喂养指导 #睡眠管理 #亲子互动 #追赶生长`,
    variables: [
      'babyName', 'gestationalWeeks', 'gestationalDays', 'prematureWeeks', 
      'prematureSeverity', 'correctedMonths', 'correctedDays', 'actualMonths', 
      'actualDays', 'ageCategory', 'feedingAnalysis', 'sleepAnalysis', 'developmentAnalysis'
    ],
    config: {
      temperature: 0.7,
      maxTokens: 1000,
      requirements: [
        '必须包含具体可操作的建议',
        '语言温暖专业，安抚家长情绪',
        '基于矫正月龄提供指导',
        '避免医疗诊断和恐慌信息'
      ]
    }
  },

  MILESTONE_RECOMMENDATION: {
    system: SYSTEM_PROMPTS.CARING_CONSULTANT,
    user: `你是早产儿发育专家，请为以下宝宝提供下一阶段的发育重点建议：

【宝宝基本信息】
- 姓名：{{babyName}}
- 出生胎龄：{{gestationalWeeks}}周+{{gestationalDays}}天
- 早产情况：{{prematureWeeks}}周早产
- 矫正月龄：{{correctedMonths}}个月{{correctedDays}}天
- 实际月龄：{{actualMonths}}个月{{actualDays}}天

【发育进展分析】
已完成里程碑总数：{{totalMilestones}}个
各领域进展：
- 大动作：{{motorCount}}个
- 认知发育：{{cognitiveCount}}个  
- 社交情感：{{socialCount}}个
- 语言发育：{{languageCount}}个

近期达成里程碑：{{recentMilestones}}

【专业要求】
请基于早产儿的发育特点，提供：
1. 下一阶段应重点关注的1-2个发育领域
2. 2-3个具体的家庭练习方法
3. 温暖鼓励的话语，强调个体差异的正常性

请用温暖专业的语调，在80-120字内回复，避免医疗诊断用语。`,
    variables: [
      'babyName', 'gestationalWeeks', 'gestationalDays', 'prematureWeeks',
      'correctedMonths', 'correctedDays', 'actualMonths', 'actualDays',
      'totalMilestones', 'motorCount', 'cognitiveCount', 'socialCount', 
      'languageCount', 'recentMilestones'
    ],
    config: {
      temperature: 0.7,
      maxTokens: 500,
      requirements: [
        '重点关注1-2个发育领域',
        '提供具体的家庭练习方法',
        '强调个体差异的正常性',
        '温暖鼓励的语调'
      ]
    }
  },

  GROWTH_INSIGHTS: {
    system: SYSTEM_PROMPTS.EXPERT_NEONATOLOGIST,
    user: `作为早产儿发育专家，请分析以下宝宝的成长数据并提供专业洞察：

【宝宝信息】
- 矫正月龄：{{correctedMonths}}个月{{correctedDays}}天
- 早产周数：{{prematureWeeks}}周

【数据摘要】
- 近期喂养记录：{{feedingCount}}次
- 近期睡眠记录：{{sleepCount}}次  
- 发育里程碑：{{milestonesCount}}个已达成

【具体数据模式】
{{dataAnalysis}}

请提供JSON格式回复：
{
  "insights": ["基于数据模式的专业洞察1", "洞察2", "洞察3"],
  "recommendations": ["具体可操作的建议1", "建议2", "建议3"],
  "concerns": ["需要关注但不引起焦虑的点1", "关注点2"]
}

要求：
- 洞察要基于数据模式分析，体现专业性
- 建议要具体可操作，适合家庭执行
- 关注点要平和客观，不引起家长焦虑
- 每项控制在30-50字以内`,
    variables: [
      'correctedMonths', 'correctedDays', 'prematureWeeks', 
      'feedingCount', 'sleepCount', 'milestonesCount', 'dataAnalysis'
    ],
    config: {
      temperature: 0.6,
      maxTokens: 800,
      requirements: [
        '基于数据模式进行专业分析',
        '提供具体可操作的建议',
        '平和客观，不引起焦虑',
        '控制字数，简洁明了'
      ]
    }
  },

  KNOWLEDGE_CARDS: {
    system: SYSTEM_PROMPTS.CARING_CONSULTANT,
    user: `为{{ageCategory}}的早产宝宝生成{{cardCount}}个知识卡片，涵盖发育指导、护理要点、常见问题等。

宝宝矫正月龄：{{correctedMonths}}个月{{correctedDays}}天
早产程度：{{prematureWeeks}}周早产

要求JSON格式：
{
  "cards": [
    {
      "title": "实用且吸引人的卡片标题",
      "content": "80-120字的实用内容，针对早产儿特点",
      "category": "分类名称",
      "relevanceScore": 0.9,
      "tags": ["相关标签1", "标签2"]
    }
  ]
}

分类选择：发育指导、营养喂养、睡眠管理、健康护理、亲子互动、心理支持

要求：
- 内容针对早产儿特殊需求
- 实用性强，可操作性高
- 语言温暖专业，易于理解
- 避免过于医学化的表达`,
    variables: [
      'ageCategory', 'cardCount', 'correctedMonths', 'correctedDays', 'prematureWeeks'
    ],
    config: {
      temperature: 0.8,
      maxTokens: 1200,
      requirements: [
        '针对早产儿特殊需求',
        '实用性和可操作性强',
        '语言温暖专业',
        '避免医学化表达'
      ]
    }
  }
};

// 年龄阶段特化的提示模板
export const AGE_SPECIFIC_GUIDANCE = {
  '0-2个月': {
    focusAreas: ['感官刺激', '基础护理', '安全感建立', '喂养指导'],
    commonConcerns: ['追赶生长', '睡眠模式', '体重增长', '肌张力发育'],
    keyMilestones: ['视觉追踪', '社会性微笑', '俯卧抬头', '声音反应']
  },
  '2-4个月': {
    focusAreas: ['俯卧练习', '社交互动', '手眼协调', '语言启蒙'],
    commonConcerns: ['颈部控制', '睡眠规律', '社交反应', '运动发育'],
    keyMilestones: ['稳定抬头', '翻身准备', '抓握反射', '咿呀学语']
  },
  '4-6个月': {
    focusAreas: ['坐位支撑', '精细动作', '辅食准备', '探索能力'],
    commonConcerns: ['坐立平衡', '手部技能', '营养需求', '认知发展'],
    keyMilestones: ['独立坐立', '双手抓握', '物品转移', '陌生人焦虑']
  },
  '6-9个月': {
    focusAreas: ['爬行准备', '语言理解', '精细动作', '独立性'],
    commonConcerns: ['移动能力', '分离焦虑', '食物过敏', '社交技能'],
    keyMilestones: ['爬行动作', '拉站准备', '手指食物', '简单指令']
  }
};

// 早产严重程度分类
export const PREMATURITY_CLASSIFICATIONS = {
  mild: { weeks: [32, 37], label: '轻度早产', specialNeeds: ['追赶生长', '感官发育'] },
  moderate: { weeks: [28, 32], label: '中度早产', specialNeeds: ['运动发育', '认知支持', '营养强化'] },
  severe: { weeks: [24, 28], label: '极度早产', specialNeeds: ['全面发育支持', '医疗随访', '特殊护理'] }
};

// 内容安全过滤规则
export const CONTENT_SAFETY_FILTERS = {
  medical_terms: [
    '诊断', '治疗', '疾病', '病理', '症状', '病情',
    '药物', '手术', '检查', '化验', '医院', '就医'
  ],
  anxiety_triggers: [
    '延迟', '落后', '异常', '问题', '担心', '危险',
    '严重', '紧急', '立即', '马上', '必须', '应该'
  ],
  positive_replacements: {
    '延迟': '自己的节奏',
    '落后': '正在追赶',
    '异常': '个体差异',
    '问题': '特点',
    '担心': '关注'
  }
};

// 提示词变量替换函数
export function replacePromptVariables(
  template: string, 
  variables: Record<string, string | number>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
}

// 内容安全检查函数
export function sanitizeContent(content: string): string {
  let sanitized = content;
  
  // 替换可能引起焦虑的词汇
  for (const [trigger, replacement] of Object.entries(CONTENT_SAFETY_FILTERS.positive_replacements)) {
    const regex = new RegExp(trigger, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }
  
  return sanitized;
}

// 根据早产程度获取个性化指导重点
export function getPrematureFocus(prematureWeeks: number): {
  severity: string;
  focusAreas: string[];
  supportNeeds: string[];
} {
  if (prematureWeeks <= 4) {
    return {
      severity: PREMATURITY_CLASSIFICATIONS.mild.label,
      focusAreas: ['感官发育', '追赶生长', '社交互动'],
      supportNeeds: PREMATURITY_CLASSIFICATIONS.mild.specialNeeds
    };
  } else if (prematureWeeks <= 8) {
    return {
      severity: PREMATURITY_CLASSIFICATIONS.moderate.label,
      focusAreas: ['运动发育', '认知启蒙', '营养支持'],
      supportNeeds: PREMATURITY_CLASSIFICATIONS.moderate.specialNeeds
    };
  } else {
    return {
      severity: PREMATURITY_CLASSIFICATIONS.severe.label,
      focusAreas: ['全面发育', '专业指导', '家庭支持'],
      supportNeeds: PREMATURITY_CLASSIFICATIONS.severe.specialNeeds
    };
  }
}