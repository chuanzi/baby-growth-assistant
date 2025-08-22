'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, SkeletonCard, SkeletonText } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorBoundary';
import { formatAge } from '@/utils/age-calculator';

interface Milestone {
  id: string;
  title: string;
  description: string;
  category: string;
  ageRangeMin: number;
  ageRangeMax: number;
  isCompleted: boolean;
  achievedAt: string | null;
  correctedAgeAtAchievement: number | null;
  isInCurrentRange: boolean;
  isPriority: boolean;
}

interface MilestoneData {
  baby: {
    id: string;
    name: string;
    correctedAgeInDays: number;
    correctedAge: {
      months: number;
      days: number;
    };
  };
  milestones: {
    completed: Milestone[];
    inProgress: Milestone[];
    upcoming: Milestone[];
    total: number;
  };
  statistics: {
    completedCount: number;
    inProgressCount: number;
    upcomingCount: number;
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

interface AIRecommendation {
  baby: {
    id: string;
    name: string;
    correctedAge: { months: number; days: number };
    correctedAgeInDays: number;
  };
  aiRecommendation: string;
  priorityMilestones: {
    inProgress: Milestone[];
    upcoming: Milestone[];
  };
  developmentAnalysis: {
    categoryProgress: Record<string, number>;
    strongestCategory: string;
    weakestCategory: string;
    totalCompleted: number;
  };
  activitySuggestions: {
    type: string;
    title: string;
    description: string;
    category: string;
    activities: string[];
  }[];
  recentProgress: {
    completedMilestones: Array<{
      id: string;
      achievedAt: string | null;
      milestone: { id: string; title: string; category: string };
    }>;
    recentFeeding: Array<{ id: string; type: string; timestamp: string }>;
    recentSleep: Array<{ id: string; startTime: string; endTime: string }>;
  };
}

export default function MilestonesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedBaby, setSelectedBaby] = useState<string>('');
  const [milestoneData, setMilestoneData] = useState<MilestoneData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inProgress' | 'upcoming' | 'completed'>('inProgress');
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // 选择第一个宝宝作为默认
  useEffect(() => {
    if (user?.babies && user.babies.length > 0 && !selectedBaby) {
      setSelectedBaby(user.babies[0].id);
    }
  }, [user, selectedBaby]);

