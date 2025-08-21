'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { AgeDisplay } from '@/components/ui/AgeDisplay';
import { KnowledgeCard } from '@/components/ui/KnowledgeCard';
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              还没有宝宝档案
            </h2>
            <p className="text-gray-600 mb-6">
              创建宝宝档案，开始记录成长的每一刻
            </p>
            <Button onClick={() => router.push('/create-profile')}>
              创建宝宝档案
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentBaby = selectedBaby || user.babies[0];
  const ageInfo = currentBaby ? calculateAge(currentBaby) : null;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="space-y-6">

        {/* 宝宝选择器 (多宝宝时显示) */}
        {user.babies.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">选择宝宝</h3>
            <div className="flex gap-2 flex-wrap">
              {user.babies.map((baby) => (
                <button
                  key={baby.id}
                  onClick={() => setSelectedBaby(baby)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedBaby?.id === baby.id
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主要内容区 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 年龄显示卡片 */}
            {currentBaby && ageInfo && (
              <AgeDisplay babyName={currentBaby.name} ageInfo={ageInfo} />
            )}

            {/* AI 每日内容卡片 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">今日指导</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentBaby && fetchDailyContent(currentBaby)}
                  loading={aiLoading}
                >
                  刷新
                </Button>
              </div>

              {aiLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">正在为您生成个性化内容...</p>
                </div>
              ) : dailyContent ? (
                <KnowledgeCard content={dailyContent} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无内容，请稍后重试</p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 快速操作 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/records/feeding')}
                >
                  📝 记录喂养
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/records/sleep')}
                >
                  😴 记录睡眠
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/milestones')}
                >
                  🎯 里程碑追踪
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/records')}
                >
                  📊 记录时间线
                </Button>
              </div>
            </div>

            {/* 今日记录摘要 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">今日记录</h3>
                <div className="flex gap-2">
                  {currentBaby && <ExportButton baby={currentBaby} />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => currentBaby && fetchTodayStats(currentBaby)}
                    loading={statsLoading}
                  >
                    刷新
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">喂养次数</span>
                  <span className="font-medium">
                    {statsLoading ? '...' : `${todayStats.feedingCount} 次`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">睡眠时长</span>
                  <span className="font-medium">
                    {statsLoading ? '...' : `${todayStats.sleepHours} 小时`}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  {statsLoading ? '正在加载...' : '点击刷新获取最新数据'}
                </div>
              </div>
            </div>

            {/* 里程碑进度 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">发育里程碑</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">已完成</span>
                  <span className="font-medium">0 项</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">进行中</span>
                  <span className="font-medium">0 项</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => router.push('/milestones')}
                >
                  查看详情
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}