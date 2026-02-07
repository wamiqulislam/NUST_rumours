import { RumorSubmitForm } from '@/components/RumorSubmitForm';
import Link from 'next/link';

export default function SubmitPage() {
  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Feed
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Submit a Rumor
          </span>
        </h1>
        <p className="text-gray-400">
          Share what you&apos;ve heard. Let the community decide if it&apos;s true.
        </p>
      </div>

      {/* Form */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 
                      border border-gray-700/50 rounded-2xl p-8">
        <RumorSubmitForm />
      </div>

      {/* How it works */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/30 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="font-medium text-white mb-1">Anonymous</h3>
          <p className="text-sm text-gray-400">Your identity is never stored or tracked</p>
        </div>
        <div className="bg-gray-800/30 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🤖</div>
          <h3 className="font-medium text-white mb-1">AI Filtered</h3>
          <p className="text-sm text-gray-400">Content is checked for spam and relevance</p>
        </div>
        <div className="bg-gray-800/30 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">⚖️</div>
          <h3 className="font-medium text-white mb-1">Peer Verified</h3>
          <p className="text-sm text-gray-400">Community votes determine the truth</p>
        </div>
      </div>
    </div>
  );
}
