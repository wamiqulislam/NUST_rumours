'use client';

interface TruthScoreGaugeProps {
  score: number; // 0 to 1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  status?: 'open' | 'verified' | 'disputed' | 'deleted';
}

export function TruthScoreGauge({ 
  score, 
  size = 'md', 
  showLabel = true,
  status = 'open'
}: TruthScoreGaugeProps) {
  // Clamp score between 0 and 1
  const clampedScore = Math.max(0, Math.min(1, score));
  
  // Size configurations
  const sizes = {
    sm: { width: 60, height: 8, fontSize: 'text-xs' },
    md: { width: 120, height: 12, fontSize: 'text-sm' },
    lg: { width: 200, height: 16, fontSize: 'text-base' },
  };
  
  const { width, height, fontSize } = sizes[size];
  
  // Calculate color based on score
  const getColor = () => {
    if (status === 'deleted') return 'bg-gray-500';
    if (status === 'verified') return 'bg-emerald-500';
    if (status === 'disputed') return 'bg-red-500';
    
    if (clampedScore >= 0.75) return 'bg-emerald-500';
    if (clampedScore >= 0.5) return 'bg-amber-500';
    if (clampedScore >= 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  // Get status label
  const getStatusLabel = () => {
    if (status === 'verified') return 'Verified';
    if (status === 'disputed') return 'Disputed';
    if (status === 'deleted') return 'Deleted';
    if (clampedScore >= 0.75) return 'Likely True';
    if (clampedScore >= 0.5) return 'Uncertain';
    if (clampedScore >= 0.25) return 'Questionable';
    return 'Likely False';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Gauge bar */}
      <div 
        className="bg-gray-700 rounded-full overflow-hidden"
        style={{ width, height }}
      >
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${clampedScore * 100}%` }}
        />
      </div>
      
      {/* Labels */}
      {showLabel && (
        <div className={`flex items-center gap-2 ${fontSize}`}>
          <span className="text-gray-400">{(clampedScore * 100).toFixed(0)}%</span>
          <span className={`font-medium ${
            status === 'verified' ? 'text-emerald-400' :
            status === 'disputed' ? 'text-red-400' :
            status === 'deleted' ? 'text-gray-400' :
            'text-gray-300'
          }`}>
            {getStatusLabel()}
          </span>
        </div>
      )}
    </div>
  );
}

// Circular gauge variant
export function TruthScoreCircle({ 
  score, 
  size = 'md',
  status = 'open'
}: TruthScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(1, score));
  
  const sizes = {
    sm: { size: 40, stroke: 3 },
    md: { size: 64, stroke: 4 },
    lg: { size: 96, stroke: 6 },
  };
  
  const { size: circleSize, stroke } = sizes[size];
  const radius = (circleSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore * circumference);
  
  const getColor = () => {
    if (status === 'deleted') return '#6b7280';
    if (status === 'verified') return '#10b981';
    if (status === 'disputed') return '#ef4444';
    
    if (clampedScore >= 0.75) return '#10b981';
    if (clampedScore >= 0.5) return '#f59e0b';
    if (clampedScore >= 0.25) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: circleSize, height: circleSize }}>
      <svg 
        width={circleSize} 
        height={circleSize} 
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={stroke}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold" style={{ fontSize: circleSize * 0.25 }}>
          {(clampedScore * 100).toFixed(0)}
        </span>
      </div>
    </div>
  );
}
