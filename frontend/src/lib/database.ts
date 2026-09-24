import { supabase } from './supabase';
import { GuestProfile, QuestionCard, ReflectionSession, UserRole } from '../types';

export async function fetchCards(): Promise<QuestionCard[]> {
  let { data, error } = await supabase
    .from('cards')
    .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, vouch_count, published')
    .eq('published', true);

  if (error) {
    // Fallback 1: try without vouch_count / other new columns but keep published=true filter if available
    let fallback = await supabase
      .from('cards')
      .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, published')
      .eq('published', true);

    if (fallback.error || !fallback.data) {
      // Fallback 2: minimal columns
      fallback = await supabase
        .from('cards')
        .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries');
    }

    if (!fallback.error && fallback.data) {
      data = fallback.data as any;
      error = null;
    }
  }

  if (error) throw error;
  return (data ?? [])
    .filter((card: any) => card.published !== false)
    .map((card: any) => ({
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
      vouchCount: Number(card.vouch_count ?? 0),
      published: card.published !== false,
    }));
}

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
    supabase.from('cards').select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, vouch_count, published').eq('published', true),
  ]);

  let profileData = profileResult.data;
  if (profileResult.error) {
    const fallbackProfile = await supabase
      .from('profiles')
      .select('email, display_name, created_at, selected_atmospheres')
      .eq('id', userId)
      .maybeSingle();
    if (!fallbackProfile.error) {
      profileData = fallbackProfile.data as any;
    }
  }

  if (vouchesResult.error) throw vouchesResult.error;
  if (reflectionsResult.error) throw reflectionsResult.error;

  let cardRows = cardsResult.data as any[];
  if (cardsResult.error) {
    let fallbackCards = await supabase
      .from('cards')
      .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, published')
      .eq('published', true);
    if (fallbackCards.error || !fallbackCards.data) {
      fallbackCards = await supabase
        .from('cards')
        .select('id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries');
    }
    if (!fallbackCards.error && fallbackCards.data) {
      cardRows = fallbackCards.data as any[];
    } else {
      throw cardsResult.error;
    }
  }

  const profile = profileData
    ? {
        email: profileData.email,
        displayName: profileData.display_name ?? undefined,
        createdAt: new Date(profileData.created_at).getTime(),
        selectedAtmospheres: profileData.selected_atmospheres ?? [],
        role: ((profileData as any).role ?? 'user') as UserRole,
      }
    : null;

  return {
    profile,
    vouchedCardIds: (vouchesResult.data ?? []).map((row) => row.card_id),
    reflections: Object.fromEntries(
      (reflectionsResult.data ?? []).map((row) => [row.card_id, row.session as ReflectionSession]),
    ),
    cards: (cardRows ?? [])
      .filter((card: any) => card.published !== false)
      .map((card: any) => ({
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
        vouchCount: Number(card.vouch_count ?? 0),
        published: card.published !== false,
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
