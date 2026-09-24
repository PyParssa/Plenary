import { LifeStage } from '../types';

export interface DiscoveryAuthorCard {
  id: string;
  name: string;
  avatarUrl: string;
  tagline: string;
  signatureQuestion: string;
  description: string;
  filterKey: string;
  accentColor: string;
  darkAccentColor: string;
}

export interface DiscoveryCategoryCard {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
  filterKey: LifeStage;
  accentColor: string;
  darkAccentColor: string;
}

export const DISCOVERY_AUTHORS: DiscoveryAuthorCard[] = [
  {
    id: 'steve-jobs',
    name: 'Steve Jobs',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Steve Jobs ask you?',
    signatureQuestion: "If today were the last day of your life, would you want to do what you're about to do today?",
    description: 'Co-founder of Apple — on craft, ruthless focus, design & mortality without compromise.',
    filterKey: 'Steve Jobs',
    accentColor: '#f5f0eb',
    darkAccentColor: '#1a222a',
  },
  {
    id: 'naval-ravikant',
    name: 'Naval Ravikant',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Naval ask you?',
    signatureQuestion: 'Are you working on something that compounds, or just keeping busy?',
    description: 'Philosopher & investor — on leverage, specific knowledge, internal peace & clarity.',
    filterKey: 'Naval Ravikant',
    accentColor: '#eef4fb',
    darkAccentColor: '#162232',
  },
  {
    id: 'viktor-frankl',
    name: 'Viktor Frankl',
    avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Viktor Frankl ask you?',
    signatureQuestion: 'What would you attempt if you knew failure was not fatal?',
    description: 'Founder of Logotherapy — on meaning, suffering & the irreducible human will.',
    filterKey: 'Viktor Frankl',
    accentColor: '#f3f0f8',
    darkAccentColor: '#201b2c',
  },
  {
    id: 'marcus-aurelius',
    name: 'Marcus Aurelius',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Marcus Aurelius ask you?',
    signatureQuestion: 'How much time do you lose worrying about what your neighbor thinks?',
    description: 'Roman Emperor & Stoic — on duty, discipline, impermanence & inner sovereignty.',
    filterKey: 'Marcus Aurelius',
    accentColor: '#f0f5f0',
    darkAccentColor: '#18241c',
  },
  {
    id: 'paul-graham',
    name: 'Paul Graham',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Paul Graham ask you?',
    signatureQuestion: 'What problem are you working on that most people think is too small to matter?',
    description: 'YC co-founder & essayist — on startups, taste, intellectual honesty & relentlessly resourceful work.',
    filterKey: 'Paul Graham',
    accentColor: '#fdf8f0',
    darkAccentColor: '#252018',
  },
  {
    id: 'seneca',
    name: 'Seneca',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Seneca ask you?',
    signatureQuestion: 'Are you truly living, or are you merely being occupied by the demands of others?',
    description: 'Roman Stoic statesman — on time scarcity, tranquility, anger & the art of living with dignity.',
    filterKey: 'Seneca',
    accentColor: '#faf5ee',
    darkAccentColor: '#241f19',
  },
  {
    id: 'mary-oliver',
    name: 'Mary Oliver',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    tagline: 'What would Mary Oliver ask you?',
    signatureQuestion: 'Tell me, what is it you plan to do with your one wild and precious life?',
    description: 'Pulitzer-winning poet — on fierce attention, wildness, presence & the sacredness of reality.',
    filterKey: 'Mary Oliver',
    accentColor: '#f0f7f3',
    darkAccentColor: '#17241e',
  },
];

export const DISCOVERY_CATEGORIES: DiscoveryCategoryCard[] = [
  {
    id: 'cat-career',
    label: 'Career Change',
    emoji: '🧭',
    tagline: 'Questions for a career crossroads',
    description: 'When you sense the path no longer fits — or never did.',
    filterKey: 'Career Reinvention',
    accentColor: '#eef4fb',
    darkAccentColor: '#162332',
  },
  {
    id: 'cat-life-decision',
    label: 'Life Decision',
    emoji: '⚖️',
    tagline: 'For when the fork in the road is real',
    description: 'Major choices that cannot be undone — finding stillness before you leap.',
    filterKey: 'Existential Inquiry',
    accentColor: '#fdf8f0',
    darkAccentColor: '#252018',
  },
  {
    id: 'cat-relationships',
    label: 'Relationships',
    emoji: '🤝',
    tagline: 'Questions about love, autonomy & deep bonds',
    description: 'When a connection demands more sovereign honesty than comfort.',
    filterKey: 'Deep Relationships',
    accentColor: '#fdf0f3',
    darkAccentColor: '#271a22',
  },
  {
    id: 'cat-identity',
    label: 'Who Am I?',
    emoji: '🪞',
    tagline: 'Solitude, selfhood, and the unexamined life',
    description: 'Questions for when you need to meet your own quiet mind again.',
    filterKey: 'Solitude & Identity',
    accentColor: '#f3f0f8',
    darkAccentColor: '#201a2a',
  },
  {
    id: 'cat-creativity',
    label: 'Creative Life',
    emoji: '🎨',
    tagline: 'For makers, writers & builders at the edge',
    description: 'When the blank page or unmade product calls for courage.',
    filterKey: 'Creativity & Craft',
    accentColor: '#f0f5f0',
    darkAccentColor: '#17241d',
  },
  {
    id: 'cat-midlife',
    label: 'Midlife Reckoning',
    emoji: '🌅',
    tagline: 'Questions about the second half of life',
    description: 'When ambition meets accumulated reflection — and priorities recalibrate.',
    filterKey: 'Midlife Reckoning',
    accentColor: '#faf5ee',
    darkAccentColor: '#241f18',
  },
  {
    id: 'cat-mortality',
    label: 'Mortality & Meaning',
    emoji: '🕯️',
    tagline: 'Questions at the edge of finitude',
    description: 'Confronting the finite nature of time to illuminate the present moment.',
    filterKey: 'Mortality & Meaning',
    accentColor: '#f5f0eb',
    darkAccentColor: '#211d19',
  },
];
