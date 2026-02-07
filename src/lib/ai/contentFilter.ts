/**
 * AI-Based Content Filtering
 * 
 * Pre-submission filtering (does NOT determine truth):
 * - Campus relevance check
 * - Logical contradiction detection
 * - AI-generated content detection
 * - Spam pattern matching
 * 
 * Uses mock implementation by default, can be swapped for real AI API
 */

export interface ContentFilterResult {
  approved: boolean;
  reasons: string[];
  confidence: number;
  categories: {
    isRelevant: boolean;
    hasContradictions: boolean;
    isSpam: boolean;
    isAIGenerated: boolean;
  };
}

// Campus-related keywords for relevance detection
const CAMPUS_KEYWORDS = [
  'campus', 'university', 'college', 'professor', 'student', 'class',
  'lecture', 'exam', 'library', 'dorm', 'cafeteria', 'faculty',
  'department', 'semester', 'graduation', 'tuition', 'scholarship',
  'club', 'sports', 'athletics', 'research', 'lab', 'assignment',
  'dean', 'president', 'administration', 'registrar', 'advisor',
  'freshman', 'sophomore', 'junior', 'senior', 'graduate', 'undergrad',
  'course', 'major', 'minor', 'credits', 'gpa', 'transcript',
  'housing', 'parking', 'dining', 'recreation', 'gym', 'fitness',
];

// Spam patterns
const SPAM_PATTERNS = [
  /buy\s+now/i,
  /click\s+here/i,
  /limited\s+time/i,
  /free\s+money/i,
  /act\s+now/i,
  /urgent/i,
  /winner/i,
  /congratulations/i,
  /\$\d{4,}/,  // Large dollar amounts
  /http[s]?:\/\/[^\s]+/,  // URLs (suspicious in rumors)
  /(.)\1{5,}/,  // Repeated characters
];

// Contradiction indicators (simplified)
const CONTRADICTION_PATTERNS = [
  /but\s+also\s+not/i,
  /is\s+and\s+isn't/i,
  /both\s+true\s+and\s+false/i,
  /never\s+always/i,
  /always\s+never/i,
];

// AI-generated content indicators (simplified heuristics)
const AI_INDICATORS = [
  /as an ai/i,
  /i cannot/i,
  /in conclusion/i,
  /it's worth noting/i,
  /importantly/i,
  /moreover/i,
  /furthermore/i,
  /in summary/i,
];

/**
 * Mock AI content filter
 * 
 * This is a rule-based approximation. Replace with actual AI API calls
 * when API key is available.
 */
export async function filterContent(content: string): Promise<ContentFilterResult> {
  const reasons: string[] = [];
  let confidence = 0.8; // Base confidence

  // Check campus relevance
  const lowercaseContent = content.toLowerCase();
  const hasKeywords = CAMPUS_KEYWORDS.some(keyword => 
    lowercaseContent.includes(keyword)
  );
  const isRelevant = hasKeywords || content.length > 50; // Longer content might be contextually relevant
  
  if (!isRelevant) {
    reasons.push('Content may not be related to campus');
    confidence *= 0.7;
  }

  // Check for spam patterns
  const hasSpam = SPAM_PATTERNS.some(pattern => pattern.test(content));
  if (hasSpam) {
    reasons.push('Content contains spam-like patterns');
    confidence *= 0.3;
  }

  // Check for contradictions
  const hasContradictions = CONTRADICTION_PATTERNS.some(pattern => 
    pattern.test(content)
  );
  if (hasContradictions) {
    reasons.push('Content contains logical contradictions');
    confidence *= 0.5;
  }

  // Check for AI-generated content indicators
  const aiIndicatorCount = AI_INDICATORS.filter(pattern => 
    pattern.test(content)
  ).length;
  const isAIGenerated = aiIndicatorCount >= 2;
  if (isAIGenerated) {
    reasons.push('Content appears to be AI-generated');
    confidence *= 0.6;
  }

  // Check content length
  if (content.length < 10) {
    reasons.push('Content is too short');
    confidence *= 0.3;
  }

  if (content.length > 5000) {
    reasons.push('Content is too long');
    confidence *= 0.5;
  }

  // Determine approval
  const approved = !hasSpam && reasons.length <= 1 && confidence > 0.4;

  return {
    approved,
    reasons,
    confidence,
    categories: {
      isRelevant,
      hasContradictions,
      isSpam: hasSpam,
      isAIGenerated,
    },
  };
}

/**
 * Real AI content filter using Gemini API
 * 
 * Uncomment and configure when API key is available
 */
export async function filterContentWithAI(
  content: string,
  apiKey?: string
): Promise<ContentFilterResult> {
  // If no API key, fall back to mock filter
  if (!apiKey) {
    return filterContent(content);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this campus rumor for content moderation. Respond ONLY with valid JSON.

Rumor: "${content}"

Evaluate:
1. Is this relevant to a campus/university context?
2. Does it contain logical contradictions?
3. Is it spam or promotional content?
4. Does it appear to be AI-generated content?

Respond with JSON only:
{
  "isRelevant": boolean,
  "hasContradictions": boolean,
  "isSpam": boolean,
  "isAIGenerated": boolean,
  "shouldApprove": boolean,
  "reasons": string[],
  "confidence": number (0-1)
}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          approved: result.shouldApprove ?? true,
          reasons: result.reasons ?? [],
          confidence: result.confidence ?? 0.8,
          categories: {
            isRelevant: result.isRelevant ?? true,
            hasContradictions: result.hasContradictions ?? false,
            isSpam: result.isSpam ?? false,
            isAIGenerated: result.isAIGenerated ?? false,
          },
        };
      }
    }

    // Fallback to mock if parsing fails
    return filterContent(content);
  } catch (error) {
    console.error('AI filter error:', error);
    return filterContent(content);
  }
}

/**
 * Quick check if content should be immediately rejected
 */
export function shouldRejectImmediately(content: string): {
  reject: boolean;
  reason?: string;
} {
  // Empty content
  if (!content || content.trim().length === 0) {
    return { reject: true, reason: 'Content cannot be empty' };
  }

  // Extremely short
  if (content.trim().length < 5) {
    return { reject: true, reason: 'Content is too short' };
  }

  // Contains obvious spam
  if (/buy\s+now|click\s+here|free\s+money/i.test(content)) {
    return { reject: true, reason: 'Content appears to be spam' };
  }

  return { reject: false };
}
