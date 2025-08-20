import type { AgeInfo } from '@/types';
import { formatAge } from '@/utils/age-calculator';

interface AgeDisplayProps {
  babyName: string;
  ageInfo: AgeInfo;
}

export function AgeDisplay({ babyName, ageInfo }: AgeDisplayProps) {
  return (
    <div className="bg-gradient-to-r from-pink-100 to-blue-100 rounded-xl p-6 mb-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          宝宝 {babyName}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">实际月龄</div>
            <div className="text-xl font-semibold text-gray-800">
              {formatAge(ageInfo.actualAge.months, ageInfo.actualAge.days)}
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border-2 border-blue-200">
            <div className="text-sm text-blue-600 mb-1 font-medium">矫正月龄</div>
            <div className="text-xl font-bold text-blue-800">
              {formatAge(ageInfo.correctedAge.months, ageInfo.correctedAge.days)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              发育指导基准
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}