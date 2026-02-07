'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { TruthScoreCircle } from '@/components/TruthScoreGauge';
import { VotePanel } from '@/components/VotePanel';
import { CommentSection } from '@/components/CommentSection';

interface RumorDetails {
  rumorId: string;
  content: string;
  truthScore: number;
  voteCount: number;
  status: 'open' | 'verified' | 'disputed' | 'deleted';
  createdAt: string;
  isLocked: boolean;
  references: {
    incoming: string[];
    outgoing: string[];
  };
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

export default function RumorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rumor, setRumor] = useState<RumorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRumor();
  }, [id]);

  const fetchRumor = async () => {
    try {
      const response = await fetch(`/api/rumors/${id}`);
      const data = await response.json();

      if (data.success) {
        setRumor(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to load rumor');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSuccess = (newScore: number, newStatus: string) => {
    if (rumor) {
      setRumor({
        ...rumor,
        truthScore: newScore,
        voteCount: rumor.voteCount + 1,
        status: newStatus as RumorDetails['status'],
        isLocked: newStatus !== 'open',
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading rumor...</p>
        </div>
      </div>
    );
  }

  if (error || !rumor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">❓</div>
        <h1 className="text-2xl font-bold mb-2">Rumor Not Found</h1>
        <p className="text-gray-400 mb-6">{error || 'This rumor may have been deleted.'}</p>
        <Link 
          href="/"
          className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium"
        >
          Back to Feed
        </Link>
      </div>
    );
  }

  const date = new Date(rumor.createdAt);

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Feed
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rumor card */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 
                          border border-gray-700/50 rounded-2xl p-8">
            {/* Status badge */}
            {rumor.status !== 'open' && (
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                rumor.status === 'verified' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : rumor.status === 'disputed'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
              }`}>
                {rumor.status === 'verified' && '✓ Verified Truth'}
                {rumor.status === 'disputed' && '✗ Disputed'}
                {rumor.status === 'deleted' && '🗑 Deleted'}
              </div>
            )}

            {/* Content */}
            <p className="text-xl text-gray-100 leading-relaxed whitespace-pre-wrap">
              {rumor.content}
            </p>

            {/* Meta */}
            <div className="mt-6 pt-6 border-t border-gray-700/50 flex items-center justify-between text-sm text-gray-500">
              <span>Posted {date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}</span>
              <span>{rumor.voteCount} votes</span>
            </div>
          </div>

          {/* References */}
          {(rumor.references.incoming.length > 0 || rumor.references.outgoing.length > 0) && (
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Related Rumors</h3>
              
              {rumor.references.outgoing.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm text-gray-400 mb-2">References</h4>
                  <div className="flex flex-wrap gap-2">
                    {rumor.references.outgoing.map((refId) => (
                      <Link 
                        key={refId}
                        href={`/rumor/${refId}`}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30"
                      >
                        #R{refId.slice(0, 8)}...
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {rumor.references.incoming.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Referenced by</h4>
                  <div className="flex flex-wrap gap-2">
                    {rumor.references.incoming.map((refId) => (
                      <Link 
                        key={refId}
                        href={`/rumor/${refId}`}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                      >
                        #R{refId.slice(0, 8)}...
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <CommentSection 
            rumorId={rumor.rumorId} 
            initialComments={rumor.comments.map(c => ({
              ...c,
              createdAt: new Date(c.createdAt),
            }))}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Truth Score */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 
                          border border-gray-700/50 rounded-2xl p-6 text-center">
            <h3 className="text-sm text-gray-400 mb-4">Truth Score</h3>
            <div className="flex justify-center mb-4">
              <TruthScoreCircle 
                score={rumor.truthScore} 
                size="lg" 
                status={rumor.status}
              />
            </div>
            <p className="text-gray-400 text-sm">
              Based on {rumor.voteCount} credibility-weighted votes
            </p>
          </div>

          {/* Vote Panel */}
          <VotePanel
            rumorId={rumor.rumorId}
            currentScore={rumor.truthScore}
            voteCount={rumor.voteCount}
            status={rumor.status}
            onVoteSuccess={handleVoteSuccess}
          />

          {/* Info box */}
          <div className="bg-gray-800/30 rounded-xl p-4 text-sm text-gray-400">
            <h4 className="font-medium text-white mb-2">How voting works</h4>
            <ul className="space-y-2">
              <li>• Your vote is anonymous and private</li>
              <li>• Votes are weighted by credibility</li>
              <li>• Accurate voting increases your influence</li>
              <li>• Rumors lock at 75% (verified) or 25% (disputed)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
