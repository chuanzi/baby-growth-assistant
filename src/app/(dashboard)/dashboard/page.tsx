'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { AgeDisplay } from '@/components/ui/AgeDisplay';
import { KnowledgeCard } from '@/components/ui/KnowledgeCard';
import { StatsCard } from '@/components/ui/RecordCard';
import { LoadingSpinner, SkeletonCard, SkeletonText } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorBoundary';
import { ExportButton } from '@/components/export/ExportButton';
import { calculateAge } from '@/utils/age-calculator';
import type { PersonalizedContent, Baby } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dailyContent, setDailyContent] = useState<PersonalizedContent | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [todayStats, setTodayStats] = useState({
    feedingCount: 0,
    sleepHours: 0,
    milestonesCompleted: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // 选择第一个宝宝作为默认显示
  useEffect(() => {
    if (user?.babies && user.babies.length > 0 && !selectedBaby) {
      setSelectedBaby(user.babies[0]);
    }
  }, [user, selectedBaby]);

  // 获取AI生成的每日内容
  const fetchDailyContent = async (baby: Baby) => {
    if (!baby) return;
    
    setAiLoading(true);
    try {
      const response = await fetch(`/api/ai/daily-content/${baby.id}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setDailyContent(data.content);
      }
    } catch (error) {
      console.error('Failed to fetch daily content:', error);
      // 使用默认内容
      const ageInfo = calculateAge(baby);
      const defaultContent: PersonalizedContent = {
        title: '今日育儿小贴士',
        content: `${baby.name}目前矫正月龄${ageInfo.correctedAge.months}个月${ageInfo.correctedAge.days}天，每天的成长都值得记录。建议继续关注宝宝的日常表现，保持规律的作息和营养补充。`,
        actionItems: [
          '观察宝宝的睡眠模式',
          '记录今日的喂养情况',
          '和宝宝进行适龄的互动游戏'
        ],
        tags: ['#日常护理', '#成长观察'],
        urgencyLevel: 'low'
      };
      setDailyContent(defaultContent);
    } finally {
      setAiLoading(false);
    }
  };

  // 获取今日统计数据
  const fetchTodayStats = async (baby: Baby) => {
    if (!baby) return;
    
    setStatsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // 并行获取喂养和睡眠统计
      const [feedingResponse, sleepResponse] = await Promise.all([
        fetch(`/api/records/feeding?babyId=${baby.id}&date=${today}`),
        fetch(`/api/records/sleep?babyId=${baby.id}&date=${today}`)
      ]);
      
      const stats = {
        feedingCount: 0,
        sleepHours: 0,
        milestonesCompleted: 0,
      };
      
      if (feedingResponse.ok) {
        const feedingData = await feedingResponse.json();
        stats.feedingCount = feedingData.statistics?.totalFeedings || 0;
      }
      
      if (sleepResponse.ok) {
        const sleepData = await sleepResponse.json();
        stats.sleepHours = sleepData.statistics?.totalSleepHours || 0;
      }
      
      // TODO: 获取里程碑完成数据
      // const milestonesResponse = await fetch(`/api/milestones/${baby.id}?completed=today`);
      
      setTodayStats(stats);
    } catch (error) {
      console.error('Failed to fetch today stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBaby) {
      fetchDailyContent(selectedBaby);
      fetchTodayStats(selectedBaby);
    }
  }, [selectedBaby]);

  // 由于有了 DashboardLayout，这里不需要再检查认证状态
  if (!user) {
    return null; // 这种情况不应该发生，因为布局会处理重定向
  }

  // 空状态：没有宝宝档案
  if (user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-6">👶</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
              欢迎使用宝宝成长助手
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              创建宝宝档案，开始记录珍贵的成长时刻
            </p>
            <Button 
              onClick={() => router.push('/create-profile')}
              className="w-full h-12 text-base font-medium mb-4"
            >
              创建宝宝档案
            </Button>
            
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl mb-1">📊</div>
                <div className="text-xs text-gray-700">成长追踪</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs text-gray-700">里程碑</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl mb-1">🤖</div>
                <div className="text-xs text-gray-700">AI指导</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBaby = selectedBaby || user.babies[0];
  const ageInfo = currentBaby ? calculateAge(currentBaby) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            欢迎回来
          </h1>
          <p className="text-gray-600">关注宝宝每天的成长变化</p>
        </div>

        {/* 宝宝选择器 (多宝宝时显示) */}
        {user.babies.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">选择宝宝</h3>
            <div className="flex gap-2 flex-wrap">
              {user.babies.map((baby) => (
                <button
                  key={baby.id}
                  onClick={() => setSelectedBaby(baby)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedBaby?.id === baby.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                  }`}
                >
                  {baby.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Today's Stats Cards - Mobile First */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatsCard
            icon="🍼"
            label="今日喂养"
            value={statsLoading ? '...' : todayStats.feedingCount}
            subtitle="次"
            color="green"
            className="min-h-[80px]"
          />
          <StatsCard
            icon="😴"
            label="睡眠时长"
            value={statsLoading ? '...' : `${todayStats.sleepHours}h`}
            subtitle="小时"
            color="purple"
            className="min-h-[80px]"
          />
          <StatsCard
            icon="🎯"
            label="里程碑"
            value={todayStats.milestonesCompleted}
            subtitle="个完成"
            color="orange"
            className="min-h-[80px]"
          />
          <StatsCard
            icon="📊"
            label="成长天数"
            value={ageInfo ? ageInfo.correctedAgeInDays : 0}
            subtitle="天"
            color="blue"
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主要内容区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 年龄显示卡片 */}
            {currentBaby && ageInfo ? (
              <AgeDisplay babyName={currentBaby.name} ageInfo={ageInfo} />
            ) : (
              <SkeletonCard />
            )}

            {/* AI 每日内容卡片 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  今日指导
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentBaby && fetchDailyContent(currentBaby)}
                  loading={aiLoading}
                  className="touch-friendly"
                >
                  刷新
                </Button>
              </div>

              {aiLoading ? (
                <div className="py-8">
                  <LoadingSpinner size="lg" message="正在为您生成个性化内容..." />
                </div>
              ) : dailyContent ? (
                <KnowledgeCard content={dailyContent} />
              ) : (
                <ErrorMessage 
                  message="暂无内容，请稍后重试" 
                  onRetry={() => currentBaby && fetchDailyContent(currentBaby)}
                />
              )}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 快速操作 - 移动端优化 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="h-12 justify-start touch-friendly"
                  onClick={() => router.push('/records/feeding')}
                >
                  🍼 记录喂养
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 justify-start touch-friendly"
                  onClick={() => router.push('/records/sleep')}
                >
                  😴 记录睡眠
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 justify-start touch-friendly"
                  onClick={() => router.push('/milestones')}
                >
                  🎯 里程碑追踪
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 justify-start touch-friendly"
                  onClick={() => router.push('/records')}
                >
                  📊 记录历史
                </Button>
              </div>
            </div>

            {/* 今日记录详情 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">今日详情</h3>
                <div className="flex gap-2">
                  {currentBaby && <ExportButton baby={currentBaby} />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => currentBaby && fetchTodayStats(currentBaby)}
                    loading={statsLoading}
                    className="touch-friendly"
                  >
                    刷新
                  </Button>
                </div>
              </div>

              {statsLoading ? (
                <div className="space-y-3">
                  <SkeletonText lines={3} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🍼</span>
                      <span className="text-gray-600">喂养次数</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {todayStats.feedingCount} 次
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">😴</span>
                      <span className="text-gray-600">睡眠时长</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {todayStats.sleepHours} 小时
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-center pt-2">
                    数据实时更新
                  </div>
                </div>
              )}
            </div>

            {/* 里程碑进度预览 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl">🎯</span>
                发育里程碑
              </h3>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 font-medium">已完成</span>
                    <span className="text-lg font-bold text-green-700">0 项</span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 font-medium">进行中</span>
                    <span className="text-lg font-bold text-blue-700">0 项</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-10 touch-friendly"
                  onClick={() => router.push('/milestones')}
                >
                  查看全部里程碑 →
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部快速访问按钮 - 仅移动端显示 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden">
          <div className="flex justify-center">
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/records/feeding')}
                className="bg-green-500 text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                <span className="text-xl">🍼</span>
              </button>
              <button
                onClick={() => router.push('/records/sleep')}
                className="bg-purple-500 text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                <span className="text-xl">😴</span>
              </button>
              <button
                onClick={() => router.push('/milestones')}
                className="bg-orange-500 text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                <span className="text-xl">🎯</span>
              </button>
            </div>
          </div>
        </div>

        {/* 底部安全区域 - 移动端 */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  );
}