'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
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

export default function MilestonesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedBaby, setSelectedBaby] = useState<string>('');
  const [milestoneData, setMilestoneData] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inProgress' | 'upcoming' | 'completed'>('inProgress');

  // 选择第一个宝宝作为默认
  useEffect(() => {
    if (user?.babies && user.babies.length > 0 && !selectedBaby) {
      setSelectedBaby(user.babies[0].id);
    }
  }, [user, selectedBaby]);

  // 获取里程碑数据
  const fetchMilestones = async (babyId: string) => {
    if (!babyId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/milestones/${babyId}`);
      if (response.ok) {
        const data = await response.json();
        setMilestoneData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    if (selectedBaby) {
      fetchMilestones(selectedBaby);
    }
  }, [selectedBaby]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>加载中...</p>
        </div>
      </div>
    );
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
      className="bg-white rounded-lg border-2 border-gray-100 p-4 hover:border-gray-200 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
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
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">{milestone.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            {milestone.description}
          </p>
          <p className="text-xs text-gray-500">
            适龄范围: {Math.floor(milestone.ageRangeMin / 30)}个月 - {Math.floor(milestone.ageRangeMax / 30)}个月
          </p>
          {milestone.isCompleted && milestone.correctedAgeAtAchievement && (
            <p className="text-xs text-green-600 mt-1">
              完成时矫正月龄: {formatAge(
                Math.floor(milestone.correctedAgeAtAchievement / 30), 
                milestone.correctedAgeAtAchievement % 30
              )}
            </p>
          )}
        </div>
        <div className="ml-4">
          <button
            onClick={() => toggleMilestone(milestone.id, !milestone.isCompleted)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              milestone.isCompleted
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-500'
            }`}
          >
            {milestone.isCompleted && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
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

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载里程碑数据...</p>
          </div>
        ) : milestoneData ? (
          <>
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

            {/* 选项卡导航 */}
            <div className="bg-white rounded-xl shadow-sm p-1 mb-6 inline-flex">
              <button
                onClick={() => setActiveTab('inProgress')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'inProgress'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                进行中 ({milestoneData.statistics.inProgressCount})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'upcoming'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                即将到来 ({milestoneData.statistics.upcomingCount})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'completed'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                已完成 ({milestoneData.statistics.completedCount})
              </button>
            </div>

            {/* 里程碑列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'inProgress' && milestoneData.milestones.inProgress.map(renderMilestoneCard)}
              {activeTab === 'upcoming' && milestoneData.milestones.upcoming.map(renderMilestoneCard)}
              {activeTab === 'completed' && milestoneData.milestones.completed.map(renderMilestoneCard)}
              
              {milestoneData.milestones[activeTab].length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">
                    {activeTab === 'inProgress' && '🎯'}
                    {activeTab === 'upcoming' && '⏳'}
                    {activeTab === 'completed' && '🎉'}
                  </div>
                  <p className="text-gray-600">
                    {activeTab === 'inProgress' && '当前没有进行中的里程碑'}
                    {activeTab === 'upcoming' && '暂无即将到来的里程碑'}
                    {activeTab === 'completed' && '还没有完成任何里程碑，继续加油！'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-600">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  );
}