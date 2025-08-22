import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import type { FeedingRecord, SleepRecord } from '@/types';

interface BaseRecordCardProps {
  icon: ReactNode;
  title: string;
  timestamp: Date;
  children: ReactNode;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  onEdit?: () => void;
  onDelete?: () => void;
}

export function BaseRecordCard({
  icon,
  title,
  timestamp,
  children,
  className,
  color = 'blue',
  onEdit,
  onDelete
}: BaseRecordCardProps) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50/50',
    green: 'border-l-green-500 bg-green-50/50',
    purple: 'border-l-purple-500 bg-purple-50/50',
    orange: 'border-l-orange-500 bg-orange-50/50',
  };

  return (
    <div className={clsx(
      'bg-white rounded-lg border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow',
      colorClasses[color],
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              {format(timestamp, 'MM月dd日 HH:mm')}
            </p>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

interface FeedingRecordCardProps {
  record: FeedingRecord;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function FeedingRecordCard({ record, onEdit, onDelete, className }: FeedingRecordCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breast':
        return '🤱';
      case 'formula':
        return '🍼';
      case 'solid':
        return '🥄';
      default:
        return '🍼';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'breast':
        return '母乳';
      case 'formula':
        return '配方奶';
      case 'solid':
        return '辅食';
      default:
        return '未知';
    }
  };

  const getAmountDisplay = (type: string, amount: string) => {
    if (type === 'breast') {
      return `${amount} 分钟`;
    } else {
      return `${amount} ml`;
    }
  };

  return (
    <BaseRecordCard
      icon={getTypeIcon(record.type)}
      title={`${getTypeLabel(record.type)}喂养`}
      timestamp={record.timestamp}
      color="green"
      className={clsx('group', className)}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">用量:</span>
          <span className="font-medium text-gray-900">
            {getAmountDisplay(record.type, record.amountOrDuration)}
          </span>
        </div>
      </div>
      
      {record.notes && (
        <div className="bg-gray-50 rounded p-2 mt-2">
          <p className="text-sm text-gray-700">{record.notes}</p>
        </div>
      )}
    </BaseRecordCard>
  );
}

interface SleepRecordCardProps {
  record: SleepRecord;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function SleepRecordCard({ record, onEdit, onDelete, className }: SleepRecordCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`;
    } else {
      return `${mins}分钟`;
    }
  };

  return (
    <BaseRecordCard
      icon="😴"
      title="睡眠记录"
      timestamp={record.startTime}
      color="purple"
      className={clsx('group', className)}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">开始:</span>
          <span className="font-medium text-gray-900">
            {format(record.startTime, 'HH:mm')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">结束:</span>
          <span className="font-medium text-gray-900">
            {format(record.endTime, 'HH:mm')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">时长:</span>
        <span className="font-medium text-green-600">
          {formatDuration(record.durationMinutes)}
        </span>
      </div>
      
      {record.notes && (
        <div className="bg-gray-50 rounded p-2 mt-2">
          <p className="text-sm text-gray-700">{record.notes}</p>
        </div>
      )}
    </BaseRecordCard>
  );
}

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  icon,
  label,
  value,
  subtitle,
  color = 'blue',
  trend,
  className
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className={clsx(
      'bg-white rounded-xl shadow-sm border-2 p-4 sm:p-6 hover:shadow-md transition-shadow',
      colorClasses[color],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <div className="text-2xl font-bold text-gray-900 leading-none">
              {value}
            </div>
            <div className="text-sm font-medium text-gray-700 mt-1">
              {label}
            </div>
            {subtitle && (
              <div className="text-xs text-gray-500 mt-1">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            <svg 
              className={clsx('w-3 h-3', trend.isPositive ? 'rotate-0' : 'rotate-180')} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
}