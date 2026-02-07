'use client';

import { useState } from 'react';
import { useAPI } from '@/lib/hooks/useFingerprint';

interface VotePanelProps {
  rumorId: string;
  currentScore: number;
  voteCount: number;
  status: 'open' | 'verified' | 'disputed' | 'deleted';
  onVoteSuccess?: (newScore: number, newStatus: string) => void;
}

export function VotePanel({ 
  rumorId, 
  currentScore, 
  voteCount,
  status,
  onVoteSuccess 
}: VotePanelProps) {
  const { fetchWithAuth, fingerprint } = useAPI();
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedAs, setVotedAs] = useState<'verify' | 'dispute' | null>(null);
  const [voteResult, setVoteResult] = useState<{
    yourCredibility: number;
    effectiveWeight: number;
  } | null>(null);

  const isLocked = status !== 'open';

  const handleVote = async (vote: 'verify' | 'dispute') => {
    if (!fingerprint || isLocked || isVoting) return;

    setIsVoting(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/rumors/${rumorId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote, fingerprint }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to vote');
        return;
      }

      setVotedAs(vote);
      setVoteResult({
        yourCredibility: data.data.yourCredibility,
        effectiveWeight: data.data.effectiveWeight,
      });

      onVoteSuccess?.(data.data.truthScore, data.data.status);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  if (isLocked) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 text-center">
        <div className={`text-lg font-semibold mb-2 ${
          status === 'verified' ? 'text-emerald-400' : 
          status === 'disputed' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {status === 'verified' && '✓ Verified'}
          {status === 'disputed' && '✗ Disputed'}
          {status === 'deleted' && '🗑 Deleted'}
        </div>
        <p className="text-gray-400 text-sm">
          This rumor is locked and no longer accepting votes.
        </p>
        <div className="text-gray-500 text-sm mt-2">
          {voteCount} votes cast
        </div>
      </div>
    );
  }

  if (votedAs) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 text-center">
        <div className={`text-lg font-semibold mb-2 ${
          votedAs === 'verify' ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {votedAs === 'verify' ? '✓ You Verified' : '✗ You Disputed'}
        </div>
        <p className="text-gray-400 text-sm">
          Your vote has been recorded anonymously.
        </p>
        {voteResult && (
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div>Your credibility: {(voteResult.yourCredibility * 100).toFixed(0)}%</div>
            <div>Vote weight: {(voteResult.effectiveWeight * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 text-center">
        Cast Your Vote
      </h3>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => handleVote('verify')}
          disabled={isVoting || !fingerprint}
          className="flex-1 py-4 px-6 rounded-xl font-semibold text-white 
                     bg-gradient-to-r from-emerald-600 to-emerald-500
                     hover:from-emerald-500 hover:to-emerald-400
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 transform hover:scale-105
                     shadow-lg shadow-emerald-500/20"
        >
          <div className="text-2xl mb-1">✓</div>
          <div>Verify</div>
          <div className="text-xs opacity-75">This is TRUE</div>
        </button>

        <button
          onClick={() => handleVote('dispute')}
          disabled={isVoting || !fingerprint}
          className="flex-1 py-4 px-6 rounded-xl font-semibold text-white 
                     bg-gradient-to-r from-red-600 to-red-500
                     hover:from-red-500 hover:to-red-400
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 transform hover:scale-105
                     shadow-lg shadow-red-500/20"
        >
          <div className="text-2xl mb-1">✗</div>
          <div>Dispute</div>
          <div className="text-xs opacity-75">This is FALSE</div>
        </button>
      </div>

      <p className="text-gray-500 text-xs text-center mt-4">
        Your vote is anonymous and weighted by your credibility score.
      </p>
    </div>
  );
}
