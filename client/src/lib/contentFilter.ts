// Content moderation and profanity filter
const PROFANITY_WORDS = [
  'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'bastard', 'crap',
  'piss', 'whore', 'slut', 'stupid', 'idiot', 'moron', 'retard',
  'cocksucker', 'motherfucker', 'asshole', 'dickhead', 'pussy', 'tits', 'cunt',
  'fck', 'sht', 'btch', 'fk', 'sh!t', 'f*ck', 'b!tch', 'a$$', 'f***',
  'f-ck', 'sh-t', 'fvck', 'shyt', 'phuck', 'shiit', 'bytch', 'azz'
];

const HATE_SPEECH_WORDS = [
  'fag', 'nigger', 'chink', 'spic', 'wetback', 'gook', 'kike', 'towelhead'
];

// Create a simple profanity filter
class SimpleProfanityFilter {
  private words: string[];
  
  constructor() {
    this.words = [...PROFANITY_WORDS, ...HATE_SPEECH_WORDS];
  }
  
  isProfane(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.words.some(word => lowerText.includes(word));
  }
  
  clean(text: string): string {
    let cleanText = text;
    this.words.forEach(word => {
      // Escape special regex characters
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      cleanText = cleanText.replace(regex, '*'.repeat(word.length));
    });
    return cleanText;
  }
}

const filter = new SimpleProfanityFilter();

const MILD_PROFANITY_WORDS = [
  'damn', 'hell', 'crap', 'piss', 'sucks', 'stupid', 'dumb', 'idiot', 'moron'
];

const SEVERE_PROFANITY_WORDS = [
  'fuck', 'shit', 'bitch', 'ass', 'bastard', 'cocksucker', 'motherfucker',
  'asshole', 'dickhead', 'pussy', 'whore', 'slut', 'tits', 'cunt'
];

export interface ContentAnalysis {
  containsProfanity: boolean;
  containsHateSpeech: boolean;
  severityLevel: 'clean' | 'mild' | 'moderate' | 'severe' | 'blocked';
  flaggedWords: string[];
  cleanedText: string;
  confidence: number;
}

export function analyzeContent(text: string): ContentAnalysis {
  if (!text) {
    return {
      containsProfanity: false,
      containsHateSpeech: false,
      severityLevel: 'clean',
      flaggedWords: [],
      cleanedText: text,
      confidence: 1.0
    };
  }

  const lowercaseText = text.toLowerCase();
  const words = lowercaseText.split(/\s+/);
  const flaggedWords: string[] = [];
  
  let containsProfanity = false;
  let containsHateSpeech = false;
  let severityLevel: 'clean' | 'mild' | 'moderate' | 'severe' | 'blocked' = 'clean';

  // Use bad-words library for initial profanity detection
  const hasProfanity = filter.isProfane(text);
  if (hasProfanity) {
    containsProfanity = true;
  }

  // Check for hate speech first (most severe)
  for (const word of HATE_SPEECH_WORDS) {
    if (lowercaseText.includes(word)) {
      containsHateSpeech = true;
      containsProfanity = true;
      severityLevel = 'blocked';
      flaggedWords.push(word);
    }
  }

  // Check for severe profanity
  if (severityLevel !== 'blocked') {
    for (const word of SEVERE_PROFANITY_WORDS) {
      if (lowercaseText.includes(word)) {
        containsProfanity = true;
        severityLevel = 'severe';
        flaggedWords.push(word);
      }
    }
  }

  // Check for mild profanity
  if (severityLevel === 'clean') {
    for (const word of MILD_PROFANITY_WORDS) {
      if (lowercaseText.includes(word)) {
        containsProfanity = true;
        severityLevel = 'mild';
        flaggedWords.push(word);
      }
    }
  }

  // If bad-words detected profanity but we didn't categorize it, mark as moderate
  if (hasProfanity && severityLevel === 'clean') {
    severityLevel = 'moderate';
    containsProfanity = true;
  }

  const cleanedText = filter.clean(text);
  const confidence = calculateConfidence(text, flaggedWords);

  return {
    containsProfanity,
    containsHateSpeech,
    severityLevel,
    flaggedWords,
    cleanedText,
    confidence
  };
}

function cleanText(text: string, flaggedWords: string[]): string {
  let cleaned = text;
  
  for (const word of flaggedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '*'.repeat(word.length));
  }
  
  return cleaned;
}

function calculateConfidence(text: string, flaggedWords: string[]): number {
  const totalWords = text.split(/\s+/).length;
  const flaggedCount = flaggedWords.length;
  
  if (totalWords === 0) return 1.0;
  
  // Higher confidence when we flag fewer words relative to total
  const flaggedRatio = flaggedCount / totalWords;
  return Math.max(0.1, 1.0 - (flaggedRatio * 0.5));
}

export function shouldBlockContent(analysis: ContentAnalysis): boolean {
  return analysis.severityLevel === 'blocked' || analysis.containsHateSpeech;
}

export function shouldRequireReview(analysis: ContentAnalysis): boolean {
  return analysis.severityLevel === 'severe' || analysis.containsHateSpeech;
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'clean': return 'text-green-400';
    case 'mild': return 'text-yellow-400';
    case 'moderate': return 'text-orange-400';
    case 'severe': return 'text-red-400';
    case 'blocked': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

export function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'clean': return 'bg-green-500';
    case 'mild': return 'bg-yellow-500';
    case 'moderate': return 'bg-orange-500';
    case 'severe': return 'bg-red-500';
    case 'blocked': return 'bg-red-600';
    default: return 'bg-gray-500';
  }
}