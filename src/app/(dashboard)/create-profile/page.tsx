'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AgeDisplay } from '@/components/ui/AgeDisplay';
import { babyProfileSchema, type BabyProfileFormData } from '@/lib/validations';
import { calculateAge } from '@/utils/age-calculator';
import type { Baby, AgeInfo } from '@/types';

export default function CreateProfilePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAge, setPreviewAge] = useState<{baby: Baby, ageInfo: AgeInfo} | null>(null);
  const router = useRouter();
  const { updateUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BabyProfileFormData>({
    resolver: zodResolver(babyProfileSchema),
    defaultValues: {
      name: '',
      birthDate: '',
      gestationalWeeks: 40,
      gestationalDays: 0,
    },
  });

  const watchedValues = watch();

  // 监听表单变化更新预览
  React.useEffect(() => {
    const updateAgePreview = () => {
      if (watchedValues.birthDate && watchedValues.gestationalWeeks) {
        try {
          const mockBaby = {
            id: 'preview',
            userId: 'preview',
            name: watchedValues.name || '宝宝',
            birthDate: new Date(watchedValues.birthDate),
            gestationalWeeks: watchedValues.gestationalWeeks,
            gestationalDays: watchedValues.gestationalDays || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const ageInfo = calculateAge(mockBaby);
          setPreviewAge({ baby: mockBaby, ageInfo });
        } catch {
          setPreviewAge(null);
        }
      } else {
        setPreviewAge(null);
      }
    };
    
    updateAgePreview();
  }, [watchedValues.birthDate, watchedValues.gestationalWeeks, watchedValues.gestationalDays, watchedValues.name]);

  const onSubmit = async (data: BabyProfileFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/babies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        // 更新用户状态，添加新宝宝
        updateUser({ babies: [result.baby] });
        router.push('/dashboard');
      } else {
        const result = await response.json();
        setError(result.error || '创建档案失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            创建宝宝档案
          </h1>
          <p className="text-gray-600">
            告诉我们关于宝宝的基本信息，我们将为您提供个性化的成长指导
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 宝宝昵称 */}
            <Input
              label="宝宝昵称"
              placeholder="请输入宝宝昵称（如：豆豆、小明）"
              {...register('name')}
              error={errors.name?.message}
            />

            {/* 出生日期 */}
            <Input
              type="date"
              label="出生日期"
              {...register('birthDate')}
              error={errors.birthDate?.message}
              helperText="请选择宝宝的实际出生日期"
            />

            {/* 出生孕周 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出生孕周
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="20"
                    max="44"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register('gestationalWeeks', { valueAsNumber: true })}
                    onChange={(e) => {
                      setValue('gestationalWeeks', parseInt(e.target.value) || 40);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">周</span>
                  </div>
                </div>
                {errors.gestationalWeeks && (
                  <p className="mt-2 text-sm text-red-600">{errors.gestationalWeeks.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  额外天数
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register('gestationalDays', { valueAsNumber: true })}
                    onChange={(e) => {
                      setValue('gestationalDays', parseInt(e.target.value) || 0);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm">天</span>
                  </div>
                </div>
                {errors.gestationalDays && (
                  <p className="mt-2 text-sm text-red-600">{errors.gestationalDays.message}</p>
                )}
              </div>
            </div>

            {/* 孕周说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">什么是出生孕周？</h4>
              <p className="text-blue-800 text-sm leading-relaxed">
                出生孕周是指宝宝出生时妈妈怀孕的周数。例如：&ldquo;32周+3天&rdquo; 表示怀孕32周又3天时出生。
                <br />
                • <strong>足月儿</strong>：37-42周出生
                <br />
                • <strong>早产儿</strong>：37周前出生
                <br />
                这个信息对于计算矫正月龄非常重要！
              </p>
            </div>

            {/* 年龄预览 */}
            {previewAge && (
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">年龄预览</h4>
                <AgeDisplay 
                  babyName={previewAge.baby.name}
                  ageInfo={previewAge.ageInfo}
                />
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
                onClick={() => router.back()}
                className="flex-1"
              >
                返回
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                创建档案
              </Button>
            </div>
          </form>
        </div>

        {/* 隐私保护说明 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔒 您的信息将被安全保护，仅用于提供个性化成长指导</p>
        </div>
      </div>
    </div>
  );
}