'use client';

import { useEffect, useState } from 'react';
import { RumorCard } from '@/components/RumorCard';
import Link from 'next/link';

interface Rumor {
  rumorId: string;
  content: string;
  truthScore: number;
  voteCount: number;
  status: 'open' | 'verified' | 'disputed' | 'deleted';
  createdAt: string;
}

type SortOption = 'recent' | 'trending' | 'controversial';
type FilterOption = 'all' | 'open' | 'verified' | 'disputed';

export default function Home() {
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    fetchRumors();
  }, [sortBy, filter]);

  const fetchRumors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy,
        status: filter,
        limit: '20',
      });
      
      const response = await fetch(`/api/rumors?${params}`);
      const data = await response.json();

      if (data.success) {
        setRumors(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to load rumors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center py-12 mb-8">
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            Campus Rumors
          </span>
        </h1>
        <p className="text-xl text-gray-400 mb-6">
          Anonymous truth discovery through credibility-weighted voting
        </p>
        <Link 
          href="/submit"
          className="inline-flex items-center gap-2 px-8 py-4 
                     bg-gradient-to-r from-purple-600 to-pink-600
                     hover:from-purple-500 hover:to-pink-500
                     rounded-xl font-semibold text-lg
                     transition-all duration-200 transform hover:scale-105
                     shadow-lg shadow-purple-500/25"
        >
          <span className="text-2xl">+</span>
          Share a Rumor
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {rumors.filter(r => r.status === 'verified').length}
          </div>
          <div className="text-sm text-gray-400">Verified</div>
        </div>
        <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {rumors.filter(r => r.status === 'open').length}
          </div>
          <div className="text-sm text-gray-400">Pending</div>
        </div>
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {rumors.filter(r => r.status === 'disputed').length}
          </div>
          <div className="text-sm text-gray-400">Disputed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Sort buttons */}
        <div className="flex gap-2">
          {(['recent', 'trending', 'controversial'] as SortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === option
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {(['all', 'open', 'verified', 'disputed'] as FilterOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === option
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
              }`}
            >
              {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading rumors...</p>
        </div>
      )}

      {/* Rumors feed */}
      {!loading && rumors.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🤫</div>
          <h2 className="text-xl font-semibold mb-2">No rumors yet</h2>
          <p className="text-gray-400 mb-6">Be the first to share what you&apos;ve heard!</p>
          <Link 
            href="/submit"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium"
          >
            Submit a Rumor
          </Link>
        </div>
      )}

      {!loading && rumors.length > 0 && (
        <div className="space-y-4">
          {rumors.map((rumor) => (
            <RumorCard
              key={rumor.rumorId}
              rumorId={rumor.rumorId}
              content={rumor.content}
              truthScore={rumor.truthScore}
              voteCount={rumor.voteCount}
              status={rumor.status}
              createdAt={rumor.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
