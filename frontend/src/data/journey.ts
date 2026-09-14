import { QuestionCard } from '../types';

export interface AtmosphereChoice {
  id: string;
  label: string;
  description: string;
  image: string;
  categoryWeights: Partial<Record<QuestionCard['category'], number>>;
}

export const ATMOSPHERE_CHOICES: AtmosphereChoice[] = [
  {
    id: 'shoreline',
    label: 'The shoreline',
    description: 'Open water, a slower horizon',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85',
    categoryWeights: { 'Mortality & Meaning': 4, 'Deep Relationships': 2, 'Solitude & Identity': 1 },
  },
  {
    id: 'jungle',
    label: 'The jungle',
    description: 'Wild growth, hidden paths',
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=85',
    categoryWeights: { 'Creativity & Craft': 4, 'Existential Inquiry': 3, 'Career Reinvention': 1 },
  },
  {
    id: 'sky',
    label: 'Above the clouds',
    description: 'Distance, possibility, a clean start',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
    categoryWeights: { 'Career Reinvention': 4, 'Midlife Reckoning': 2, 'Existential Inquiry': 2 },
  },
  {
    id: 'forest',
    label: 'The quiet forest',
    description: 'Stillness, roots, inward attention',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85',
    categoryWeights: { 'Solitude & Identity': 4, 'Deep Relationships': 2, 'Mortality & Meaning': 2 },
  },
];

export function rankQuestions(cards: QuestionCard[], selectedIds: string[]): QuestionCard[] {
  const scores = new Map<string, number>();

  selectedIds.forEach((selectedId, selectionIndex) => {
    const choice = ATMOSPHERE_CHOICES.find((item) => item.id === selectedId);
    if (!choice) return;

    Object.entries(choice.categoryWeights).forEach(([category, weight]) => {
      scores.set(category, (scores.get(category) ?? 0) + (weight ?? 0) * (selectedIds.length - selectionIndex));
    });
  });

  return cards
    .map((card, originalIndex) => ({
      card,
      score: scores.get(card.category) ?? 0,
      originalIndex,
    }))
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
    .map(({ card }) => card);
}