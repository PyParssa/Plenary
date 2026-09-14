import { supabase } from './supabase';
import { GuestProfile, QuestionCard, ReflectionSession, UserRole } from '../types';

export async function loadUserData(userId: string): Promise<{
  profile: GuestProfile | null;
  vouchedCardIds: string[];
  reflections: Record<string, ReflectionSession>;
  cards: QuestionCard[];
}> {
  const [profileResult, vouchesResult, reflectionsResult, cardsResult] = await Promise.all([
    supabase.from('profiles').select('email, display_name, created_at, selected_atmospheres, role').eq('id', userId).maybeSingle(),
    supabase.from('card_vouches').select('card_id').eq('user_id', userId),
    supabase.from('reflection_sessions').select('card_id, session').eq('user_id', userId),
    supabase.from('cards').select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries'),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (vouchesResult.error) throw vouchesResult.error;
  if (reflectionsResult.error) throw reflectionsResult.error;
  if (cardsResult.error) throw cardsResult.error;

  const profile = profileResult.data
    ? {
        email: profileResult.data.email,
        displayName: profileResult.data.display_name ?? undefined,
        createdAt: new Date(profileResult.data.created_at).getTime(),
        selectedAtmospheres: profileResult.data.selected_atmospheres ?? [],
        role: (profileResult.data.role ?? 'user') as UserRole,
      }
    : null;

  return {
    profile,
    vouchedCardIds: (vouchesResult.data ?? []).map((row) => row.card_id),
    reflections: Object.fromEntries(
      (reflectionsResult.data ?? []).map((row) => [row.card_id, row.session as ReflectionSession]),
    ),
    cards: (cardsResult.data ?? []).map((card) => ({
      id: card.id,
      category: card.category,
      author: card.author,
      authorAvatar: card.author_avatar,
      authorBio: card.author_bio ?? undefined,
      book: card.book,
      question: card.question,
      backstory: card.backstory,
      relatedInquiries: (card.related_inquiries ?? []) as string[],
      vouched: false,
      vouchCount: 0,
    })),
  };
}

export async function savePreferences(userId: string, selectedAtmospheres: string[]): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ selected_atmospheres: selectedAtmospheres, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function saveProfile(userId: string, email: string, displayName?: string): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    display_name: displayName?.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveVouch(userId: string, cardId: string): Promise<void> {
  const { error } = await supabase.from('card_vouches').upsert({ user_id: userId, card_id: cardId });
  if (error) throw error;
}

export async function saveCard(userId: string, card: QuestionCard): Promise<void> {
  const { error } = await supabase.from('cards').insert({
    id: card.id,
    category: card.category,
    author: card.author,
    author_avatar: card.authorAvatar,
    author_bio: card.authorBio ?? null,
    book: card.book,
    question: card.question,
    backstory: card.backstory,
    related_inquiries: card.relatedInquiries,
    created_by: userId,
  });
  if (error) throw error;
}

export async function removeVouch(userId: string, cardId: string): Promise<void> {
  const { error } = await supabase.from('card_vouches').delete().eq('user_id', userId).eq('card_id', cardId);
  if (error) throw error;
}

export async function saveReflection(userId: string, session: ReflectionSession): Promise<void> {
  const { error } = await supabase.from('reflection_sessions').upsert({
    user_id: userId,
    card_id: session.cardId,
    session,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function applyVouches(cards: QuestionCard[], vouchedCardIds: string[]): QuestionCard[] {
  const vouched = new Set(vouchedCardIds);
  return cards.map((card) => ({
    ...card,
    vouched: vouched.has(card.id),
    vouchedAt: vouched.has(card.id) ? card.vouchedAt ?? Date.now() : undefined,
  }));
}
