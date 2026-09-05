export type LifeStage =
  | 'All Inquiries'
  | 'Career Reinvention'
  | 'Existential Inquiry'
  | 'Deep Relationships'
  | 'Solitude & Identity'
  | 'Creativity & Craft'
  | 'Midlife Reckoning'
  | 'Mortality & Meaning';

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
}

export interface AuthorProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  bio: string;
  booksPublished: string[];
  totalVouches: number;
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

export type ActiveTab = 'deck' | 'vault' | 'authors';

export interface GuestProfile {
  email: string;
  displayName?: string;
  createdAt: number;
  selectedAtmospheres: string[];
}
