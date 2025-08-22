import type { AgeInfo } from '@/types';
import { formatAge } from '@/utils/age-calculator';
import { clsx } from 'clsx';

interface AgeDisplayProps {
  babyName: string;
  ageInfo: AgeInfo;
  showGrowthTip?: boolean;
  className?: string;
}

export function AgeDisplay({ babyName, ageInfo, showGrowthTip = true, className }: AgeDisplayProps) {
  const prematureWeeks = 40 - (Math.floor(ageInfo.correctedAgeInDays / 7) + ageInfo.actualAge.months * 4);
  const isPremature = prematureWeeks > 0;
  
  return (
    <div className={clsx(
      'bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 rounded-2xl p-4 sm:p-6 shadow-lg',
      className
    )}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">👶</div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          宝宝 {babyName}
        </h2>
        {isPremature && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            <span>早产宝宝专属护理</span>
          </div>
        )}
      </div>
      
      {/* Mobile-first age display */}
      <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
        {/* Actual Age */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <div className="text-sm text-gray-600 font-medium">实际月龄</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-gray-800 leading-none">
              {ageInfo.actualAge.months}
            </div>
            <div className="text-sm text-gray-600">
              个月 {ageInfo.actualAge.days > 0 && `${ageInfo.actualAge.days}天`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              出生至今
            </div>
          </div>
        </div>
        
        {/* Corrected Age - Highlighted */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 border-2 border-blue-400 shadow-md transform sm:hover:scale-105 transition-transform">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="text-sm text-blue-100 font-medium">矫正月龄 ⭐</div>
          </div>
          <div className="text-center text-white">
            <div className="text-2xl sm:text-3xl font-bold leading-none">
              {ageInfo.correctedAge.months}
            </div>
            <div className="text-sm text-blue-100">
              个月 {ageInfo.correctedAge.days > 0 && `${ageInfo.correctedAge.days}天`}
            </div>
            <div className="text-xs text-blue-200 mt-1">
              发育指导基准
            </div>
          </div>
        </div>
      </div>
      
      {/* Growth insight */}
      {showGrowthTip && (
        <div className="mt-4 p-3 bg-white/50 backdrop-blur-sm rounded-lg border border-white/60">
          <div className="flex items-start gap-2">
            <div className="text-lg flex-shrink-0">💡</div>
            <div className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              <span className="font-medium">成长提示: </span>
              {isPremature 
                ? `宝宝的发育进度以矫正月龄为准，目前正处在${ageInfo.correctedAge.months}个月的发育阶段。`
                : `宝宝发育良好，继续关注各项里程碑的达成情况。`
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CompactAgeDisplayProps {
  ageInfo: AgeInfo;
  className?: string;
}

export function CompactAgeDisplay({ ageInfo, className }: CompactAgeDisplayProps) {
  return (
    <div className={clsx(
      'inline-flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2',
      className
    )}>
      <div className="text-center">
        <div className="text-xs text-gray-600">实际</div>
        <div className="text-sm font-semibold text-gray-800">
          {ageInfo.actualAge.months}月{ageInfo.actualAge.days}天
        </div>
      </div>
      <div className="w-px h-8 bg-blue-200"></div>
      <div className="text-center">
        <div className="text-xs text-blue-600 font-medium">矫正 ⭐</div>
        <div className="text-sm font-bold text-blue-800">
          {ageInfo.correctedAge.months}月{ageInfo.correctedAge.days}天
        </div>
      </div>
    </div>
  );
}