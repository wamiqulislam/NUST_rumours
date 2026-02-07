'use client';

import Link from 'next/link';
import { TruthScoreGauge } from './TruthScoreGauge';

interface RumorCardProps {
  rumorId: string;
  content: string;
  truthScore: number;
  voteCount: number;
  status: 'open' | 'verified' | 'disputed' | 'deleted';
  createdAt: Date | string;
}

export function RumorCard({ 
  rumorId, 
  content, 
  truthScore, 
  voteCount, 
  status,
  createdAt 
}: RumorCardProps) {
  const date = new Date(createdAt);
  const timeAgo = getTimeAgo(date);
  
  // Truncate content for preview
  const preview = content.length > 200 
    ? content.substring(0, 200) + '...' 
    : content;

  // Status badge
  const StatusBadge = () => {
    if (status === 'open') return null;
    
    const styles = {
      verified: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      disputed: 'bg-red-500/20 text-red-400 border-red-500/50',
      deleted: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };

    const labels = {
      verified: '✓ Verified',
      disputed: '✗ Disputed',
      deleted: '🗑 Deleted',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Link href={`/rumor/${rumorId}`}>
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 
                      border border-gray-700/50 rounded-2xl p-6
                      hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10
                      transition-all duration-300 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">{timeAgo}</span>
            <StatusBadge />
          </div>
          <TruthScoreGauge score={truthScore} size="sm" showLabel={false} status={status} />
        </div>

        {/* Content */}
        <p className="text-gray-200 text-base leading-relaxed mb-4
                      group-hover:text-white transition-colors">
          {preview}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M5 15l7-7 7 7" />
              </svg>
              {voteCount} votes
            </span>
          </div>
          
          <span className="text-purple-400 opacity-0 group-hover:opacity-100 
                           transition-opacity flex items-center gap-1">
            View details
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}
