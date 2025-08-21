'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import type { Baby } from '@/types';

interface FeedingRecord {
  id: string;
  type: 'breast' | 'formula' | 'solid';
  amountOrDuration: string;
  timestamp: string;
  notes?: string;
}

interface SleepRecord {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timestamp: string;
  notes?: string;
}

interface TimelineRecord {
  id: string;
  type: 'feeding' | 'sleep';
  timestamp: string;
  data: FeedingRecord | SleepRecord;
}

export default function RecordsTimelinePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [records, setRecords] = useState<TimelineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 选择第一个宝宝作为默认显示
  useEffect(() => {
    if (user?.babies && user.babies.length > 0 && !selectedBaby) {
      setSelectedBaby(user.babies[0]);
    }
  }, [user, selectedBaby]);

  // 获取记录数据
  const fetchRecords = async () => {
    if (!selectedBaby) return;

    setLoading(true);
    try {
      // 并行获取喂养和睡眠记录
      const [feedingResponse, sleepResponse] = await Promise.all([
        fetch(`/api/records/feeding?babyId=${selectedBaby.id}&date=${selectedDate}&limit=50`),
        fetch(`/api/records/sleep?babyId=${selectedBaby.id}&date=${selectedDate}&limit=50`)
      ]);

      const timelineRecords: TimelineRecord[] = [];

      if (feedingResponse.ok) {
        const feedingData = await feedingResponse.json();
        if (feedingData.records && Array.isArray(feedingData.records)) {
          feedingData.records.forEach((record: FeedingRecord) => {
            timelineRecords.push({
              id: `feeding-${record.id}`,
              type: 'feeding',
              timestamp: record.timestamp,
              data: record,
            });
          });
        }
      }

      if (sleepResponse.ok) {
        const sleepData = await sleepResponse.json();
        if (sleepData.records && Array.isArray(sleepData.records)) {
          sleepData.records.forEach((record: SleepRecord) => {
            timelineRecords.push({
              id: `sleep-${record.id}`,
              type: 'sleep',
              timestamp: record.timestamp,
              data: record,
            });
          });
        }
      }

      // 按时间排序（最新的在前）
      timelineRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecords(timelineRecords);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBaby) {
      fetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBaby, selectedDate]);

  // 如果没有宝宝档案，提示创建
  if (!user?.babies || user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">记录时间线</h1>
            <p className="text-gray-600 mb-6">请先创建宝宝档案才能查看记录</p>
            <Button onClick={() => router.push('/create-profile')}>
              创建宝宝档案
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 格式化时间显示
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化睡眠时长
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
  };

  // 获取喂养类型图标和文本
  const getFeedingTypeInfo = (type: string) => {
    switch (type) {
      case 'breast':
        return { icon: '🤱', text: '母乳' };
      case 'formula':
        return { icon: '🍼', text: '配方奶' };
      case 'solid':
        return { icon: '🥄', text: '辅食' };
      default:
        return { icon: '🍼', text: '未知' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">记录时间线</h1>
            <p className="text-gray-600">查看宝宝的成长记录</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            返回首页
          </Button>
        </div>

        {/* 宝宝选择器和日期选择器 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* 宝宝选择器 */}
            {user.babies.length > 1 && (
              <div className="flex flex-wrap gap-2">
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
            )}

            {/* 日期选择器 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">查看日期：</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 快速操作按钮 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">快速添加记录</h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/records/feeding')}
            >
              📝 添加喂养记录
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/records/sleep')}
            >
              😴 添加睡眠记录
            </Button>
          </div>
        </div>

        {/* 记录时间线 */}
        <div className="bg-white rounded-xl shadow-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">正在加载记录...</p>
            </div>
          ) : records.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {records.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {record.type === 'feeding' ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {getFeedingTypeInfo((record.data as FeedingRecord).type).icon}
                            </span>
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {getFeedingTypeInfo((record.data as FeedingRecord).type).text}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {(record.data as FeedingRecord).amountOrDuration}
                              </p>
                            </div>
                          </div>
                          {(record.data as FeedingRecord).notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              备注：{(record.data as FeedingRecord).notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">😴</span>
                            <div>
                              <h4 className="font-medium text-gray-800">睡眠</h4>
                              <p className="text-sm text-gray-600">
                                {formatTime((record.data as SleepRecord).startTime)} - {formatTime((record.data as SleepRecord).endTime)}
                                <span className="ml-2 text-blue-600 font-medium">
                                  ({formatDuration((record.data as SleepRecord).durationMinutes)})
                                </span>
                              </p>
                            </div>
                          </div>
                          {(record.data as SleepRecord).notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              备注：{(record.data as SleepRecord).notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {formatTime(record.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedDate === new Date().toISOString().split('T')[0] ? '今天还没有记录' : '当天没有记录'}
              </h3>
              <p className="text-gray-600 mb-6">
                开始记录宝宝的日常活动，建立成长档案
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => router.push('/records/feeding')}>
                  添加喂养记录
                </Button>
                <Button variant="outline" onClick={() => router.push('/records/sleep')}>
                  添加睡眠记录
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        {records.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📊 当日统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">总记录数：</span>
                <span className="font-medium text-blue-900">{records.length}</span>
              </div>
              <div>
                <span className="text-blue-700">喂养次数：</span>
                <span className="font-medium text-blue-900">
                  {records.filter(r => r.type === 'feeding').length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">睡眠次数：</span>
                <span className="font-medium text-blue-900">
                  {records.filter(r => r.type === 'sleep').length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">总睡眠：</span>
                <span className="font-medium text-blue-900">
                  {formatDuration(
                    records
                      .filter(r => r.type === 'sleep')
                      .reduce((sum, r) => sum + (r.data as SleepRecord).durationMinutes, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}