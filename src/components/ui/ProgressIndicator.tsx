import { clsx } from 'clsx';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'purple';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  progress,
  size = 'md',
  color = 'blue',
  showPercentage = false,
  label,
  className
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{clampedProgress.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={clsx(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={clsx(
            'h-full transition-all duration-300 ease-out rounded-full',
            colorClasses[color]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  showPercentage = true,
  className
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {clampedProgress.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

interface StepsProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  className?: string;
}

export function StepsProgress({
  currentStep,
  totalSteps,
  steps,
  className
}: StepsProgressProps) {
  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className={clsx(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                {
                  'bg-blue-600 text-white': isCompleted || isCurrent,
                  'bg-gray-200 text-gray-500': isPending,
                }
              )}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              {index < totalSteps - 1 && (
                <div className={clsx(
                  'flex-1 h-0.5 mx-2',
                  isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                )} />
              )}
            </div>
          );
        })}
      </div>
      {steps && (
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={clsx(
                'text-xs text-center flex-1',
                {
                  'text-blue-600 font-medium': index + 1 <= currentStep,
                  'text-gray-500': index + 1 > currentStep,
                }
              )}
            >
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}