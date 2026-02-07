'use client';

import { useState } from 'react';
import { useAPI } from '@/lib/hooks/useFingerprint';

interface CommentSectionProps {
  rumorId: string;
  initialComments?: Array<{
    id: string;
    content: string;
    createdAt: Date | string;
  }>;
}

export function CommentSection({ rumorId, initialComments = [] }: CommentSectionProps) {
  const { fetchWithAuth } = useAPI();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/rumors/${rumorId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to post comment');
        return;
      }

      setComments([data.data, ...comments]);
      setNewComment('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        Anonymous Comments
        <span className="text-gray-500 text-sm font-normal">({comments.length})</span>
      </h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add context, evidence, or your thoughts... (anonymous)"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
                     text-white placeholder-gray-500 resize-none
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     transition-all"
          rows={3}
          maxLength={2000}
        />
        
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">
            {newComment.length}/2000
          </span>
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg
                       transition-colors"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to add context!
          </div>
        ) : (
          comments.map((comment) => (
            <div 
              key={comment.id}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
            >
              <p className="text-gray-200 whitespace-pre-wrap">{comment.content}</p>
              <div className="mt-2 text-xs text-gray-500">
                {formatDate(new Date(comment.createdAt))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
