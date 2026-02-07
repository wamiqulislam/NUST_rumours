'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '@/lib/hooks/useFingerprint';

export function RumorSubmitForm() {
  const router = useRouter();
  const { fetchWithAuth } = useAPI();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterFeedback, setFilterFeedback] = useState<{
    approved: boolean;
    reasons: string[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setFilterFeedback(null);

    try {
      const response = await fetchWithAuth('/api/rumors', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.reasons) {
          setFilterFeedback({
            approved: false,
            reasons: data.reasons,
          });
        }
        setError(data.error || 'Failed to submit rumor');
        return;
      }

      // Redirect to the new rumor
      router.push(`/rumor/${data.data.rumorId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Content input */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          What&apos;s the rumor?
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share what you've heard on campus... Be specific but anonymous."
          className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl
                     text-white placeholder-gray-500 resize-none
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     transition-all text-lg"
          rows={6}
          maxLength={5000}
        />
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500">
            {content.length}/5000 characters
          </span>
          <span className="text-gray-500">
            Tip: Reference other rumors with #R&lt;id&gt;
          </span>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-xl">
          <div className="font-medium">{error}</div>
          {filterFeedback && filterFeedback.reasons.length > 0 && (
            <ul className="mt-2 text-sm list-disc list-inside">
              {filterFeedback.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-gray-800/50 rounded-xl p-4 text-sm text-gray-400">
        <h4 className="font-medium text-white mb-2">📋 Guidelines</h4>
        <ul className="space-y-1">
          <li>• Keep it relevant to campus life</li>
          <li>• No personal attacks or identifying individuals</li>
          <li>• Include specific details when possible</li>
          <li>• Your submission is 100% anonymous</li>
        </ul>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600
                   hover:from-purple-500 hover:to-pink-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-semibold text-lg rounded-xl
                   transition-all duration-200 transform hover:scale-[1.02]
                   shadow-lg shadow-purple-500/20"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </span>
        ) : (
          'Submit Anonymously'
        )}
      </button>

      <p className="text-center text-gray-500 text-sm">
        Your identity is never stored. Rumor will be reviewed by AI for quality.
      </p>
    </form>
  );
}
