'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { feedingRecordSchema, type FeedingRecordFormData } from '@/lib/validations';
import { getCurrentLocalDateTime } from '@/utils/time-helpers';

export default function FeedingRecordPage() {
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
  } = useForm<FeedingRecordFormData>({
    resolver: zodResolver(feedingRecordSchema),
    defaultValues: {
      babyId: user?.babies?.[0]?.id || '',
      type: 'breast',
      amountOrDuration: '',
      timestamp: getCurrentLocalDateTime(), // 使用本地时间
      notes: '',
    },
  });

  const feedingType = watch('type');

  const onSubmit = async (data: FeedingRecordFormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/records/feeding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await response.json();
        setSuccess('喂养记录添加成功！');
        reset({
          babyId: data.babyId,
          type: 'breast',
          amountOrDuration: '',
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

  // 如果没有宝宝档案，提示创建
  if (!user?.babies || user.babies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">添加喂养记录</h1>
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
            添加喂养记录
          </h1>
          <p className="text-gray-600">
            记录宝宝的喂养情况，帮助了解成长状态
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

            {/* 喂养类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                喂养类型
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center justify-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                  <input
                    type="radio"
                    value="breast"
                    className="sr-only"
                    {...register('type')}
                  />
                  <span className="text-sm font-medium">🤱 母乳</span>
                </label>
                <label className="flex items-center justify-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                  <input
                    type="radio"
                    value="formula"
                    className="sr-only"
                    {...register('type')}
                  />
                  <span className="text-sm font-medium">🍼 配方奶</span>
                </label>
                <label className="flex items-center justify-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                  <input
                    type="radio"
                    value="solid"
                    className="sr-only"
                    {...register('type')}
                  />
                  <span className="text-sm font-medium">🥄 辅食</span>
                </label>
              </div>
              {errors.type && (
                <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* 奶量或时长 */}
            <Input
              label={
                feedingType === 'breast' 
                  ? '喂养时长' 
                  : feedingType === 'formula' 
                    ? '配方奶量' 
                    : '辅食量'
              }
              placeholder={
                feedingType === 'breast' 
                  ? '如：15分钟' 
                  : feedingType === 'formula' 
                    ? '如：120ml' 
                    : '如：半碗米糊'
              }
              {...register('amountOrDuration')}
              error={errors.amountOrDuration?.message}
              helperText={
                feedingType === 'breast' 
                  ? '记录单次喂养的总时长' 
                  : feedingType === 'formula' 
                    ? '记录实际喝掉的奶量' 
                    : '描述辅食的种类和大概量'
              }
            />

            {/* 喂养时间 */}
            <Input
              type="datetime-local"
              label="喂养时间"
              {...register('timestamp')}
              error={errors.timestamp?.message}
              helperText="默认为当前时间，可调整为实际喂养时间"
            />

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注（可选）
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="记录宝宝的表现、喂养情况等..."
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
            <li>• 建议每次喂养后立即记录，避免遗忘</li>
            <li>• 母乳喂养记录时长，配方奶记录实际喝掉的量</li>
            <li>• 可在备注中记录宝宝的表现和特殊情况</li>
            <li>• 规律记录有助于了解宝宝的成长模式</li>
          </ul>
        </div>
      </div>
    </div>
  );
}