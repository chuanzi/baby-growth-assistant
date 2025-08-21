'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

interface ActivitySuggestion {
  type: string;
  title: string;
  description: string;
  category: string;
  activities: string[];
}

interface AIRecommendation {
  baby: {
    id: string;
    name: string;
    correctedAge: { months: number; days: number };
  };
  aiRecommendation: string;
  activitySuggestions: ActivitySuggestion[];
  developmentAnalysis: {
    categoryProgress: Record<string, number>;
    strongestCategory: string;
    weakestCategory: string;
    totalCompleted: number;
  };
}

const categoryLabels = {
  motor: '大动作',
  cognitive: '认知发育',
  social: '社交情感',
  language: '语言发育'
};

const categoryColors = {
  motor: 'bg-green-100 text-green-800 border-green-200',
  cognitive: 'bg-blue-100 text-blue-800 border-blue-200', 
  social: 'bg-purple-100 text-purple-800 border-purple-200',
  language: 'bg-orange-100 text-orange-800 border-orange-200'
};

const typeIcons = {
  focus: '🎯',
  prepare: '📋',
  strengthen: '💪',
  explore: '🔍',
};

export default function ActivitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const babyId = searchParams.get('babyId');
  
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (babyId) {
      fetchActivityRecommendations(babyId);
    }
  }, [babyId]);

  const fetchActivityRecommendations = async (babyId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/milestone-recommendations/${babyId}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendation(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.babies || user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            还没有宝宝档案
          </h2>
          <p className="text-gray-600 mb-6">
            创建宝宝档案后即可获取个性化活动建议
          </p>
          <Button onClick={() => router.push('/create-profile')}>
            创建宝宝档案
          </Button>
        </div>
      </div>
    );
  }

  const filteredSuggestions = selectedCategory === 'all' 
    ? recommendation?.activitySuggestions || []
    : recommendation?.activitySuggestions.filter(s => s.category === selectedCategory) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">活动建议</h1>
            <p className="text-gray-600">个性化发育促进活动</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => router.push('/milestones')}
            >
              返回里程碑
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
            >
              返回首页
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载活动建议...</p>
          </div>
        ) : recommendation ? (
          <>
            {/* 宝宝信息卡片 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {recommendation.baby.name} 的活动建议
                  </h2>
                  <p className="text-gray-600">
                    当前矫正月龄：{recommendation.baby.correctedAge.months}个月{recommendation.baby.correctedAge.days}天
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {recommendation.developmentAnalysis.totalCompleted}
                  </div>
                  <div className="text-sm text-gray-600">已完成里程碑</div>
                </div>
              </div>
            </div>

            {/* AI 总体建议 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h3 className="text-lg font-semibold text-gray-800">AI 专家建议</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">{recommendation.aiRecommendation}</p>
            </div>

            {/* 分类筛选 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">按发育领域筛选</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部活动
                </button>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 活动建议列表 */}
            <div className="space-y-6">
              {filteredSuggestions.map((suggestion, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {typeIcons[suggestion.type as keyof typeof typeIcons] || '📝'}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{suggestion.title}</h3>
                        <p className="text-gray-600 text-sm">{suggestion.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      categoryColors[suggestion.category as keyof typeof categoryColors]
                    }`}>
                      {categoryLabels[suggestion.category as keyof typeof categoryLabels]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suggestion.activities.map((activity, activityIndex) => (
                      <div 
                        key={activityIndex}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                      >
                        <p className="text-sm text-gray-700 leading-relaxed">{activity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredSuggestions.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    暂无该类别的活动建议
                  </h3>
                  <p className="text-gray-600">
                    尝试选择其他发育领域查看更多活动
                  </p>
                </div>
              )}
            </div>

            {/* 使用提示 */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-3">💡 使用建议</h3>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>• 每天选择1-2个活动进行，避免过度刺激</li>
                <li>• 观察宝宝的反应，如果显示疲劳或不适应立即停止</li>
                <li>• 活动时间建议在宝宝精神状态好的时候进行</li>
                <li>• 不同发育领域的活动可以穿插进行，保持多样性</li>
                <li>• 记录宝宝的进步和反应，有助于调整活动内容</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              暂无活动建议
            </h3>
            <p className="text-gray-600 mb-6">
              请稍后重试获取个性化活动建议
            </p>
            <Button onClick={() => babyId && fetchActivityRecommendations(babyId)}>
              重新获取建议
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}