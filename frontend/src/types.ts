export type LifeStage =
  | 'All Inquiries'
  | 'Career Reinvention'
  | 'Existential Inquiry'
  | 'Deep Relationships'
  | 'Solitude & Identity'
  | 'Creativity & Craft'
  | 'Midlife Reckoning'
  | 'Mortality & Meaning';

export type UserRole = 'user' | 'creator' | 'manager';

export interface QuestionCard {
  id: string;
  category: LifeStage;
  author: string;
  authorAvatar: string;
  authorBio?: string;
  book: string;
  question: string;
  backstory: string;
  relatedInquiries: string[];
  vouched: boolean;
  vouchedAt?: number;
  vouchCount: number;
  published?: boolean;
}

export interface AuthorProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  bio: string;
  booksPublished: string[];
  verified: boolean;
  curatedCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export interface ReflectionSession {
  cardId: string;
  turnsCompleted: number;
  maxTurns: number;
  messages: ChatMessage[];
  synthesizedSummary?: string;
  completed?: boolean;
}

export type ActiveTab = 'deck' | 'vault' | 'discovery' | 'account' | 'admin';

export interface GuestProfile {
  email: string;
  displayName?: string;
  createdAt: number;
  selectedAtmospheres: string[];
  role: UserRole;
}

export type LlmProvider = 'openai' | 'anthropic' | 'gemini';

export interface LlmSettings {
  provider: LlmProvider;
  apiKey: string;
  model: string;
}

export interface AdminCard extends QuestionCard {
  published: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  vouchCount: number;
  reflectionCount: number;
  cardsCreated: number;
}

export interface AnalyticsOverview {
  totalUsers: number;
  totalCards: number;
  publishedCards: number;
  unpublishedCards: number;
  totalVouches: number;
  vouchesToday: number;
  vouchesThisWeek: number;
  topCards: {
    id: string;
    question: string;
    author: string;
    category?: string;
    vouchCount: number;
    published?: boolean;
  }[];
  mostActiveReflectors: {
    id: string;
    email: string;
    reflectionCount: number;
  }[];
}

export interface BulkImportCard {
  category: string;
  author: string;
  author_avatar?: string;
  author_bio?: string;
  book: string;
  question: string;
  backstory: string;
  related_inquiries?: string[];
  published?: boolean;
}

export interface BulkImportResult {
  imported: number;
  failed: number;
  errors: { index: number; message: string }[];
}