  // 获取里程碑数据
  const fetchMilestones = async (babyId: string) => {
    if (!babyId) return;
    
    setDataLoading(true);
    try {
      const response = await fetch(`/api/milestones/${babyId}`);
      if (response.ok) {
        const data = await response.json();
        setMilestoneData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // 切换里程碑状态
  const toggleMilestone = async (milestoneId: string, achieved: boolean) => {
    if (!selectedBaby) return;

    try {
      const response = await fetch(`/api/milestones/${selectedBaby}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          milestoneId,
          achieved
        }),
      });

      if (response.ok) {
        // 重新获取数据
        fetchMilestones(selectedBaby);
      }
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  };

  // 获取AI推荐
  const fetchAIRecommendations = async (babyId: string) => {
    if (!babyId) return;
    
    setAiLoading(true);
    try {
      const response = await fetch(`/api/ai/milestone-recommendations/${babyId}`);
      if (response.ok) {
        const data = await response.json();
        setAiRecommendation(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBaby) {
      fetchMilestones(selectedBaby);
      fetchAIRecommendations(selectedBaby);
    }
  }, [selectedBaby]);

  // 由于有了 DashboardLayout，这里不需要再检查认证状态
  if (!user) {
    return null; // 这种情况不应该发生，因为布局会处理重定向
  }

  if (user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            还没有宝宝档案
          </h2>
          <p className="text-gray-600 mb-6">
            创建宝宝档案后即可开始追踪发育里程碑
          </p>
          <Button onClick={() => router.push('/create-profile')}>
            创建宝宝档案
          </Button>
        </div>
      </div>
    );
  }

  const renderMilestoneCard = (milestone: Milestone) => (
    <div
      key={milestone.id}
      className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-gray-200 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
              categoryColors[milestone.category as keyof typeof categoryColors]
            }`}>
              {categoryLabels[milestone.category as keyof typeof categoryLabels]}
            </span>
            {milestone.isInCurrentRange && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                当前适龄
              </span>
            )}
            {milestone.isPriority && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                重点关注
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 mb-2 leading-tight">{milestone.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            {milestone.description}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              适龄范围: {Math.floor(milestone.ageRangeMin / 30)}个月 - {Math.floor(milestone.ageRangeMax / 30)}个月
            </p>
            {milestone.isCompleted && milestone.correctedAgeAtAchievement && (
              <p className="text-xs text-green-600 font-medium">
                ✅ 完成时矫正月龄: {formatAge(
                  Math.floor(milestone.correctedAgeAtAchievement / 30), 
                  milestone.correctedAgeAtAchievement % 30
                )}
              </p>
            )}
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <button
            onClick={() => toggleMilestone(milestone.id, !milestone.isCompleted)}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all touch-friendly active:scale-95 ${
              milestone.isCompleted
                ? 'bg-green-500 border-green-500 text-white shadow-md'
                : 'border-gray-300 hover:border-green-500 hover:bg-green-50 active:bg-green-100'
            }`}
          >
            {milestone.isCompleted ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="text-gray-400 text-xl">○</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">发育里程碑</h1>
            <p className="text-gray-600 mt-1">追踪宝宝的成长发育进展</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            返回首页
          </Button>
        </div>

        {/* 宝宝选择器 */}
        {user.babies.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">选择宝宝</h3>
            <div className="flex gap-2 flex-wrap">
              {user.babies.map((baby) => (
                <button
                  key={baby.id}
                  onClick={() => setSelectedBaby(baby.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedBaby === baby.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {baby.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {dataLoading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" message="正在加载里程碑数据..." />
          </div>
        ) : milestoneData ? (
          <>
            {/* AI 推荐区域 */}
            {showRecommendations && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <h2 className="text-lg font-semibold text-gray-800">AI 个性化指导</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedBaby && fetchAIRecommendations(selectedBaby)}
                      loading={aiLoading}
                    >
                      刷新推荐
                    </Button>
                    <button
                      onClick={() => setShowRecommendations(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-gray-600">正在生成个性化推荐...</p>
                  </div>
                ) : aiRecommendation ? (
                  <div className="space-y-6">
                    {/* AI 推荐文本 */}
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <h3 className="font-medium text-blue-900 mb-2">🎯 专属发育建议</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{aiRecommendation.aiRecommendation}</p>
                    </div>

                    {/* 发展分析 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <h3 className="font-medium text-blue-900 mb-3">📊 发展分析</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">总完成数:</span>
                            <span className="font-medium">{aiRecommendation.developmentAnalysis.totalCompleted} 项</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">优势领域:</span>
                            <span className="font-medium text-green-600">
                              {categoryLabels[aiRecommendation.developmentAnalysis.strongestCategory as keyof typeof categoryLabels]}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">关注领域:</span>
                            <span className="font-medium text-orange-600">
                              {categoryLabels[aiRecommendation.developmentAnalysis.weakestCategory as keyof typeof categoryLabels]}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-blue-900">🎮 活动建议</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/milestones/activities?babyId=${selectedBaby}`)}
                            className="text-xs"
                          >
                            查看全部
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {aiRecommendation.activitySuggestions.slice(0, 2).map((suggestion, index) => (
                            <div key={index} className="border-l-2 border-blue-300 pl-3">
                              <h4 className="text-sm font-medium text-gray-800">{suggestion.title}</h4>
                              <p className="text-xs text-gray-600">{suggestion.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 重点里程碑 */}
                    {(aiRecommendation.priorityMilestones.inProgress.length > 0 || 
                      aiRecommendation.priorityMilestones.upcoming.length > 0) && (
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <h3 className="font-medium text-blue-900 mb-3">⭐ 重点关注里程碑</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiRecommendation.priorityMilestones.inProgress.slice(0, 2).map((milestone) => (
                            <div key={milestone.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="text-sm font-medium text-green-800">进行中</span>
                              </div>
                              <h4 className="font-medium text-gray-800 text-sm">{milestone.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                            </div>
                          ))}
                          {aiRecommendation.priorityMilestones.upcoming.slice(0, 2).map((milestone) => (
                            <div key={milestone.id} className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                <span className="text-sm font-medium text-orange-800">即将到来</span>
                              </div>
                              <h4 className="font-medium text-gray-800 text-sm">{milestone.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">暂无推荐数据，请稍后重试</p>
                  </div>
                )}
              </div>
            )}

            {showRecommendations === false && (
              <div className="text-center mb-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRecommendations(true)}
                  className="text-sm"
                >
                  🤖 显示 AI 指导
                </Button>
              </div>
            )}

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {milestoneData.baby.correctedAge.months}个月{milestoneData.baby.correctedAge.days}天
                </div>
                <div className="text-sm text-gray-600">当前矫正月龄</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {milestoneData.statistics.completedCount}
                </div>
                <div className="text-sm text-gray-600">已完成</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {milestoneData.statistics.inProgressCount}
                </div>
                <div className="text-sm text-gray-600">进行中</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {milestoneData.statistics.upcomingCount}
                </div>
                <div className="text-sm text-gray-600">即将到来</div>
              </div>
            </div>

            {/* 选项卡导航 - 移动端优化 */}
            <div className="bg-white rounded-xl shadow-sm p-1 mb-6">
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setActiveTab('inProgress')}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-all touch-friendly ${
                    activeTab === 'inProgress'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800 active:bg-gray-100'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">🎯</div>
                    <div className="text-xs">进行中</div>
                    <div className="text-xs opacity-75">({milestoneData.statistics.inProgressCount})</div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-all touch-friendly ${
                    activeTab === 'upcoming'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800 active:bg-gray-100'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">⏳</div>
                    <div className="text-xs">即将到来</div>
                    <div className="text-xs opacity-75">({milestoneData.statistics.upcomingCount})</div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-all touch-friendly ${
                    activeTab === 'completed'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800 active:bg-gray-100'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">🎉</div>
                    <div className="text-xs">已完成</div>
                    <div className="text-xs opacity-75">({milestoneData.statistics.completedCount})</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 里程碑列表 - 移动端优化 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'inProgress' && milestoneData.milestones.inProgress.map(renderMilestoneCard)}
              {activeTab === 'upcoming' && milestoneData.milestones.upcoming.map(renderMilestoneCard)}
              {activeTab === 'completed' && milestoneData.milestones.completed.map(renderMilestoneCard)}
              
              {milestoneData.milestones[activeTab].length === 0 && (
                <div className="col-span-full">
                  <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="text-6xl mb-4">
                      {activeTab === 'inProgress' && '🎯'}
                      {activeTab === 'upcoming' && '⏳'}
                      {activeTab === 'completed' && '🎉'}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {activeTab === 'inProgress' && '当前没有进行中的里程碑'}
                      {activeTab === 'upcoming' && '暂无即将到来的里程碑'}
                      {activeTab === 'completed' && '还没有完成任何里程碑'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {activeTab === 'inProgress' && '根据宝宝的矫正月龄，目前所有里程碑都已达成或尚未到时间'}
                      {activeTab === 'upcoming' && '很快会有新的里程碑等待宝宝去完成'}
                      {activeTab === 'completed' && '每一个小小的进步都值得庆祝，继续加油！'}
                    </p>
                    {activeTab !== 'completed' && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab('upcoming')}
                          className="touch-friendly"
                        >
                          查看即将到来
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab('completed')}
                          className="touch-friendly"
                        >
                          查看已完成
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <ErrorMessage 
              message="无法加载里程碑数据，请稍后重试" 
              onRetry={() => selectedBaby && fetchMilestones(selectedBaby)}
            />
          </div>
        )}

        {/* 浮动操作按钮 - 仅移动端 */}
        <div className="fixed bottom-6 right-6 lg:hidden">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-all touch-friendly"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}