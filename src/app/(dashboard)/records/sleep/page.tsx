'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sleepRecordSchema, type SleepRecordFormData } from '@/lib/validations';
import { getCurrentLocalDateTime, getLocalDateTimeHoursAgo, calculateDurationMinutes, formatDuration } from '@/utils/time-helpers';

export default function SleepRecordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { user } = useAuth();


  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<SleepRecordFormData>({
    resolver: zodResolver(sleepRecordSchema),
    defaultValues: {
      babyId: user?.babies?.[0]?.id || '',
      startTime: getLocalDateTimeHoursAgo(2), // 默认2小时前开始
      endTime: getCurrentLocalDateTime(),     // 默认现在结束
      timestamp: getCurrentLocalDateTime(),   // YYYY-MM-DDTHH:mm format
      notes: '',
    },
  });

  const startTime = watch('startTime');
  const endTime = watch('endTime');

  // 计算睡眠时长
  const calculateDuration = () => {
    if (startTime && endTime) {
      const durationMinutes = calculateDurationMinutes(startTime, endTime);
      if (durationMinutes > 0) {
        return formatDuration(durationMinutes);
      }
    }
    return '';
  };

  const onSubmit = async (data: SleepRecordFormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/records/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await response.json();
        setSuccess('睡眠记录添加成功！');
        reset({
          babyId: data.babyId,
          startTime: getLocalDateTimeHoursAgo(2),
          endTime: getCurrentLocalDateTime(),
          timestamp: getCurrentLocalDateTime(),
          notes: '',
        });
      } else {
        const result = await response.json();
        setError(result.error || '添加记录失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 快速设置时间的辅助函数
  const setQuickTime = (type: 'start' | 'end') => {
    const timeString = getCurrentLocalDateTime();
    
    if (type === 'start') {
      setValue('startTime', timeString);
    } else {
      setValue('endTime', timeString);
    }
  };

  // 如果没有宝宝档案，提示创建
  if (!user?.babies || user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">添加睡眠记录</h1>
            <p className="text-gray-600 mb-6">请先创建宝宝档案才能添加记录</p>
            <Button onClick={() => router.push('/create-profile')}>
              创建宝宝档案
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            添加睡眠记录
          </h1>
          <p className="text-gray-600">
            记录宝宝的睡眠情况，了解睡眠模式
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 选择宝宝 */}
            {user.babies.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择宝宝
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  {...register('babyId')}
                >
                  {user.babies.map((baby) => (
                    <option key={baby.id} value={baby.id}>
                      {baby.name}
                    </option>
                  ))}
                </select>
                {errors.babyId && (
                  <p className="mt-2 text-sm text-red-600">{errors.babyId.message}</p>
                )}
              </div>
            )}

            {/* 开始睡眠时间 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  开始睡眠时间
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickTime('start')}
                >
                  使用当前时间
                </Button>
              </div>
              <Input
                type="datetime-local"
                {...register('startTime')}
                error={errors.startTime?.message}
                helperText="选择宝宝开始睡觉的时间"
              />
            </div>

            {/* 结束睡眠时间 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  结束睡眠时间
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickTime('end')}
                >
                  使用当前时间
                </Button>
              </div>
              <Input
                type="datetime-local"
                {...register('endTime')}
                error={errors.endTime?.message}
                helperText="选择宝宝醒来的时间"
              />
            </div>

            {/* 睡眠时长显示 */}
            {calculateDuration() && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-blue-900 font-medium">睡眠时长：</span>
                  <span className="text-blue-700 text-lg font-semibold">
                    {calculateDuration()}
                  </span>
                </div>
              </div>
            )}

            {/* 记录时间 */}
            <Input
              type="datetime-local"
              label="记录时间"
              {...register('timestamp')}
              error={errors.timestamp?.message}
              helperText="默认为当前时间，可调整为实际记录时间"
            />

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注（可选）
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="记录睡眠环境、睡眠质量、中途醒来次数等..."
                {...register('notes')}
              />
            </div>

            {/* 成功信息 */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                返回首页
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                保存记录
              </Button>
            </div>
          </form>
        </div>

        {/* 使用提示 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 记录小贴士</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• 记录完整的睡眠时段，包括白天小憩和夜间睡眠</li>
            <li>• 使用&ldquo;当前时间&rdquo;按钮快速设置开始或结束时间</li>
            <li>• 可在备注中记录睡眠质量、环境因素等</li>
            <li>• 规律记录有助于发现宝宝的睡眠模式</li>
            <li>• 如果中途醒来，可以分段记录多个睡眠时段</li>
          </ul>
        </div>

        {/* 快速操作模板 */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">⚡ 快速记录</h4>
          <p className="text-gray-600 text-sm mb-3">
            对于正在进行的睡眠，可以先记录开始时间，稍后再补充结束时间
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const timeString = getCurrentLocalDateTime();
                setValue('startTime', timeString);
                setValue('timestamp', timeString);
              }}
            >
              😴 刚开始睡觉
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const timeString = getCurrentLocalDateTime();
                setValue('endTime', timeString);
              }}
            >
              😊 刚刚醒来
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}